/**
 * =============================================================================
 * edu.xaostech.io - Exercise Generation Types
 * =============================================================================
 * Universal exercise format for all educational subjects with:
 * - Problem/Question presentation
 * - Hidden solution with reveal mechanism
 * - Pass/Fail validation structure
 * - Subject-specific configurations
 * =============================================================================
 */

// =============================================================================
// CLOUDFLARE WORKERS AI BINDING
// =============================================================================

export interface Ai {
    run(model: string, inputs: AiTextGenerationInput): Promise<AiTextGenerationOutput>;
}

export interface AiTextGenerationInput {
    prompt?: string;
    messages?: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stream?: boolean;
}

export interface AiTextGenerationOutput {
    response?: string;
    tool_calls?: Array<{
        name: string;
        arguments: Record<string, unknown>;
    }>;
}

// =============================================================================
// ENVIRONMENT BINDINGS
// =============================================================================

export interface Env {
    // Cloudflare Workers AI
    AI: Ai;

    // KV Namespaces
    EXERCISES_KV: KVNamespace;
    PROGRESS_KV: KVNamespace;
    SESSIONS_KV: KVNamespace;  // For parental controls session auth

    // D1 Databases
    EDU_DB: D1Database;
    ACCOUNT_DB: D1Database;  // For parental controls

    // Environment Variables
    ENVIRONMENT: string;
    DEFAULT_MODEL: string;
    QUALITY_MODEL: string;
    REASONING_MODEL: string;
    CACHE_TTL_SECONDS: string;
    MAX_EXERCISES_PER_REQUEST: string;
    RATE_LIMIT_PER_MINUTE: string;
    LINGUA_API_URL: string;
    SUPPORTED_SUBJECTS: string;
}

// =============================================================================
// SUPPORTED SUBJECTS
// =============================================================================

export type Subject =
    | 'language'
    | 'mathematics'
    | 'physics'
    | 'chemistry'
    | 'biology'
    | 'history'
    | 'geography'
    | 'computer-science';

export type SubjectCategory =
    // Language categories
    | 'vocabulary' | 'grammar' | 'reading' | 'writing' | 'listening' | 'conversation' | 'etymology'
    // Mathematics categories
    | 'arithmetic' | 'algebra' | 'geometry' | 'calculus' | 'statistics' | 'logic' | 'number-theory'
    // Science categories
    | 'mechanics' | 'thermodynamics' | 'electromagnetism' | 'quantum' | 'organic' | 'inorganic'
    | 'biochemistry' | 'genetics' | 'ecology' | 'anatomy'
    // Other categories
    | 'ancient' | 'modern' | 'regional' | 'algorithms' | 'data-structures' | 'systems';

export type DifficultyLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced' | 'expert';

// =============================================================================
// EXERCISE TYPES - Universal Format
// =============================================================================

export type ExerciseType =
    | 'multiple-choice'      // Select correct answer(s)
    | 'fill-blank'           // Fill in missing parts
    | 'matching'             // Match items from two columns
    | 'ordering'             // Arrange items in correct order
    | 'true-false'           // True/False statements
    | 'short-answer'         // Brief written response
    | 'long-answer'          // Extended written response
    | 'proof'                // Mathematical/logical proof
    | 'calculation'          // Numerical computation
    | 'translation'          // Language translation
    | 'conjugation'          // Verb conjugation
    | 'diagram'              // Label/complete diagrams
    | 'coding'               // Programming exercises
    | 'derivation';          // Step-by-step derivation

// =============================================================================
// CORE EXERCISE STRUCTURE
// =============================================================================

/**
 * Universal exercise format that works across all subjects
 */
export interface Exercise {
    /** Unique exercise identifier */
    id: string;

    /** Subject area */
    subject: Subject;

    /** Specific category within subject */
    category: SubjectCategory;

    /** Difficulty rating */
    difficulty: DifficultyLevel;

    /** Type of exercise */
    type: ExerciseType;

