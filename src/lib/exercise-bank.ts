/**
 * Static exercise bank for fallback when AI is unavailable
 * Contains pre-built educational exercises for each subject
 */

import type {
    Exercise,
    Subject,
    SubjectCategory,
    DifficultyLevel,
    MultipleChoiceContent,
    FillBlankContent,
    CalculationContent,
} from '../types/exercise';
import { determineContentRating } from '../types/exercise';

interface FallbackExerciseTemplate {
    topic: string;
    difficulty: DifficultyLevel;
    type: 'multiple-choice' | 'fill-blank' | 'calculation';
    instruction: string;
    content: MultipleChoiceContent | FillBlankContent | CalculationContent;
    solution: {
        correctAnswer: string;
        explanation: string;
        steps?: Array<{ stepNumber: number; description: string }>;
    };
    hints: string[];
    tags: string[];
}

// Mathematics exercises
const mathExercises: FallbackExerciseTemplate[] = [
    {
        topic: 'algebra',
        difficulty: 'beginner',
        type: 'multiple-choice',
        instruction: 'Solve for x in the equation.',
        content: {
            type: 'multiple-choice',
            question: 'If 2x + 4 = 10, what is the value of x?',
            options: [
                { id: 'a', text: 'x = 2' },
                { id: 'b', text: 'x = 3' },
                { id: 'c', text: 'x = 4' },
                { id: 'd', text: 'x = 5' },
            ],
            multiSelect: false,
        },
        solution: {
            correctAnswer: 'b',
            explanation: 'To solve 2x + 4 = 10, subtract 4 from both sides to get 2x = 6, then divide by 2 to get x = 3.',
            steps: [
                { stepNumber: 1, description: 'Start with 2x + 4 = 10' },
                { stepNumber: 2, description: 'Subtract 4 from both sides: 2x = 6' },
                { stepNumber: 3, description: 'Divide both sides by 2: x = 3' },
            ],
        },
        hints: ['Try isolating the variable on one side', 'First remove the constant term'],
        tags: ['algebra', 'linear-equations', 'solving-for-x'],
    },
    {
        topic: 'algebra',
        difficulty: 'intermediate',
        type: 'calculation',
        instruction: 'Solve the quadratic equation.',
        content: {
            type: 'calculation',
            problem: 'Find the roots of x² - 5x + 6 = 0',
            units: 'none',
        },
        solution: {
            correctAnswer: 'x = 2 or x = 3',
            explanation: 'Factor the quadratic: (x - 2)(x - 3) = 0. Setting each factor to zero gives x = 2 or x = 3.',
            steps: [
                { stepNumber: 1, description: 'Identify the quadratic: x² - 5x + 6 = 0' },
                { stepNumber: 2, description: 'Find factors of 6 that add to -5: (-2) and (-3)' },
                { stepNumber: 3, description: 'Factor: (x - 2)(x - 3) = 0' },
                { stepNumber: 4, description: 'Solve: x = 2 or x = 3' },
            ],
        },
        hints: ['Try factoring the quadratic', 'Look for two numbers that multiply to 6 and add to -5'],
        tags: ['algebra', 'quadratic-equations', 'factoring'],
    },
    {
        topic: 'geometry',
        difficulty: 'beginner',
        type: 'multiple-choice',
        instruction: 'Calculate the area of the shape.',
        content: {
            type: 'multiple-choice',
            question: 'What is the area of a rectangle with length 8 cm and width 5 cm?',
            options: [
                { id: 'a', text: '13 cm²' },
                { id: 'b', text: '26 cm²' },
                { id: 'c', text: '40 cm²' },
                { id: 'd', text: '80 cm²' },
            ],
            multiSelect: false,
        },
        solution: {
            correctAnswer: 'c',
            explanation: 'Area of a rectangle = length × width = 8 × 5 = 40 cm²',
        },
        hints: ['Area formula for rectangle: length × width', 'Multiply the two dimensions'],
        tags: ['geometry', 'area', 'rectangles'],
    },
    {
        topic: 'fractions',
        difficulty: 'beginner',
        type: 'fill-blank',
        instruction: 'Complete the fraction operation.',
        content: {
            type: 'fill-blank',
            template: '1/2 + 1/4 = [BLANK]',
            blankCount: 1,
            wordBank: ['3/4', '2/6', '1/6', '3/8'],
        },
        solution: {
            correctAnswer: '3/4',
            explanation: 'To add fractions, find a common denominator. 1/2 = 2/4, so 2/4 + 1/4 = 3/4',
        },
        hints: ['Find a common denominator', 'Convert 1/2 to fourths'],
        tags: ['fractions', 'addition', 'common-denominator'],
    },
];

