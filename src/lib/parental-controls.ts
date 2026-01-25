/**
 * Parental Controls Middleware for edu.xaostech.io
 * Enforces content filtering, time limits, and activity logging for child accounts
 */

import { Context, Next } from 'hono';

interface ChildControls {
    content_filter_level: 'strict' | 'moderate' | 'minimal';
    blocked_topics: string[];
    daily_time_limit: number | null;
    weekly_time_limit: number | null;
    allowed_hours: {
        weekday: { start: string; end: string };
        weekend: { start: string; end: string };
    };
    can_post_content: boolean;
    require_approval: boolean;
}

interface SessionUser {
    id: string;
    userId?: string;
    email?: string;
    username?: string;
    role: string;
    avatar_url?: string;
    isChild?: boolean;
    parentId?: string;
    controls?: ChildControls;
}

/**
 * Get user from session and check if child account with controls
 */
export async function getSessionWithControls(c: Context): Promise<SessionUser | null> {
    const cookie = c.req.header('Cookie') || '';
    const match = cookie.match(/session_id=([^;]+)/);

    if (!match) return null;

    const sessionsKv = c.env.SESSIONS_KV;
    if (!sessionsKv) return null;

    try {
        const sessionData = await sessionsKv.get(match[1]);
        if (!sessionData) return null;

        const session = JSON.parse(sessionData);
        if (session.expires && session.expires < Date.now()) return null;

        const user: SessionUser = {
            id: session.userId || session.id,
            userId: session.userId || session.id,
            email: session.email,
            username: session.username,
            role: session.role || 'user',
            avatar_url: session.avatar_url,
            isChild: false,
        };

        // Check if this is a child account
        const accountDb = c.env.ACCOUNT_DB;
        if (accountDb) {
            const childAccount = await accountDb.prepare(`
        SELECT ca.parent_id, pc.*
        FROM child_accounts ca
        JOIN parental_controls pc ON ca.child_id = pc.child_id
        WHERE ca.child_id = ?
      `).bind(user.id).first();

            if (childAccount) {
                user.isChild = true;
                user.parentId = childAccount.parent_id as string;
                user.controls = {
                    content_filter_level: (childAccount.content_filter_level as 'strict' | 'moderate' | 'minimal') || 'strict',
                    blocked_topics: JSON.parse((childAccount.blocked_topics as string) || '[]'),
                    daily_time_limit: childAccount.daily_time_limit as number | null,
                    weekly_time_limit: childAccount.weekly_time_limit as number | null,
                    allowed_hours: JSON.parse((childAccount.allowed_hours as string) || '{"weekday":{"start":"08:00","end":"20:00"},"weekend":{"start":"09:00","end":"21:00"}}'),
                    can_post_content: !!(childAccount.can_post_content),
                    require_approval: !!(childAccount.require_approval),
                };
            }
        }

        return user;
    } catch {
        // Silently fail session check
        return null;
    }
}

/**
 * Check if current time is within allowed hours for child
 */
export function isWithinAllowedHours(controls: ChildControls): boolean {
    const now = new Date();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    const hours = isWeekend ? controls.allowed_hours.weekend : controls.allowed_hours.weekday;

    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    return currentTime >= hours.start && currentTime <= hours.end;
}

/**
 * Check daily time limit for child
 */
export async function checkTimeLimit(c: Context, userId: string, controls: ChildControls): Promise<{ allowed: boolean; minutesRemaining: number }> {
    if (!controls.daily_time_limit) {
        return { allowed: true, minutesRemaining: -1 };
    }

    const accountDb = c.env.ACCOUNT_DB;
    if (!accountDb) {
        return { allowed: true, minutesRemaining: -1 };
    }

    const today = new Date().toISOString().split('T')[0];

    try {
        const tracking = await accountDb.prepare(`
      SELECT minutes_used FROM child_time_tracking
      WHERE child_id = ? AND date = ?
    `).bind(userId, today).first();

        const minutesUsed = (tracking?.minutes_used as number) || 0;
        const minutesRemaining = controls.daily_time_limit - minutesUsed;

        return {
            allowed: minutesRemaining > 0,
            minutesRemaining: Math.max(0, minutesRemaining),
        };
    } catch {
        return { allowed: true, minutesRemaining: -1 };
    }
}

/**
 * Log activity for child account
 */