    /** Topic/theme of the exercise */
    topic: string;

    /** The problem/question presentation */
    problem: ExerciseProblem;

    /** Hidden solution (revealed on demand) */
    solution: ExerciseSolution;

    /** Hints available (progressively revealed) */
    hints: string[];

    /** Pass/fail validation rules */
    validation: ValidationRules;

    /** Metadata */
    metadata: ExerciseMetadata;

    /** Related exercises or next steps */
    related?: string[];
}

/**
 * The problem/question presentation
 */
export interface ExerciseProblem {
    /** Main instruction text */
    instruction: string;

    /** The actual problem content */
    content: ProblemContent;

    /** Optional context or background */
    context?: string;

    /** Time limit in seconds (optional) */
    timeLimit?: number;

    /** Maximum points achievable */
    maxPoints: number;
}

/**
 * Content varies by exercise type
 */
export type ProblemContent =
    | MultipleChoiceContent
    | FillBlankContent
    | MatchingContent
    | OrderingContent
    | TrueFalseContent
    | ShortAnswerContent
    | LongAnswerContent
    | ProofContent
    | CalculationContent
    | TranslationContent
    | ConjugationContent
    | CodingContent;

export interface MultipleChoiceContent {
    type: 'multiple-choice';
    question: string;
    options: Array<{
        id: string;
        text: string;
        /** For multi-select questions */
        isPartiallyCorrect?: boolean;
    }>;
    /** Allow multiple correct answers */
    multiSelect: boolean;
}

export interface FillBlankContent {
    type: 'fill-blank';
    /** Text with [BLANK] markers */
    template: string;
    /** Number of blanks to fill */
    blankCount: number;
    /** Word bank (optional) */
    wordBank?: string[];
}

export interface MatchingContent {
    type: 'matching';
    leftColumn: Array<{ id: string; text: string }>;
    rightColumn: Array<{ id: string; text: string }>;
}

export interface OrderingContent {
    type: 'ordering';
    /** Items to be ordered (presented shuffled) */
    items: Array<{ id: string; text: string }>;
    /** Description of ordering criteria */
    orderBy: string;
}

export interface TrueFalseContent {
    type: 'true-false';
    statements: Array<{
        id: string;
        text: string;
    }>;
}

export interface ShortAnswerContent {
    type: 'short-answer';
    question: string;
    maxLength: number;
}

export interface LongAnswerContent {
    type: 'long-answer';
    question: string;
    /** Rubric points to address */
    rubricPoints?: string[];
    minLength?: number;
    maxLength?: number;
}

export interface ProofContent {
    type: 'proof';
    /** Statement to prove */
    statement: string;
    /** Given information */
    given: string[];
    /** Proof method hint */
    proofMethod?: 'direct' | 'contradiction' | 'induction' | 'contrapositive';
}

export interface CalculationContent {
    type: 'calculation';
    problem: string;
    /** Variables and their values */
    variables?: Record<string, string | number>;
    /** Required units for answer */
    units?: string;
    /** Significant figures required */
    sigFigs?: number;
}

export interface TranslationContent {
    type: 'translation';
    sourceText: string;
    sourceLanguage: string;
    targetLanguage: string;
    /** Formal/informal register */
    register?: 'formal' | 'informal' | 'neutral';
}

export interface ConjugationContent {
    type: 'conjugation';
    verb: string;
    language: string;
    tense: string;
    mood?: string;
    /** Subjects to conjugate for */
    subjects: string[];
}

export interface CodingContent {
    type: 'coding';
    description: string;
    language: string;
    /** Starter code template */
    starterCode?: string;
    /** Test cases (inputs/outputs) */
    testCases: Array<{
        input: string;
        expectedOutput: string;
        hidden?: boolean;
    }>;
}

// =============================================================================
// SOLUTION STRUCTURE
// =============================================================================

/**
 * The solution (hidden until revealed)
 */
export interface ExerciseSolution {
    /** Correct answer(s) */
    correctAnswer: SolutionAnswer;

