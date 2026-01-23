/**
 * =============================================================================
 * edu.xaostech.io - AI Exercise Generator
 * =============================================================================
 * Generates educational exercises using Cloudflare Workers AI
 * Models used:
 * - @cf/meta/llama-3.2-3b-instruct (fast, ~4.6k neurons/M input)
 * - @cf/meta/llama-3.1-8b-instruct-fast (quality, ~4.1k neurons/M input)
 * - @cf/qwen/qwq-32b (reasoning, ~60k neurons/M input)
 * =============================================================================
 */

import type {
    Env,
    Exercise,
    ExerciseType,
    GenerateExerciseRequest,
    GenerateExerciseResponse,
    Subject,
    SubjectCategory,
    DifficultyLevel,
    SUBJECT_CONFIGS,
    ProblemContent,
    ExerciseSolution,
    ValidationRules,
} from '../types/exercise';

// Re-export subject configs
export { SUBJECT_CONFIGS } from '../types/exercise';

/**
 * Generate a unique exercise ID
 */
function generateExerciseId(subject: Subject, category: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${subject.substring(0, 3)}-${category.substring(0, 3)}-${timestamp}-${random}`;
}

/**
 * Build the AI prompt for exercise generation
 */
function buildGenerationPrompt(
    request: GenerateExerciseRequest,
    subjectConfig: typeof SUBJECT_CONFIGS[Subject]
): { systemPrompt: string; userPrompt: string } {
    const exerciseTypes = request.types?.join(', ') || subjectConfig.supportedTypes.slice(0, 3).join(', ');

    const systemPrompt = `${subjectConfig.systemPrompt}

OUTPUT FORMAT: Return a valid JSON object with this exact structure:
{
  "instruction": "Clear instruction for the student",
  "content": { /* exercise-type specific content */ },
  "solution": {
    "correctAnswer": "the correct answer",
    "explanation": "detailed explanation",
    "steps": [{ "stepNumber": 1, "description": "step description" }]
  },
  "hints": ["hint 1", "hint 2"],
  "estimatedTime": 120,
  "tags": ["tag1", "tag2"]
}

For multiple-choice exercises, content should be:
{
  "type": "multiple-choice",
  "question": "the question",
  "options": [
    { "id": "a", "text": "option text" },
    { "id": "b", "text": "option text" }
  ],
  "multiSelect": false
}

For fill-blank exercises, content should be:
{
  "type": "fill-blank",
  "template": "Text with [BLANK] markers",
  "blankCount": 1,
  "wordBank": ["option1", "option2"]
}

For calculation exercises, content should be:
{
  "type": "calculation",
  "problem": "the problem statement",
  "variables": { "x": 5 },
  "units": "meters"
}

Return ONLY the JSON object, no additional text.`;

    let contextInfo = '';
    if (request.lessonContext) {
        contextInfo = `
LESSON CONTEXT:
- Title: ${request.lessonContext.title}
- Concepts covered: ${request.lessonContext.concepts.join(', ')}
${request.lessonContext.vocabulary ? `- Vocabulary: ${request.lessonContext.vocabulary.join(', ')}` : ''}
${request.lessonContext.formulas ? `- Formulas: ${request.lessonContext.formulas.join(', ')}` : ''}
`;
    }

    const userPrompt = `Generate a ${request.difficulty} level ${request.subject} exercise.

REQUIREMENTS:
- Topic: ${request.topic}
${request.category ? `- Category: ${request.category}` : ''}
- Exercise type: Choose from [${exerciseTypes}]
- Difficulty: ${request.difficulty}
${request.language ? `- Language: ${request.language}` : ''}
${request.targetLanguage ? `- Target language: ${request.targetLanguage}` : ''}
${contextInfo}
${request.options?.customInstructions ? `\nADDITIONAL INSTRUCTIONS: ${request.options.customInstructions}` : ''}

Generate a high-quality exercise that tests understanding of the topic.`;

    return { systemPrompt, userPrompt };
}

/**
 * Parse AI response into Exercise structure
 */
function parseAIResponse(
    response: string,
    request: GenerateExerciseRequest,
    subjectConfig: typeof SUBJECT_CONFIGS[Subject],
    model: string
): Exercise | null {
    try {
        // Clean up response - remove markdown code blocks if present
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.slice(7);
        }
        if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.slice(3);
        }
        if (cleanResponse.endsWith('```')) {
            cleanResponse = cleanResponse.slice(0, -3);
        }
        cleanResponse = cleanResponse.trim();

        const parsed = JSON.parse(cleanResponse);

        // Determine exercise type from content
        const exerciseType: ExerciseType = parsed.content?.type || 'short-answer';

        const exercise: Exercise = {
            id: generateExerciseId(request.subject, request.category || 'gen'),
            subject: request.subject,
            category: (request.category || subjectConfig.categories[0]) as SubjectCategory,
            difficulty: request.difficulty,
            type: exerciseType,
            topic: request.topic,
            problem: {
                instruction: parsed.instruction || 'Complete the exercise below.',
                content: parsed.content as ProblemContent,
                context: parsed.context,
                maxPoints: getDifficultyPoints(request.difficulty),
            },
            solution: {
                correctAnswer: parsed.solution?.correctAnswer || '',
                explanation: parsed.solution?.explanation || '',
                steps: parsed.solution?.steps,
                commonMistakes: parsed.solution?.commonMistakes,
            },
            hints: parsed.hints || [],
            validation: {
                ...subjectConfig.validationDefaults,
                passingScore: subjectConfig.validationDefaults.passingScore || 70,
                allowPartialCredit: subjectConfig.validationDefaults.allowPartialCredit ?? true,
                caseSensitive: subjectConfig.validationDefaults.caseSensitive ?? false,
                hintPenalty: subjectConfig.validationDefaults.hintPenalty || 5,
            } as ValidationRules,
            metadata: {
                createdAt: new Date().toISOString(),
                generatedBy: model,
                sourceLesson: request.lessonContext?.title,
                tags: parsed.tags || [request.topic, request.subject],
                estimatedTime: parsed.estimatedTime || getDefaultTime(request.difficulty),
                language: request.language || 'en',
                version: 1,
            },
        };

        return exercise;
    } catch (error) {
        console.error('[GENERATOR] Failed to parse AI response:', error);
        console.error('[GENERATOR] Raw response:', response.substring(0, 500));
        return null;
    }
}

