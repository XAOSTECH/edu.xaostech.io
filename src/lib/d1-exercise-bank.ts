/**
 * D1-based Exercise Bank Service
 * Fetches exercises from D1 database for fallback when AI is unavailable
 */

import type {
    Exercise,
    Subject,
    SubjectCategory,
    DifficultyLevel,
} from '../types/exercise';
import { determineContentRating } from '../types/exercise';

interface D1Database {
    prepare(query: string): {
        bind(...values: unknown[]): {
            first<T>(): Promise<T | null>;
            all<T>(): Promise<{ results?: T[] }>;
        };
    };
}

interface ExerciseRow {
    id: string;
    subject: string;
    category: string;
    topic: string;
    difficulty: string;
    type: string;
    instruction: string;
    content_json: string;
    solution_json: string;
    hints_json: string;
    tags_json: string;
    content_rating: string;
    min_age: number;
}

/**
 * Get a random exercise from D1 matching criteria
 */
export async function getExerciseFromD1(
    db: D1Database,
    subject: Subject,
    category?: string,
    topic?: string,
    difficulty?: DifficultyLevel
): Promise<Exercise | null> {
    try {
        // Build query with optional filters
        let query = `
            SELECT * FROM exercises 
            WHERE subject = ? AND is_active = 1
        `;
        const bindings: unknown[] = [subject];

        if (category) {
            query += ` AND category = ?`;
            bindings.push(category);
        }

        if (topic) {
            query += ` AND topic = ?`;
            bindings.push(topic);
        }

        if (difficulty) {
            query += ` AND difficulty = ?`;
            bindings.push(difficulty);
        }

        // Get random exercise by ordering randomly and limiting to 1
        query += ` ORDER BY RANDOM() LIMIT 1`;

        let stmt = db.prepare(query);
        for (const binding of bindings) {
            stmt = stmt.bind(binding) as any;
        }

        const row = await stmt.first<ExerciseRow>();
        
        if (!row) {
            // Try broader search without topic/category
            if (topic || category) {
                return getExerciseFromD1(db, subject, undefined, undefined, difficulty);
            }
            return null;
        }

        return rowToExercise(row, subject, category, topic);
    } catch (err) {
        console.error('[D1-EXERCISE-BANK] Error fetching exercise:', err);
        return null;
    }
}

/**
 * Get multiple exercises from D1
 */
export async function getExercisesFromD1(
    db: D1Database,
    subject: Subject,
    count: number = 5,
    difficulty?: DifficultyLevel
): Promise<Exercise[]> {
    try {
        let query = `
            SELECT * FROM exercises 
            WHERE subject = ? AND is_active = 1
        `;
        const bindings: unknown[] = [subject];

        if (difficulty) {
            query += ` AND difficulty = ?`;
            bindings.push(difficulty);
        }

        query += ` ORDER BY RANDOM() LIMIT ?`;
        bindings.push(count);

        let stmt = db.prepare(query);
        for (const binding of bindings) {
            stmt = stmt.bind(binding) as any;
        }

        const result = await stmt.all<ExerciseRow>();
        const rows = result.results || [];

        return rows.map(row => rowToExercise(row, subject));
    } catch (err) {
        console.error('[D1-EXERCISE-BANK] Error fetching exercises:', err);
        return [];
    }
}

/**
 * Export all exercises to JSON format (for backup/versioning)
 */
export async function exportExercisesToJSON(
    db: D1Database,
    subject?: Subject
): Promise<{ exercises: Exercise[]; exportedAt: string; count: number }> {
    try {
        let query = `SELECT * FROM exercises WHERE is_active = 1`;
        const bindings: unknown[] = [];

        if (subject) {
            query += ` AND subject = ?`;
            bindings.push(subject);
        }

        query += ` ORDER BY subject, category, topic, difficulty`;

        let stmt = db.prepare(query);
        for (const binding of bindings) {
            stmt = stmt.bind(binding) as any;
        }

        const result = await stmt.all<ExerciseRow>();
        const rows = result.results || [];

        const exercises = rows.map(row => rowToExercise(row, row.subject as Subject));

        return {
            exercises,
            exportedAt: new Date().toISOString(),
            count: exercises.length,
        };
    } catch (err) {
        console.error('[D1-EXERCISE-BANK] Error exporting exercises:', err);
        return { exercises: [], exportedAt: new Date().toISOString(), count: 0 };
    }
}

/**
 * Convert D1 row to Exercise object
 */
function rowToExercise(
    row: ExerciseRow,
    subject: Subject,
    category?: string,
    topic?: string
): Exercise {
    const content = JSON.parse(row.content_json);
    const solution = JSON.parse(row.solution_json);
    const hints = row.hints_json ? JSON.parse(row.hints_json) : [];
    const tags = row.tags_json ? JSON.parse(row.tags_json) : [];

    return {
        id: row.id,
        subject,
        category: (row.category || category || 'general') as SubjectCategory,
        topic: row.topic || topic || 'general',
        difficulty: row.difficulty as DifficultyLevel,
        type: row.type as any,
        instruction: row.instruction,
        content,
        solution,
        hints,
        estimatedTime: 120,
        tags,
        contentRating: row.content_rating as any || 'E',
        minimumAge: row.min_age || 0,
        createdAt: new Date().toISOString(),
        generatedBy: 'database',
    };
}