// Science exercises
const scienceExercises: FallbackExerciseTemplate[] = [
    {
        topic: 'biology',
        difficulty: 'beginner',
        type: 'multiple-choice',
        instruction: 'Answer the biology question.',
        content: {
            type: 'multiple-choice',
            question: 'What is the powerhouse of the cell?',
            options: [
                { id: 'a', text: 'Nucleus' },
                { id: 'b', text: 'Mitochondria' },
                { id: 'c', text: 'Ribosome' },
                { id: 'd', text: 'Cell membrane' },
            ],
            multiSelect: false,
        },
        solution: {
            correctAnswer: 'b',
            explanation: 'Mitochondria are often called the "powerhouse of the cell" because they produce ATP (adenosine triphosphate), the main energy currency of cells.',
        },
        hints: ['It produces energy for the cell', 'Think about cellular respiration'],
        tags: ['biology', 'cells', 'organelles'],
    },
    {
        topic: 'chemistry',
        difficulty: 'intermediate',
        type: 'multiple-choice',
        instruction: 'Identify the element.',
        content: {
            type: 'multiple-choice',
            question: 'Which element has the atomic number 6?',
            options: [
                { id: 'a', text: 'Hydrogen' },
                { id: 'b', text: 'Helium' },
                { id: 'c', text: 'Carbon' },
                { id: 'd', text: 'Nitrogen' },
            ],
            multiSelect: false,
        },
        solution: {
            correctAnswer: 'c',
            explanation: 'Carbon has 6 protons in its nucleus, giving it an atomic number of 6. It is essential for all known life forms.',
        },
        hints: ['Atomic number = number of protons', 'This element is the basis of organic chemistry'],
        tags: ['chemistry', 'periodic-table', 'elements'],
    },
    {
        topic: 'physics',
        difficulty: 'intermediate',
        type: 'calculation',
        instruction: 'Calculate the physical quantity.',
        content: {
            type: 'calculation',
            problem: 'A car travels 120 km in 2 hours. What is its average speed?',
            units: 'km/h',
        },
        solution: {
            correctAnswer: '60 km/h',
            explanation: 'Speed = Distance / Time = 120 km / 2 hours = 60 km/h',
            steps: [
                { stepNumber: 1, description: 'Identify: Distance = 120 km, Time = 2 hours' },
                { stepNumber: 2, description: 'Apply formula: Speed = Distance / Time' },
                { stepNumber: 3, description: 'Calculate: 120 / 2 = 60 km/h' },
            ],
        },
        hints: ['Use the formula: Speed = Distance / Time', 'Make sure units are consistent'],
        tags: ['physics', 'motion', 'speed'],
    },
];

// History exercises
const historyExercises: FallbackExerciseTemplate[] = [
    {
        topic: 'world-history',
        difficulty: 'beginner',
        type: 'multiple-choice',
        instruction: 'Answer the history question.',
        content: {
            type: 'multiple-choice',
            question: 'In what year did World War II end?',
            options: [
                { id: 'a', text: '1943' },
                { id: 'b', text: '1944' },
                { id: 'c', text: '1945' },
                { id: 'd', text: '1946' },
            ],
            multiSelect: false,
        },
        solution: {
            correctAnswer: 'c',
            explanation: 'World War II ended in 1945, with Germany surrendering in May (V-E Day) and Japan surrendering in August (V-J Day) after the atomic bombings.',
        },
        hints: ['The war ended in the mid-1940s', 'It was after D-Day (1944)'],
        tags: ['history', 'world-war-2', '20th-century'],
    },
    {
        topic: 'ancient-history',
        difficulty: 'intermediate',
        type: 'fill-blank',
        instruction: 'Complete the historical statement.',
        content: {
            type: 'fill-blank',
            template: 'The Great Pyramid of Giza was built as a tomb for Pharaoh [BLANK].',
            blankCount: 1,
            wordBank: ['Khufu', 'Tutankhamun', 'Ramesses', 'Cleopatra'],
        },
        solution: {
            correctAnswer: 'Khufu',
            explanation: 'The Great Pyramid of Giza was built around 2560 BCE as a tomb for Pharaoh Khufu (also known as Cheops).',
        },
        hints: ['This pharaoh ruled during the Fourth Dynasty', 'His Greek name is Cheops'],
        tags: ['history', 'ancient-egypt', 'pyramids'],
    },
];

// Language exercises
const languageExercises: FallbackExerciseTemplate[] = [
    {
        topic: 'grammar',
        difficulty: 'beginner',
        type: 'multiple-choice',
        instruction: 'Choose the grammatically correct sentence.',
        content: {
            type: 'multiple-choice',
            question: 'Which sentence uses the correct form of "their/there/they\'re"?',
            options: [
                { id: 'a', text: 'Their going to the park tomorrow.' },
                { id: 'b', text: 'They\'re going to the park tomorrow.' },
                { id: 'c', text: 'There going to the park tomorrow.' },
                { id: 'd', text: 'Thier going to the park tomorrow.' },
            ],
            multiSelect: false,
        },
        solution: {
            correctAnswer: 'b',
            explanation: '"They\'re" is a contraction of "they are." "Their" shows possession, and "there" indicates a place.',
        },
        hints: ['Try expanding the contraction', '"They\'re" = "they are"'],
        tags: ['grammar', 'homophones', 'contractions'],
    },
    {
        topic: 'vocabulary',
        difficulty: 'intermediate',
        type: 'fill-blank',
        instruction: 'Choose the word that best completes the sentence.',
        content: {
            type: 'fill-blank',
            template: 'The scientist made a [BLANK] discovery that changed our understanding of the universe.',
            blankCount: 1,
            wordBank: ['mundane', 'groundbreaking', 'trivial', 'ordinary'],
        },
        solution: {
            correctAnswer: 'groundbreaking',
            explanation: '"Groundbreaking" means innovative or pioneering, which fits the context of a discovery that changed our understanding.',
        },
        hints: ['The word should convey significance', 'Think about discoveries that change things'],
        tags: ['vocabulary', 'context-clues', 'adjectives'],
    },
];