/**
 * Get points based on difficulty
 */
function getDifficultyPoints(difficulty: DifficultyLevel): number {
    const points: Record<DifficultyLevel, number> = {
        beginner: 10,
        elementary: 15,
        intermediate: 20,
        advanced: 30,
        expert: 50,
    };
    return points[difficulty];
}

/**
 * Get default time estimate based on difficulty (in seconds)
 */
function getDefaultTime(difficulty: DifficultyLevel): number {
    const times: Record<DifficultyLevel, number> = {
        beginner: 60,
        elementary: 90,
        intermediate: 120,
        advanced: 180,
        expert: 300,
    };
    return times[difficulty];
}

/**
 * Select the appropriate model based on options and subject
 */
function selectModel(env: Env, request: GenerateExerciseRequest): string {
    // User-specified model preference
    if (request.options?.model === 'reasoning') {
        return env.REASONING_MODEL || '@cf/qwen/qwq-32b';
    }
    if (request.options?.model === 'quality') {
        return env.QUALITY_MODEL || '@cf/meta/llama-3.1-8b-instruct-fast';
    }

    // Subject-based selection
    if (request.subject === 'mathematics' || request.subject === 'physics') {
        // Use reasoning model for math/physics proofs
        if (request.types?.includes('proof') || request.types?.includes('derivation')) {
            return env.REASONING_MODEL || '@cf/qwen/qwq-32b';
        }
    }

    // Default to fast model
    return env.DEFAULT_MODEL || '@cf/meta/llama-3.2-3b-instruct';
}

/**
 * Generate a cache key for the request
 */
function getCacheKey(request: GenerateExerciseRequest): string {
    const key = `ex:${request.subject}:${request.category || 'any'}:${request.topic}:${request.difficulty}:${request.types?.join('-') || 'any'}`;
    return key.toLowerCase().replace(/[^a-z0-9:-]/g, '-');
}

/**
 * Main exercise generation function
 */
export async function generateExercise(
    env: Env,
    request: GenerateExerciseRequest
): Promise<GenerateExerciseResponse> {
    const { SUBJECT_CONFIGS } = await import('../types/exercise');
    const subjectConfig = SUBJECT_CONFIGS[request.subject];

    if (!subjectConfig) {
        throw new Error(`Unsupported subject: ${request.subject}`);
    }

    const count = Math.min(request.count || 1, parseInt(env.MAX_EXERCISES_PER_REQUEST) || 10);
    const exercises: Exercise[] = [];
    const model = selectModel(env, request);

    // Check cache for similar exercises
    const cacheKey = getCacheKey(request);
    const cached = await env.EXERCISES_KV.get(cacheKey);

    if (cached && count === 1) {
        const cachedExercise = JSON.parse(cached) as Exercise;
        return {
            exercises: [cachedExercise],
            meta: {
                model,
                generatedAt: new Date().toISOString(),
                cached: true,
            },
        };
    }

    // Generate exercises
    for (let i = 0; i < count; i++) {
        const { systemPrompt, userPrompt } = buildGenerationPrompt(request, subjectConfig);

        try {
            const aiResponse = await env.AI.run(model, {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: 2000,
                temperature: 0.7,
            });

            const responseText = aiResponse.response || '';
            const exercise = parseAIResponse(responseText, request, subjectConfig, model);

            if (exercise) {
                exercises.push(exercise);

                // Cache successful generation
                if (count === 1) {
                    await env.EXERCISES_KV.put(
                        cacheKey,
                        JSON.stringify(exercise),
                        { expirationTtl: parseInt(env.CACHE_TTL_SECONDS) || 86400 }
                    );
                }
            }
        } catch (error) {
            console.error(`[GENERATOR] Exercise ${i + 1} generation failed:`, error);
        }
    }

    if (exercises.length === 0) {
        throw new Error('Failed to generate any valid exercises');
    }

    return {
        exercises,
        meta: {
            model,
            generatedAt: new Date().toISOString(),
            cached: false,
        },
    };
}