    /** Step-by-step explanation */
    explanation: string;

    /** Detailed steps (for proofs, calculations) */
    steps?: SolutionStep[];

    /** Common mistakes to avoid */
    commonMistakes?: string[];

    /** Additional learning resources */
    resources?: Array<{
        title: string;
        url: string;
        type: 'video' | 'article' | 'book' | 'practice';
    }>;
}

export type SolutionAnswer =
    | string                          // Simple text answer
    | string[]                        // Multiple answers (fill-blank, multi-select)
    | Record<string, string>          // Matching pairs (leftId -> rightId)
    | boolean[]                       // True/false answers
    | number                          // Numerical answer
    | { value: number; tolerance: number }; // Numerical with tolerance

export interface SolutionStep {
    stepNumber: number;
    description: string;
    formula?: string;
    result?: string;
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

/**
 * Pass/fail validation configuration
 */
export interface ValidationRules {
    /** Minimum score to pass (0-100) */
    passingScore: number;

    /** Partial credit allowed */
    allowPartialCredit: boolean;

    /** Case sensitivity for text answers */
    caseSensitive: boolean;

    /** Acceptable alternative answers */
    alternatives?: string[];

    /** For numerical: acceptable tolerance */
    tolerance?: number;

    /** Custom validation function name (for complex logic) */
    customValidator?: string;

    /** Points deducted per hint used */
    hintPenalty: number;

    /** Time penalty (points per second over limit) */
    timePenalty?: number;
}

// =============================================================================
// CONTENT RATING (Parental Controls)
// =============================================================================

/**
 * Age-appropriate content ratings for parental controls
 * Maps to content_filter_level in parental_controls table
 */
export type ContentRating = 'all-ages' | 'age-8-plus' | 'age-12-plus' | 'age-16-plus' | 'adult';

/**
 * Content flags for filtering
 */
export interface ContentFlags {
    /** Contains violence references (history, biology) */
    violence?: boolean;
    /** Contains death/war topics */
    death_war?: boolean;
    /** Contains mature themes */
    mature_themes?: boolean;
    /** Contains complex/scary concepts */
    scary_concepts?: boolean;
    /** Contains religious content */
    religious?: boolean;
    /** Contains political content */
    political?: boolean;
}

/**
 * Map content rating to filter level
 * strict = all-ages only
 * moderate = all-ages + age-8-plus
 * minimal = all-ages + age-8-plus + age-12-plus
 */
export function isContentAllowed(
    rating: ContentRating,
    filterLevel: 'strict' | 'moderate' | 'minimal'
): boolean {
    const allowedByLevel: Record<string, ContentRating[]> = {
        strict: ['all-ages'],
        moderate: ['all-ages', 'age-8-plus'],
        minimal: ['all-ages', 'age-8-plus', 'age-12-plus'],
    };
    return allowedByLevel[filterLevel]?.includes(rating) ?? false;
}

/**
 * Determine content rating from topic/category
 */
export function determineContentRating(
    subject: Subject,
    category: SubjectCategory,
    topic: string
): ContentRating {
    // Topics that are always safe
    const allAgesSafe = [
        'arithmetic', 'basic algebra', 'geometry basics', 'counting',
        'vocabulary', 'grammar', 'reading', 'spelling',
        'colors', 'shapes', 'animals', 'plants', 'weather',
        'geography basics', 'maps', 'continents',
    ];

    // Topics appropriate for 8+
    const age8Plus = [
        'fractions', 'decimals', 'percentages',
        'biology basics', 'ecosystems', 'food chains',
        'simple chemistry', 'states of matter',
        'ancient civilizations', 'medieval history',
        'programming basics', 'algorithms',
    ];

    // Topics for 12+
    const age12Plus = [
        'algebra', 'calculus basics', 'statistics',
        'human biology', 'genetics', 'evolution',
        'chemical reactions', 'periodic table',
        'physics', 'mechanics', 'electricity',
        'world wars', 'modern history', 'politics',
        'advanced programming', 'data structures',
    ];

    // Topics for 16+
    const age16Plus = [
        'advanced calculus', 'differential equations',
        'organic chemistry', 'biochemistry',
        'quantum physics', 'nuclear physics',
        'controversial history', 'genocide', 'terrorism',
        'philosophy', 'ethics',
    ];

    const lowerTopic = topic.toLowerCase();
    const lowerCategory = category.toLowerCase();

    // Check from most restrictive to least
    for (const t of age16Plus) {
        if (lowerTopic.includes(t) || lowerCategory.includes(t)) return 'age-16-plus';
    }
    for (const t of age12Plus) {
        if (lowerTopic.includes(t) || lowerCategory.includes(t)) return 'age-12-plus';
    }
    for (const t of age8Plus) {
        if (lowerTopic.includes(t) || lowerCategory.includes(t)) return 'age-8-plus';
    }

    // Default based on subject complexity
    switch (subject) {
        case 'language':
        case 'mathematics':
        case 'geography':
            return 'all-ages';
        case 'biology':
        case 'chemistry':
        case 'physics':
        case 'history':
            return 'age-8-plus';
        case 'computer-science':
            return 'age-8-plus';
        default:
            return 'all-ages';
    }
}

// =============================================================================
// METADATA
// =============================================================================

export interface ExerciseMetadata {
    /** When the exercise was generated */
    createdAt: string;