export async function logChildActivity(
    c: Context,
    childId: string,
    activityType: string,
    activityData?: Record<string, any>,
    flagged: boolean = false
): Promise<void> {
    const accountDb = c.env.ACCOUNT_DB;
    if (!accountDb) return;

    try {
        await accountDb.prepare(`
      INSERT INTO child_activity (child_id, activity_type, activity_data, flagged, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(
            childId,
            activityType,
            activityData ? JSON.stringify(activityData) : null,
            flagged ? 1 : 0
        ).run();
    } catch {
        // Silently fail activity logging
    }
}

/**
 * Update time tracking for child
 */
export async function updateTimeTracking(c: Context, childId: string, minutesSpent: number): Promise<void> {
    const accountDb = c.env.ACCOUNT_DB;
    if (!accountDb) return;

    const today = new Date().toISOString().split('T')[0];

    try {
        await accountDb.prepare(`
      INSERT INTO child_time_tracking (child_id, date, minutes_used, sessions_count, last_session_end, updated_at)
      VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
      ON CONFLICT(child_id, date) DO UPDATE SET
        minutes_used = minutes_used + ?,
        sessions_count = sessions_count + 1,
        last_session_end = datetime('now'),
        updated_at = datetime('now')
    `).bind(childId, today, minutesSpent, minutesSpent).run();
    } catch {
        // Silently fail time tracking
    }
}

/**
 * Filter content based on child's filter level
 * Returns blocked topics that should be filtered
 */
export function getBlockedTopicsForLevel(level: 'strict' | 'moderate' | 'minimal'): string[] {
    const strictTopics = [
        'violence', 'weapons', 'drugs', 'alcohol', 'gambling',
        'adult', 'horror', 'death', 'war', 'crime',
    ];

    const moderateTopics = [
        'violence', 'weapons', 'drugs', 'adult', 'gambling',
    ];

    const minimalTopics = [
        'adult', 'drugs',
    ];

    switch (level) {
        case 'strict': return strictTopics;
        case 'moderate': return moderateTopics;
        case 'minimal': return minimalTopics;
        default: return strictTopics;
    }
}

/**
 * Check if content contains blocked topics
 */
export function contentContainsBlockedTopics(content: string, blockedTopics: string[]): string[] {
    const lowerContent = content.toLowerCase();
    return blockedTopics.filter(topic => lowerContent.includes(topic.toLowerCase()));
}

/**
 * Middleware to enforce parental controls on edu routes
 */
export function parentalControlsMiddleware() {
    return async (c: Context, next: Next) => {
        const user = await getSessionWithControls(c);

        // Store user in context for later use
        c.set('user', user);
        c.set('isChild', user?.isChild || false);
        c.set('controls', user?.controls || null);

        // If not a child account, proceed normally
        if (!user?.isChild || !user.controls) {
            return next();
        }

        // Check allowed hours
        if (!isWithinAllowedHours(user.controls)) {
            return c.json({
                error: 'Access restricted',
                message: 'Educational content is only available during allowed hours. Ask your parent for details.',
                code: 'OUTSIDE_ALLOWED_HOURS',
            }, 403);
        }

        // Check time limit
        const { allowed, minutesRemaining } = await checkTimeLimit(c, user.id, user.controls);
        if (!allowed) {
            return c.json({
                error: 'Time limit reached',
                message: 'You\'ve reached your daily learning limit. Great job today! Come back tomorrow.',
                code: 'TIME_LIMIT_REACHED',
            }, 403);
        }

        // Add remaining time to response headers
        if (minutesRemaining >= 0) {
            c.header('X-Minutes-Remaining', minutesRemaining.toString());
        }

        // Log activity
        const url = new globalThis.URL(c.req.url);
        await logChildActivity(c, user.id, 'page_view', {
            path: url.pathname,
            userAgent: c.req.header('User-Agent'),
        });

        return next();
    };
}

/**
 * Get age-appropriate difficulty based on birth year
 */
export function getAgeAppropriateDifficulty(birthYear: number | null): 'beginner' | 'intermediate' | 'advanced' {
    if (!birthYear) return 'beginner';

    const age = new Date().getFullYear() - birthYear;

    if (age < 8) return 'beginner';
    if (age < 12) return 'intermediate';
    return 'advanced';
}
