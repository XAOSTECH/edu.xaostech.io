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
 * Forward auth headers from the incoming request for API proxy calls
 */
function getProxyHeaders(c: Context): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const cookie = c.req.header('Cookie');
    if (cookie) headers['Cookie'] = cookie;
    const cfJwt = c.req.header('Cf-Access-Jwt-Assertion');
    if (cfJwt) headers['Cf-Access-Jwt-Assertion'] = cfJwt;
    return headers;
}

/**
 * Send parent notification via API proxy
 */
export async function sendParentNotification(
    c: Context,
    parentId: string,
    childId: string,
    type: 'login' | 'time_limit' | 'content_flag' | 'approval_request',
    title: string,
    message: string,
    data?: Record<string, unknown>
): Promise<void> {
    try {
        await fetch('https://api.xaostech.io/account/notifications', {
            method: 'POST',
            headers: getProxyHeaders(c),
            body: JSON.stringify({ parentId, childId, type, title, message, data }),
        });
    } catch {
        // Silently fail notification - don't break user flow
    }
}

/**
 * Get user from session via API proxy and check if child account with controls
 */
export async function getSessionWithControls(c: Context): Promise<SessionUser | null> {
    try {
        const cookie = c.req.header('Cookie') || '';
        if (!cookie.includes('session_id=')) return null;

        const headers: Record<string, string> = { Cookie: cookie };
        const cfJwt = c.req.header('Cf-Access-Jwt-Assertion');
        if (cfJwt) headers['Cf-Access-Jwt-Assertion'] = cfJwt;

        const resp = await fetch('https://api.xaostech.io/auth/me', { headers });
        if (!resp.ok) return null;

        const data = await resp.json() as {
            userId: string; role: string; username?: string;
            email?: string; avatar_url?: string;
            isChild?: boolean; parentId?: string; controls?: ChildControls;
        };

        const user: SessionUser = {
            id: data.userId,
            userId: data.userId,
            email: data.email,
            username: data.username,
            role: data.role || 'user',
            avatar_url: data.avatar_url,
            isChild: data.isChild || false,
            parentId: data.parentId,
            controls: data.controls,
        };

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
 * Check daily time limit for child via API proxy
 */
export async function checkTimeLimit(c: Context, userId: string, controls: ChildControls): Promise<{ allowed: boolean; minutesRemaining: number }> {
    if (!controls.daily_time_limit) {
        return { allowed: true, minutesRemaining: -1 };
    }

    try {
        const resp = await fetch(`https://api.xaostech.io/account/children/${encodeURIComponent(userId)}/time-limit`, {
            headers: getProxyHeaders(c),
        });
        if (!resp.ok) return { allowed: true, minutesRemaining: -1 };

        const data = await resp.json() as { minutesUsed: number };
        const minutesRemaining = controls.daily_time_limit - (data.minutesUsed || 0);

        return {
            allowed: minutesRemaining > 0,
            minutesRemaining: Math.max(0, minutesRemaining),
        };
    } catch {
        return { allowed: true, minutesRemaining: -1 };
    }
}

/**
 * Log activity for child account via API proxy
 */
export async function logChildActivity(
    c: Context,
    childId: string,
    activityType: string,
    activityData?: Record<string, any>,
    flagged: boolean = false
): Promise<void> {
    try {
        await fetch('https://api.xaostech.io/account/children/activity', {
            method: 'POST',
            headers: getProxyHeaders(c),
            body: JSON.stringify({ childId, activityType, activityData, flagged }),
        });
    } catch {
        // Silently fail activity logging
    }
}

/**
 * Update time tracking for child via API proxy
 */
export async function updateTimeTracking(c: Context, childId: string, minutesSpent: number): Promise<void> {
    try {
        await fetch(`https://api.xaostech.io/account/children/${encodeURIComponent(childId)}/time-tracking`, {
            method: 'POST',
            headers: getProxyHeaders(c),
            body: JSON.stringify({ minutesSpent }),
        });
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
            // Send notification to parent
            if (user.parentId) {
                await sendParentNotification(
                    c,
                    user.parentId,
                    user.id,
                    'time_limit',
                    'Daily time limit reached',
                    `Your child has used all ${user.controls.daily_time_limit} minutes of their daily learning time. Great job today!`,
                    { minutesUsed: user.controls.daily_time_limit, timeLimit: user.controls.daily_time_limit }
                );
            }

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
 * Notify parent when content is flagged
 */
export async function notifyContentFlagged(
    c: Context,
    user: SessionUser,
    contentTitle: string,
    flaggedTopics: string[]
): Promise<void> {
    if (!user.isChild || !user.parentId) return;

    await sendParentNotification(
        c,
        user.parentId,
        user.id,
        'content_flag',
        'Content flagged for review',
        `Your child attempted to access content that was flagged: ${contentTitle}. Blocked topics: ${flaggedTopics.join(', ')}`,
        { contentTitle, flaggedTopics }
    );

    // Also log as flagged activity
    await logChildActivity(c, user.id, 'content_flag', {
        contentTitle,
        flaggedTopics,
    }, true);
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