    /** AI model used for generation */
    generatedBy: string;

    /** Content rating for parental controls */
    contentRating: ContentRating;

    /** Content flags for filtering */
    contentFlags?: ContentFlags;

    /** Based on which lesson/section */
    sourceLesson?: string;
    sourceSection?: string;

    /** Tags for searchability */
    tags: string[];

    /** Estimated completion time (seconds) */
    estimatedTime: number;

    /** Language of the exercise (for non-language subjects) */
    language: string;

    /** Version for content updates */
    version: number;
}

// =============================================================================
// GENERATION REQUEST/RESPONSE
// =============================================================================

/**
 * Request to generate new exercise(s)
 */
export interface GenerateExerciseRequest {
    /** Target subject */
    subject: Subject;

    /** Specific category */
    category?: SubjectCategory;

    /** Topic to focus on */
    topic: string;

    /** Difficulty level */
    difficulty: DifficultyLevel;

    /** Preferred exercise type(s) */
    types?: ExerciseType[];

    /** Number of exercises to generate */
    count?: number;

    /** Reference to previous lesson content */
    lessonContext?: LessonContext;

    /** Language for the exercise */
    language?: string;

    /** For language exercises: target language */
    targetLanguage?: string;

    /** Additional generation parameters */
    options?: GenerationOptions;
}

export interface LessonContext {
    /** Lesson title */
    title: string;

    /** Key concepts covered */
    concepts: string[];

    /** Vocabulary/terms introduced */
    vocabulary?: string[];

    /** Formulas/rules taught */
    formulas?: string[];

    /** Previous exercise IDs for progression */
    previousExercises?: string[];
}

export interface GenerationOptions {
    /** Include hints */
    includeHints?: boolean;

    /** Hint count */
    hintCount?: number;

    /** Model to use (default, quality, reasoning) */
    model?: 'default' | 'quality' | 'reasoning';

    /** Include common mistakes in solution */
    includeCommonMistakes?: boolean;

    /** Generate related exercises */
    generateRelated?: boolean;

    /** Custom system prompt additions */
    customInstructions?: string;
}

/**
 * Response from exercise generation
 */
export interface GenerateExerciseResponse {
    /** Generated exercises */
    exercises: Exercise[];

    /** Generation metadata */
    meta: {
        model: string;
        generatedAt: string;
        tokensUsed?: number;
        neuronsUsed?: number;
        cached: boolean;
    };
}

// =============================================================================
// USER PROGRESS & SUBMISSION
// =============================================================================

/**
 * User's answer submission
 */
export interface SubmissionRequest {
    /** Exercise ID */
    exerciseId: string;