// Computer Science exercises
const computerScienceExercises: FallbackExerciseTemplate[] = [
    {
        topic: 'programming',
        difficulty: 'beginner',
        type: 'multiple-choice',
        instruction: 'Answer the programming question.',
        content: {
            type: 'multiple-choice',
            question: 'What will be the output of: print(2 + 3 * 4)',
            options: [
                { id: 'a', text: '20' },
                { id: 'b', text: '14' },
                { id: 'c', text: '24' },
                { id: 'd', text: 'Error' },
            ],
            multiSelect: false,
        },
        solution: {
            correctAnswer: 'b',
            explanation: 'Following order of operations (PEMDAS), multiplication is done first: 3 * 4 = 12, then addition: 2 + 12 = 14',
        },
        hints: ['Remember order of operations', 'Multiplication comes before addition'],
        tags: ['programming', 'operators', 'order-of-operations'],
    },
    {
        topic: 'algorithms',
        difficulty: 'intermediate',
        type: 'multiple-choice',
        instruction: 'Analyze the algorithm complexity.',
        content: {
            type: 'multiple-choice',
            question: 'What is the time complexity of a binary search algorithm?',
            options: [
                { id: 'a', text: 'O(1)' },
                { id: 'b', text: 'O(n)' },
                { id: 'c', text: 'O(log n)' },
                { id: 'd', text: 'O(n²)' },
            ],
            multiSelect: false,
        },
        solution: {
            correctAnswer: 'c',
            explanation: 'Binary search has O(log n) time complexity because it halves the search space with each comparison.',
        },
        hints: ['Think about how the search space changes', 'The algorithm divides the problem in half each time'],
        tags: ['algorithms', 'complexity', 'searching'],
    },
];

// Subject to exercises mapping
const exercisesBySubject: Record<Subject, FallbackExerciseTemplate[]> = {
    mathematics: mathExercises,
    science: scienceExercises,
    history: historyExercises,
    language: languageExercises,
    'computer-science': computerScienceExercises,
    music: [], // TODO: Add music exercises
    art: [], // TODO: Add art exercises
    philosophy: [], // TODO: Add philosophy exercises
};

/**
 * Get a fallback exercise from the static bank
 */
export function getStaticFallbackExercise(
    subject: Subject,
    category: string | undefined,
    topic: string,
    difficulty: DifficultyLevel
): FallbackExerciseTemplate | null {
    const subjectExercises = exercisesBySubject[subject] || [];

    if (subjectExercises.length === 0) {
        return null;
    }

    // Try to find an exercise matching the criteria
    let candidates = subjectExercises;

    // Filter by topic if possible
    if (topic) {
        const topicMatches = candidates.filter(e =>
            e.topic.toLowerCase().includes(topic.toLowerCase()) ||
            e.tags.some(t => t.toLowerCase().includes(topic.toLowerCase()))
        );
        if (topicMatches.length > 0) {
            candidates = topicMatches;
        }
    }

    // Filter by difficulty if possible
    const difficultyMatches = candidates.filter(e => e.difficulty === difficulty);
    if (difficultyMatches.length > 0) {
        candidates = difficultyMatches;
    }

    // Return a random exercise from candidates
    if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Return any exercise from the subject
    return subjectExercises[Math.floor(Math.random() * subjectExercises.length)];
}

/**
 * Convert a template to a full Exercise object
 */
export function templateToExercise(
    template: FallbackExerciseTemplate,
    subject: Subject,
    category: SubjectCategory,
    requestedTopic: string
): Exercise {
    const id = `${subject.substring(0, 3)}-${category.substring(0, 3)}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

    return {
        id,
        subject,
        category,
        difficulty: template.difficulty,
        type: template.type,
        topic: template.topic || requestedTopic,
        problem: {
            instruction: template.instruction,
            content: template.content,
            maxPoints: template.difficulty === 'beginner' ? 10 : template.difficulty === 'intermediate' ? 20 : 30,
        },
        solution: template.solution,
        hints: template.hints,
        validation: {
            passingScore: 70,
            allowPartialCredit: true,
            caseSensitive: false,
            hintPenalty: 5,
        },
        metadata: {
            createdAt: new Date().toISOString(),
            generatedBy: 'static-bank',
            contentRating: determineContentRating(subject, category, template.topic),
            tags: template.tags,
            estimatedTime: template.difficulty === 'beginner' ? 60 : template.difficulty === 'intermediate' ? 120 : 180,
            language: 'en',
            version: 1,
        },
    };
}