/**
 * Validate a user's answer against the exercise solution
 */
export function validateAnswer(
    exercise: Exercise,
    userAnswer: unknown,
    hintsUsed: number = 0,
    timeTaken: number = 0
): {
    passed: boolean;
    score: number;
    feedback: string;
    pointsEarned: number;
} {
    const { solution, validation, problem } = exercise;
    let score = 0;
    let feedback = '';

    // Type-specific validation
    switch (exercise.type) {
        case 'multiple-choice': {
            const correctId = solution.correctAnswer as string;
            if (userAnswer === correctId) {
                score = 100;
                feedback = 'Correct!';
            } else {
                score = 0;
                feedback = `Incorrect. The correct answer was: ${correctId}`;
            }
            break;
        }

        case 'fill-blank': {
            const correctAnswers = solution.correctAnswer as string[];
            const userAnswers = userAnswer as string[];

            if (Array.isArray(correctAnswers) && Array.isArray(userAnswers)) {
                let correct = 0;
                for (let i = 0; i < correctAnswers.length; i++) {
                    const expected = validation.caseSensitive
                        ? correctAnswers[i]
                        : correctAnswers[i].toLowerCase();
                    const given = validation.caseSensitive
                        ? userAnswers[i] || ''
                        : (userAnswers[i] || '').toLowerCase();

                    if (expected === given || validation.alternatives?.includes(given)) {
                        correct++;
                    }
                }
                score = (correct / correctAnswers.length) * 100;
                feedback = `You got ${correct} out of ${correctAnswers.length} correct.`;
            }
            break;
        }

        case 'calculation': {
            const correctValue = solution.correctAnswer as number | { value: number; tolerance: number };
            const userValue = parseFloat(userAnswer as string);

            if (typeof correctValue === 'number') {
                const tolerance = validation.tolerance || 0.01;
                if (Math.abs(correctValue - userValue) <= tolerance * Math.abs(correctValue)) {
                    score = 100;
                    feedback = 'Correct!';
                } else {
                    score = 0;
                    feedback = `Incorrect. The correct answer was: ${correctValue}`;
                }
            } else if (typeof correctValue === 'object' && 'value' in correctValue) {
                if (Math.abs(correctValue.value - userValue) <= correctValue.tolerance) {
                    score = 100;
                    feedback = 'Correct!';
                } else {
                    score = 0;
                    feedback = `Incorrect. The correct answer was: ${correctValue.value}`;
                }
            }
            break;
        }

        case 'true-false': {
            const correctAnswers = solution.correctAnswer as boolean[];
            const userAnswers = userAnswer as boolean[];

            if (Array.isArray(correctAnswers) && Array.isArray(userAnswers)) {
                let correct = 0;
                for (let i = 0; i < correctAnswers.length; i++) {
                    if (correctAnswers[i] === userAnswers[i]) {
                        correct++;
                    }
                }
                score = (correct / correctAnswers.length) * 100;
                feedback = `You got ${correct} out of ${correctAnswers.length} correct.`;
            }
            break;
        }

        case 'matching': {
            const correctMatches = solution.correctAnswer as Record<string, string>;
            const userMatches = userAnswer as Record<string, string>;

            const totalPairs = Object.keys(correctMatches).length;
            let correct = 0;

            for (const [key, value] of Object.entries(correctMatches)) {
                if (userMatches[key] === value) {
                    correct++;
                }
            }
            score = (correct / totalPairs) * 100;
            feedback = `You matched ${correct} out of ${totalPairs} pairs correctly.`;
            break;
        }

        default: {
            // For text-based answers, do a simple comparison
            const correctText = String(solution.correctAnswer);
            const userText = String(userAnswer);

            const expected = validation.caseSensitive ? correctText : correctText.toLowerCase();
            const given = validation.caseSensitive ? userText : userText.toLowerCase();

            if (expected === given) {
                score = 100;
                feedback = 'Correct!';
            } else if (validation.alternatives?.some(alt =>
                (validation.caseSensitive ? alt : alt.toLowerCase()) === given
            )) {
                score = 100;
                feedback = 'Correct! (alternative answer accepted)';
            } else {
                score = 0;
                feedback = 'Incorrect. Review the solution for the correct answer.';
            }
        }
    }

    // Apply hint penalty
    const hintPenalty = hintsUsed * validation.hintPenalty;
    score = Math.max(0, score - hintPenalty);

    // Apply time penalty if applicable
    if (validation.timePenalty && problem.timeLimit && timeTaken > problem.timeLimit) {
        const overtime = timeTaken - problem.timeLimit;
        const timePenaltyAmount = overtime * validation.timePenalty;
        score = Math.max(0, score - timePenaltyAmount);
    }

    const passed = score >= validation.passingScore;
    const pointsEarned = Math.round((score / 100) * problem.maxPoints);

    return {
        passed,
        score: Math.round(score),
        feedback: passed
            ? `${feedback} You passed!`
            : `${feedback} You need ${validation.passingScore}% to pass.`,
        pointsEarned,
    };
}