    /** User's answer */
    answer: SolutionAnswer;

    /** Time taken in seconds */
    timeTaken: number;

    /** Hints used */
    hintsUsed: number;

    /** User ID (optional for anonymous) */
    userId?: string;
}

/**
 * Submission validation result
 */
export interface SubmissionResult {
    /** Pass or fail */
    passed: boolean;

    /** Score achieved (0-100) */
    score: number;

    /** Points earned */
    pointsEarned: number;

    /** Maximum points possible */
    maxPoints: number;

    /** Detailed feedback */
    feedback: string;

    /** Show solution? */
    showSolution: boolean;

    /** Suggested next exercises */
    nextExercises?: string[];
}

// =============================================================================
// SUBJECT-SPECIFIC CONFIGURATION
// =============================================================================

/**
 * Configuration rules for each subject
 */
export interface SubjectConfig {
    subject: Subject;
    name: string;
    description: string;
    categories: SubjectCategory[];
    defaultDifficulty: DifficultyLevel;
    supportedTypes: ExerciseType[];

    /** System prompt template for AI generation */
    systemPrompt: string;

    /** Example exercises for few-shot learning */
    examples?: Exercise[];

    /** Subject-specific validation rules */
    validationDefaults: Partial<ValidationRules>;
}

// =============================================================================
// PREDEFINED SUBJECT CONFIGURATIONS
// =============================================================================

export const SUBJECT_CONFIGS: Record<Subject, SubjectConfig> = {
    language: {
        subject: 'language',
        name: 'Language Learning',
        description: 'Vocabulary, grammar, reading, writing, and conversation exercises',
        categories: ['vocabulary', 'grammar', 'reading', 'writing', 'listening', 'conversation', 'etymology'],
        defaultDifficulty: 'intermediate',
        supportedTypes: ['multiple-choice', 'fill-blank', 'matching', 'ordering', 'translation', 'conjugation', 'short-answer'],
        systemPrompt: `You are an expert language teacher creating educational exercises. 
Generate exercises that:
- Focus on practical, commonly-used vocabulary and grammar
- Include context sentences showing real-world usage
- Provide clear explanations in the solution
- Consider language register (formal/informal)
- Include etymology hints for vocabulary when relevant`,
        validationDefaults: {
            passingScore: 70,
            allowPartialCredit: true,
            caseSensitive: false,
            hintPenalty: 5,
        },
    },

    mathematics: {
        subject: 'mathematics',
        name: 'Mathematics',
        description: 'Arithmetic, algebra, geometry, calculus, and logic exercises',
        categories: ['arithmetic', 'algebra', 'geometry', 'calculus', 'statistics', 'logic', 'number-theory'],
        defaultDifficulty: 'intermediate',
        supportedTypes: ['multiple-choice', 'calculation', 'proof', 'short-answer', 'fill-blank', 'ordering'],
        systemPrompt: `You are an expert mathematics teacher creating educational exercises.
Generate exercises that:
- Have clear, unambiguous problem statements
- Include step-by-step solutions
- Use standard mathematical notation
- Progress logically from given information to conclusion
- Highlight key formulas and theorems used`,
        validationDefaults: {
            passingScore: 80,
            allowPartialCredit: true,
            caseSensitive: false,
            tolerance: 0.01,
            hintPenalty: 10,
        },
    },

    physics: {
        subject: 'physics',
        name: 'Physics',
        description: 'Mechanics, thermodynamics, electromagnetism, and quantum physics',
        categories: ['mechanics', 'thermodynamics', 'electromagnetism', 'quantum'],
        defaultDifficulty: 'intermediate',
        supportedTypes: ['multiple-choice', 'calculation', 'short-answer', 'diagram', 'derivation'],
        systemPrompt: `You are an expert physics teacher creating educational exercises.
Generate exercises that:
- Include realistic physical scenarios
- Require proper unit analysis
- Show derivations from first principles
- Include diagrams descriptions when helpful
- Connect theory to practical applications`,
        validationDefaults: {
            passingScore: 75,
            allowPartialCredit: true,
            caseSensitive: false,
            tolerance: 0.05,
            hintPenalty: 10,
        },
    },

    chemistry: {
        subject: 'chemistry',
        name: 'Chemistry',
        description: 'Organic, inorganic, and biochemistry exercises',
        categories: ['organic', 'inorganic', 'biochemistry'],
        defaultDifficulty: 'intermediate',
        supportedTypes: ['multiple-choice', 'calculation', 'short-answer', 'matching', 'diagram'],
        systemPrompt: `You are an expert chemistry teacher creating educational exercises.
Generate exercises that:
- Use proper chemical nomenclature
- Balance equations correctly
- Include molar calculations where appropriate
- Describe reaction mechanisms
- Connect molecular structure to properties`,
        validationDefaults: {
            passingScore: 75,
            allowPartialCredit: true,
            caseSensitive: true,
            hintPenalty: 10,
        },
    },

    biology: {
        subject: 'biology',
        name: 'Biology',
        description: 'Genetics, ecology, anatomy, and biochemistry',
        categories: ['genetics', 'ecology', 'anatomy', 'biochemistry'],
        defaultDifficulty: 'intermediate',
        supportedTypes: ['multiple-choice', 'matching', 'short-answer', 'diagram', 'ordering', 'true-false'],
        systemPrompt: `You are an expert biology teacher creating educational exercises.
Generate exercises that:
- Use correct scientific terminology
- Connect structure to function
- Include evolutionary context where relevant
- Describe processes step-by-step
- Use real-world examples`,
        validationDefaults: {
            passingScore: 70,
            allowPartialCredit: true,
            caseSensitive: false,
            hintPenalty: 5,
        },
    },

    history: {
        subject: 'history',
        name: 'History',
        description: 'Ancient, modern, and regional history',
        categories: ['ancient', 'modern', 'regional'],
        defaultDifficulty: 'intermediate',
        supportedTypes: ['multiple-choice', 'ordering', 'matching', 'short-answer', 'long-answer', 'true-false'],
        systemPrompt: `You are an expert history teacher creating educational exercises.
Generate exercises that:
- Present multiple perspectives on events
- Include primary source references
- Connect cause and effect
- Place events in broader context
- Encourage critical analysis of sources`,
        validationDefaults: {
            passingScore: 70,
            allowPartialCredit: true,
            caseSensitive: false,
            hintPenalty: 5,
        },
    },

    geography: {
        subject: 'geography',
        name: 'Geography',
        description: 'Physical and human geography',
        categories: ['regional'],
        defaultDifficulty: 'intermediate',
        supportedTypes: ['multiple-choice', 'matching', 'diagram', 'short-answer', 'true-false'],
        systemPrompt: `You are an expert geography teacher creating educational exercises.
Generate exercises that:
- Include map reading skills
- Connect physical and human geography
- Use current data and statistics
- Consider environmental factors
- Include regional comparisons`,
        validationDefaults: {
            passingScore: 70,
            allowPartialCredit: true,
            caseSensitive: false,
            hintPenalty: 5,
        },
    },

    'computer-science': {
        subject: 'computer-science',
        name: 'Computer Science',
        description: 'Algorithms, data structures, and systems',
        categories: ['algorithms', 'data-structures', 'systems'],
        defaultDifficulty: 'intermediate',
        supportedTypes: ['multiple-choice', 'coding', 'short-answer', 'ordering', 'true-false', 'calculation'],
        systemPrompt: `You are an expert computer science teacher creating educational exercises.
Generate exercises that:
- Include clear input/output specifications
- Consider time and space complexity
- Provide test cases for code
- Explain algorithms step-by-step
- Use standard pseudocode or common languages`,
        validationDefaults: {
            passingScore: 80,
            allowPartialCredit: true,
            caseSensitive: true,
            hintPenalty: 10,
        },
    },
};
