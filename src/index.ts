/**
 * =============================================================================
 * edu.xaostech.io - Main Worker Entry Point
 * =============================================================================
 * AI-powered educational platform for generating exercises across subjects
 * Uses Cloudflare Workers AI (free tier: 10,000 neurons/day)
 * =============================================================================
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';
import { secureHeaders } from 'hono/secure-headers';

import type {
  Env,
  GenerateExerciseRequest,
  SubmissionRequest,
  Subject,
  DifficultyLevel,
} from './types/exercise';
import { SUBJECT_CONFIGS } from './types/exercise';
import { generateExercise, validateAnswer } from './lib/generator';
import {
  parentalControlsMiddleware,
  getSessionWithControls,
  logChildActivity,
  updateTimeTracking,
  contentContainsBlockedTopics,
  getBlockedTopicsForLevel,
  checkTimeLimit,
} from './lib/parental-controls';
import {
  getChildLandingPage,
  getTimeLimitPage,
  getOutsideHoursPage,
} from './lib/child-ui';

const app = new Hono<{ Bindings: Env }>();

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use('*', logger());
app.use('*', timing());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: [
    'https://edu.xaostech.io',
    'https://xaostech.io',
    'http://localhost:3000',
    'http://localhost:8787',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposeHeaders: ['X-Request-ID', 'X-Response-Time', 'X-Minutes-Remaining'],
  maxAge: 86400,
}));

// Parental controls middleware (checks time limits, allowed hours for child accounts)
app.use('*', parentalControlsMiddleware());

// Rate limiting (simple in-memory for demo, use Durable Objects in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

app.use('/generate/*', async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const limit = parseInt(c.env.RATE_LIMIT_PER_MINUTE) || 30;

  const entry = rateLimitMap.get(ip);
  if (entry && entry.resetAt > now) {
    if (entry.count >= limit) {
      return c.json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      }, 429);
    }
    entry.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
  }

  await next();
});

// =============================================================================
// LANDING PAGE
// =============================================================================

app.get('/', async (c) => {
  // Check if user is a child account
  const user = await getSessionWithControls(c);

  if (user?.isChild && user.controls) {
    // Get time remaining for child
    const { minutesRemaining } = await checkTimeLimit(c, user.id, user.controls);

    const subjectsJson = JSON.stringify(Object.values(SUBJECT_CONFIGS).map(s => ({
      subject: s.subject,
      name: s.name,
      description: s.description,
      categories: s.categories,
    })));

    return c.html(getChildLandingPage({
      username: user.username || 'Learner',
      minutesRemaining,
      dailyLimit: user.controls.daily_time_limit,
      filterLevel: user.controls.content_filter_level,
    }, subjectsJson));
  }

  // Standard landing page for adults
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XAOSTECH EDU - AI-Powered Educational Platform</title>
  <link rel="icon" type="image/png" href="https://api.xaostech.io/data/assets/XAOSTECH_LOGO.png">
  <style>
    :root {
      --primary: #f6821f;
      --secondary: #3b82f6;
      --bg: #0a0a0a;
      --card: #1a1a1a;
      --text: #e0e0e0;
      --muted: #888;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .hero {
      text-align: center;
      padding: 4rem 2rem;
      background: linear-gradient(135deg, rgba(246,130,31,0.1) 0%, rgba(59,130,246,0.1) 100%);
      border-radius: 16px;
      margin-bottom: 3rem;
    }
    .hero h1 {
      font-size: 3rem;
      color: var(--primary);
      margin-bottom: 1rem;
    }
    .hero p { font-size: 1.25rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }
    .subjects {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }
    .subject-card {
      background: var(--card);
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #333;
      transition: transform 0.2s, border-color 0.2s;
      cursor: pointer;
    }
    .subject-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
    }
    .subject-card h3 { color: var(--primary); margin-bottom: 0.5rem; }
    .subject-card p { color: var(--muted); font-size: 0.9rem; }
    .demo {
      background: var(--card);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 3rem;
    }
    .demo h2 { margin-bottom: 1.5rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; color: var(--muted); }
    .form-group select, .form-group input {
      width: 100%;
      padding: 0.75rem;
      background: var(--bg);
      border: 1px solid #333;
      border-radius: 8px;
      color: var(--text);
      font-size: 1rem;
    }
    .btn {
      background: var(--primary);
      color: #000;
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      font-size: 1rem;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .exercise-output {
      background: var(--bg);
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 1.5rem;
      display: none;
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 0.9rem;
      max-height: 500px;
      overflow-y: auto;
    }
    .api-docs {
      background: var(--card);
      border-radius: 12px;
      padding: 2rem;
    }
    .api-docs h2 { margin-bottom: 1rem; }
    .endpoint {
      background: var(--bg);
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-family: monospace;
    }
    .endpoint .method { color: #4ade80; font-weight: bold; }
    .endpoint .path { color: var(--secondary); }
    footer {
      text-align: center;
      padding: 2rem;
      color: var(--muted);
      font-size: 0.9rem;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }
    .feature {
      text-align: center;
      padding: 1rem;
    }
    .feature-icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .feature h4 { color: var(--primary); }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>🎓 XAOSTECH EDU</h1>
      <p>AI-powered educational platform generating adaptive exercises for languages, mathematics, sciences, and more.</p>
      <div class="features">
        <div class="feature">
          <div class="feature-icon">🤖</div>
          <h4>AI-Generated</h4>
          <p>Powered by Cloudflare Workers AI</p>
        </div>
        <div class="feature">
          <div class="feature-icon">📚</div>
          <h4>8 Subjects</h4>
          <p>Language, Math, Sciences, CS</p>
        </div>
        <div class="feature">
          <div class="feature-icon">⚡</div>
          <h4>Instant</h4>
          <p>Generate exercises in seconds</p>
        </div>
        <div class="feature">
          <div class="feature-icon">🎯</div>
          <h4>Adaptive</h4>
          <p>5 difficulty levels</p>
        </div>
      </div>
    </div>

    <h2 style="margin-bottom: 1.5rem;">📖 Available Subjects</h2>
    <div class="subjects" id="subjects"></div>

    <div class="demo">
      <h2>🧪 Try Exercise Generation</h2>
      <form id="generateForm">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div class="form-group">
            <label for="subject">Subject</label>
            <select id="subject" required>
              <option value="language">Language Learning</option>
              <option value="mathematics">Mathematics</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="biology">Biology</option>
              <option value="history">History</option>
              <option value="geography">Geography</option>
              <option value="computer-science">Computer Science</option>
            </select>
          </div>
          <div class="form-group">
            <label for="difficulty">Difficulty</label>
            <select id="difficulty" required>
              <option value="beginner">Beginner</option>
              <option value="elementary">Elementary</option>
              <option value="intermediate" selected>Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div class="form-group">
            <label for="topic">Topic</label>
            <input type="text" id="topic" placeholder="e.g., Spanish verbs, Quadratic equations" required>
          </div>
        </div>
        <button type="submit" class="btn" id="generateBtn">Generate Exercise</button>
      </form>
      <div class="exercise-output" id="output"></div>
    </div>

    <div class="api-docs">
      <h2>📡 API Endpoints</h2>
      <div class="endpoint">
        <span class="method">POST</span> <span class="path">/generate</span>
        <p style="margin-top: 0.5rem; color: var(--muted);">Generate new exercises based on subject, topic, and difficulty</p>
      </div>
      <div class="endpoint">
        <span class="method">POST</span> <span class="path">/validate</span>
        <p style="margin-top: 0.5rem; color: var(--muted);">Validate user answers and get feedback</p>
      </div>
      <div class="endpoint">
        <span class="method">GET</span> <span class="path">/subjects</span>
        <p style="margin-top: 0.5rem; color: var(--muted);">List all supported subjects and their configurations</p>
      </div>
      <div class="endpoint">
        <span class="method">GET</span> <span class="path">/health</span>
        <p style="margin-top: 0.5rem; color: var(--muted);">Health check endpoint</p>
      </div>
    </div>
  </div>

  <footer>
    &copy; 2026 XAOSTECH. All rights reserved. |
    <a href="https://lingua.xaostech.io" style="color: var(--primary);">Lingua API</a> |
    <a href="https://xaostech.io" style="color: var(--primary);">Main Site</a>
  </footer>

  <script>
    const subjects = ${JSON.stringify(Object.values(SUBJECT_CONFIGS).map(s => ({
    subject: s.subject,
    name: s.name,
    description: s.description,
    categories: s.categories,
  })))};

    const subjectsContainer = document.getElementById('subjects');
    subjects.forEach(s => {
      const card = document.createElement('div');
      card.className = 'subject-card';
      card.innerHTML = \`
        <h3>\${s.name}</h3>
        <p>\${s.description}</p>
        <p style="margin-top: 0.5rem; font-size: 0.8rem; color: #666;">
          Categories: \${s.categories.slice(0, 4).join(', ')}\${s.categories.length > 4 ? '...' : ''}
        </p>
      \`;
      card.onclick = () => {
        document.getElementById('subject').value = s.subject;
        document.getElementById('topic').focus();
      };
      subjectsContainer.appendChild(card);
    });

    document.getElementById('generateForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('generateBtn');
      const output = document.getElementById('output');
      
      btn.disabled = true;
      btn.textContent = 'Generating...';
      output.style.display = 'block';
      output.textContent = 'Generating exercise...';

      try {
        const res = await fetch('/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: document.getElementById('subject').value,
            difficulty: document.getElementById('difficulty').value,
            topic: document.getElementById('topic').value,
          }),
        });
        const data = await res.json();
        output.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        output.textContent = 'Error: ' + err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Generate Exercise';
      }
    });
  </script>
</body>
</html>`;
  return c.html(html);
});

// =============================================================================
// CHILD TIME REMAINING API
// =============================================================================

app.get('/api/time-remaining', async (c) => {
  const user = await getSessionWithControls(c);

  if (!user?.isChild || !user.controls) {
    return c.json({ minutesRemaining: -1, unlimited: true });
  }

  const { allowed, minutesRemaining } = await checkTimeLimit(c, user.id, user.controls);

  return c.json({
    minutesRemaining,
    dailyLimit: user.controls.daily_time_limit,
    allowed,
    unlimited: !user.controls.daily_time_limit,
  });
});

// =============================================================================
// CHILD LEARNING PAGES
// =============================================================================

app.get('/learn/:subject', async (c) => {
  const subject = c.req.param('subject') as Subject;
  const config = SUBJECT_CONFIGS[subject];

  if (!config) {
    return c.json({ error: 'Subject not found' }, 404);
  }

  const user = await getSessionWithControls(c);
  const isChild = user?.isChild && user.controls;

  // Get time remaining for display
  let minutesRemaining = -1;
  let dailyLimit = null;
  if (isChild && user.controls) {
    const timeCheck = await checkTimeLimit(c, user.id, user.controls);
    minutesRemaining = timeCheck.minutesRemaining;
    dailyLimit = user.controls.daily_time_limit;
  }

  const subjectEmojis: Record<string, string> = {
    'language': '📚',
    'mathematics': '🔢',
    'physics': '⚡',
    'chemistry': '🧪',
    'biology': '🧬',
    'history': '🏛️',
    'geography': '🌍',
    'computer-science': '💻',
  };

  const emoji = subjectEmojis[subject] || '📖';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emoji} ${config.name} - XAOSTECH EDU</title>
  <link rel="icon" type="image/png" href="https://api.xaostech.io/data/assets/XAOSTECH_LOGO.png">
  <style>
    :root {
      --primary: #f6821f;
      --secondary: #3b82f6;
      --bg: #0a0a0a;
      --card: #1a1a1a;
      --text: #e0e0e0;
      --muted: #888;
      --kid-primary: #FF6B6B;
      --kid-secondary: #4ECDC4;
      --kid-accent: #FFE66D;
      --kid-purple: #A78BFA;
      --kid-green: #34D399;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }
    ${isChild ? `
    .time-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(90deg, var(--kid-purple), var(--kid-secondary));
      color: white;
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
      font-weight: 600;
    }
    .time-banner .time-left {
      background: rgba(0,0,0,0.2);
      padding: 0.5rem 1rem;
      border-radius: 20px;
    }
    ` : ''}
    .container { max-width: 900px; margin: 0 auto; padding: ${isChild ? '5rem' : '2rem'} 2rem 2rem; }
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .header .emoji { font-size: 4rem; }
    .header h1 { color: var(--primary); margin: 1rem 0 0.5rem; }
    .header p { opacity: 0.8; }
    .back-link {
      display: inline-block;
      color: var(--primary);
      text-decoration: none;
      margin-bottom: 2rem;
    }
    .categories {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .category-btn {
      background: var(--card);
      border: 2px solid #333;
      border-radius: 12px;
      padding: 1rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      color: var(--text);
    }
    .category-btn:hover, .category-btn.active {
      border-color: var(--primary);
      background: rgba(246,130,31,0.1);
    }
    .difficulty-select {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    .diff-btn {
      padding: 0.5rem 1rem;
      border: 2px solid #333;
      border-radius: 20px;
      background: var(--card);
      color: var(--text);
      cursor: pointer;
      transition: all 0.2s;
    }
    .diff-btn:hover, .diff-btn.active {
      border-color: var(--kid-green);
      background: rgba(52,211,153,0.1);
    }
    .generate-section {
      background: var(--card);
      border-radius: 16px;
      padding: 2rem;
      text-align: center;
    }
    .btn {
      background: ${isChild ? 'linear-gradient(135deg, var(--kid-primary), var(--kid-purple))' : 'var(--primary)'};
      color: ${isChild ? 'white' : '#000'};
      padding: 1rem 2.5rem;
      border: none;
      border-radius: ${isChild ? '25px' : '8px'};
      cursor: pointer;
      font-weight: bold;
      font-size: 1.1rem;
      transition: all 0.3s ease;
    }
    .btn:hover { transform: translateY(-2px); opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .exercise-container {
      margin-top: 2rem;
      display: none;
    }
    .exercise-card {
      background: var(--card);
      border-radius: 16px;
      padding: 2rem;
      border: 2px solid #333;
    }
    .exercise-card.correct {
      border-color: var(--kid-green);
      background: rgba(52,211,153,0.05);
    }
    .exercise-card.incorrect {
      border-color: var(--kid-primary);
      background: rgba(255,107,107,0.05);
    }
    .question { font-size: 1.2rem; margin-bottom: 1.5rem; }
    .options { display: flex; flex-direction: column; gap: 0.75rem; }
    .option {
      padding: 1rem;
      background: var(--bg);
      border: 2px solid #333;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .option:hover { border-color: var(--primary); }
    .option.selected { border-color: var(--secondary); background: rgba(59,130,246,0.1); }
    .option.correct { border-color: var(--kid-green); background: rgba(52,211,153,0.2); }
    .option.wrong { border-color: var(--kid-primary); background: rgba(255,107,107,0.2); }
    .feedback {
      margin-top: 1.5rem;
      padding: 1rem;
      border-radius: 10px;
      display: none;
    }
    .feedback.success {
      background: rgba(52,211,153,0.1);
      border: 1px solid var(--kid-green);
      color: var(--kid-green);
    }
    .feedback.error {
      background: rgba(255,107,107,0.1);
      border: 1px solid var(--kid-primary);
      color: var(--kid-primary);
    }
    footer { text-align: center; padding: 2rem; color: var(--muted); }
    footer a { color: var(--primary); }
  </style>
</head>
<body>
  ${isChild && dailyLimit ? `
  <div class="time-banner">
    <span>👋 Learning ${config.name}!</span>
    <div class="time-left">
      🕐 ${minutesRemaining > 0 ? (Math.floor(minutesRemaining / 60) > 0 ? Math.floor(minutesRemaining / 60) + 'h ' : '') + (minutesRemaining % 60) + 'm left' : 'Unlimited'}
    </div>
  </div>
  ` : ''}
  
  <div class="container">
    <a href="/" class="back-link">← Back to subjects</a>
    
    <div class="header">
      <div class="emoji">${emoji}</div>
      <h1>${config.name}</h1>
      <p>${config.description}</p>
    </div>
    
    <h3 style="text-align: center; margin-bottom: 1rem;">Choose a topic:</h3>
    <div class="categories" id="categories">
      ${config.categories.map(cat => `<div class="category-btn" data-cat="${cat}">${cat}</div>`).join('')}
    </div>
    
    <h3 style="text-align: center; margin-bottom: 1rem;">Difficulty:</h3>
    <div class="difficulty-select">
      ${['beginner', 'elementary', 'intermediate', 'advanced', 'expert'].map(d =>
    `<button class="diff-btn ${d === 'intermediate' ? 'active' : ''}" data-diff="${d}">${d}</button>`
  ).join('')}
    </div>
    
    <div class="generate-section">
      <button class="btn" id="generateBtn">🎯 Generate Exercise</button>
    </div>
    
    <div class="exercise-container" id="exerciseContainer">
      <div class="exercise-card" id="exerciseCard">
        <div class="question" id="question"></div>
        <div class="options" id="options"></div>
        <div class="feedback" id="feedback"></div>
        <button class="btn" id="nextBtn" style="margin-top: 1.5rem; display: none;">Next Exercise →</button>
      </div>
    </div>
  </div>
  
  <footer>
    <a href="https://xaostech.io">XAOSTECH</a> | Made with 💜
  </footer>
  
  <script>
    let selectedCategory = null;
    let selectedDifficulty = 'intermediate';
    let currentExercise = null;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCategory = btn.dataset.cat;
      });
    });
    
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDifficulty = btn.dataset.diff;
      });
    });
    
    document.getElementById('generateBtn').addEventListener('click', async () => {
      if (!selectedCategory) {
        alert('Please select a topic first!');
        return;
      }
      
      const btn = document.getElementById('generateBtn');
      btn.disabled = true;
      btn.textContent = '⏳ Creating...';
      
      try {
        const res = await fetch('/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: '${subject}',
            topic: selectedCategory,
            difficulty: selectedDifficulty,
            types: ['multiple-choice'],
            count: 1,
          }),
        });
        
        const data = await res.json();
        
        if (data.exercises && data.exercises.length > 0) {
          currentExercise = data.exercises[0];
          renderExercise(currentExercise);
          document.getElementById('exerciseContainer').style.display = 'block';
        } else {
          alert('Could not generate exercise. Please try again!');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '🎯 Generate Exercise';
      }
    });
    
    function renderExercise(exercise) {
      const card = document.getElementById('exerciseCard');
      card.className = 'exercise-card';
      
      document.getElementById('question').textContent = exercise.problem.content.question;
      
      const optionsDiv = document.getElementById('options');
      optionsDiv.innerHTML = '';
      
      exercise.problem.content.options.forEach(opt => {
        const optEl = document.createElement('div');
        optEl.className = 'option';
        optEl.textContent = opt.id.toUpperCase() + '. ' + opt.text;
        optEl.dataset.id = opt.id;
        optEl.addEventListener('click', () => selectOption(optEl, exercise));
        optionsDiv.appendChild(optEl);
      });
      
      document.getElementById('feedback').style.display = 'none';
      document.getElementById('nextBtn').style.display = 'none';
    }
    
    function selectOption(optEl, exercise) {
      if (optEl.classList.contains('correct') || optEl.classList.contains('wrong')) return;
      
      document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
      optEl.classList.add('selected');
      
      const correct = exercise.solution.correctAnswer;
      const selected = optEl.dataset.id;
      const feedback = document.getElementById('feedback');
      const card = document.getElementById('exerciseCard');
      
      if (selected === correct) {
        optEl.classList.add('correct');
        card.classList.add('correct');
        feedback.className = 'feedback success';
        feedback.innerHTML = '🎉 <strong>Correct!</strong> ' + (exercise.solution.explanation || 'Great job!');
      } else {
        optEl.classList.add('wrong');
        card.classList.add('incorrect');
        document.querySelector(\`.option[data-id="\${correct}"]\`).classList.add('correct');
        feedback.className = 'feedback error';
        feedback.innerHTML = '💡 <strong>Not quite!</strong> ' + (exercise.solution.explanation || 'Keep trying!');
      }
      
      feedback.style.display = 'block';
      document.getElementById('nextBtn').style.display = 'inline-block';
    }
    
    document.getElementById('nextBtn').addEventListener('click', () => {
      document.getElementById('generateBtn').click();
    });
  </script>
</body>
</html>`;

  return c.html(html);
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'edu.xaostech.io',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// EXERCISE BANK EXPORT (for backup/versioning)
// =============================================================================

import { exportExercisesToJSON } from './lib/d1-exercise-bank';

app.get('/api/exercises/export', async (c) => {
  // Only allow owner/admin to export
  const user = await getSessionUser(c);
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return c.json({ error: 'Unauthorized - admin access required' }, 401);
  }

  const subject = c.req.query('subject') as Subject | undefined;

  try {
    const exportData = await exportExercisesToJSON(c.env.EDU_DB, subject);

    // Return as downloadable JSON
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="exercises-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (err: any) {
    console.error('Export error:', err);
    return c.json({ error: 'Export failed', message: err.message }, 500);
  }
});

// =============================================================================
// SUBJECTS ENDPOINT
// =============================================================================

app.get('/subjects', (c) => {
  const subjects = Object.values(SUBJECT_CONFIGS).map(config => ({
    subject: config.subject,
    name: config.name,
    description: config.description,
    categories: config.categories,
    supportedTypes: config.supportedTypes,
    defaultDifficulty: config.defaultDifficulty,
  }));

  return c.json({
    subjects,
    difficulties: ['beginner', 'elementary', 'intermediate', 'advanced', 'expert'],
    count: subjects.length,
  });
});

app.get('/subjects/:subject', (c) => {
  const subject = c.req.param('subject') as Subject;
  const config = SUBJECT_CONFIGS[subject];

  if (!config) {
    return c.json({ error: 'Subject not found' }, 404);
  }

  return c.json({
    subject: config.subject,
    name: config.name,
    description: config.description,
    categories: config.categories,
    supportedTypes: config.supportedTypes,
    defaultDifficulty: config.defaultDifficulty,
    validationDefaults: config.validationDefaults,
  });
});

// =============================================================================
// GENERATE EXERCISE
// =============================================================================

app.post('/generate', async (c) => {
  try {
    const body = await c.req.json<GenerateExerciseRequest>();

    // Validate required fields
    if (!body.subject || !body.topic) {
      return c.json({ error: 'subject and topic are required' }, 400);
    }

    // Validate subject
    if (!SUBJECT_CONFIGS[body.subject]) {
      return c.json({
        error: `Invalid subject. Supported: ${Object.keys(SUBJECT_CONFIGS).join(', ')}`
      }, 400);
    }

    // Set defaults
    const request: GenerateExerciseRequest = {
      ...body,
      difficulty: body.difficulty || 'intermediate',
      count: body.count || 1,
      options: {
        includeHints: true,
        hintCount: 3,
        includeCommonMistakes: true,
        ...body.options,
      },
    };

    const response = await generateExercise(c.env, request);

    return c.json(response, 200, {
      'X-Exercises-Count': response.exercises.length.toString(),
      'X-Model-Used': response.meta.model,
      'X-Cached': response.meta.cached ? 'true' : 'false',
    });
  } catch (error: any) {
    console.error('[GENERATE] Error:', error);
    return c.json({
      error: 'Exercise generation failed',
      message: error.message,
    }, 500);
  }
});

// Language-specific shortcut
app.post('/generate/language', async (c) => {
  try {
    const body = await c.req.json();

    const request: GenerateExerciseRequest = {
      subject: 'language',
      topic: body.topic || 'general vocabulary',
      difficulty: body.difficulty || 'intermediate',
      category: body.category,
      types: body.types || ['multiple-choice', 'fill-blank', 'translation'],
      language: body.language || 'en',
      targetLanguage: body.targetLanguage,
      count: body.count || 1,
      lessonContext: body.lessonContext,
      options: body.options,
    };

    const response = await generateExercise(c.env, request);
    return c.json(response);
  } catch (error: any) {
    console.error('[GENERATE/LANGUAGE] Error:', error);
    return c.json({ error: 'Language exercise generation failed', message: error.message }, 500);
  }
});

// Math-specific shortcut
app.post('/generate/mathematics', async (c) => {
  try {
    const body = await c.req.json();

    const request: GenerateExerciseRequest = {
      subject: 'mathematics',
      topic: body.topic || 'basic algebra',
      difficulty: body.difficulty || 'intermediate',
      category: body.category,
      types: body.types || ['calculation', 'multiple-choice', 'proof'],
      count: body.count || 1,
      lessonContext: body.lessonContext,
      options: body.options,
    };

    const response = await generateExercise(c.env, request);
    return c.json(response);
  } catch (error: any) {
    console.error('[GENERATE/MATH] Error:', error);
    return c.json({ error: 'Mathematics exercise generation failed', message: error.message }, 500);
  }
});

// =============================================================================
// VALIDATE ANSWER
// =============================================================================

app.post('/validate', async (c) => {
  try {
    const body = await c.req.json<SubmissionRequest>();

    if (!body.exerciseId || body.answer === undefined) {
      return c.json({ error: 'exerciseId and answer are required' }, 400);
    }

    // Retrieve exercise from cache
    const exerciseData = await c.env.EXERCISES_KV.get(`exercise:${body.exerciseId}`);

    if (!exerciseData) {
      return c.json({ error: 'Exercise not found' }, 404);
    }

    const exercise = JSON.parse(exerciseData);
    const result = validateAnswer(
      exercise,
      body.answer,
      body.hintsUsed || 0,
      body.timeTaken || 0
    );

    // Store submission in progress KV if user provided
    if (body.userId) {
      const progressKey = `progress:${body.userId}:${body.exerciseId}`;
      await c.env.PROGRESS_KV.put(progressKey, JSON.stringify({
        ...result,
        submittedAt: new Date().toISOString(),
        answer: body.answer,
      }));
    }

    return c.json({
      exerciseId: body.exerciseId,
      ...result,
      solution: result.passed || result.score < 30 ? exercise.solution : undefined,
    });
  } catch (error: any) {
    console.error('[VALIDATE] Error:', error);
    return c.json({ error: 'Validation failed', message: error.message }, 500);
  }
});

// =============================================================================
// GET SOLUTION (after failed attempts)
// =============================================================================

app.get('/solution/:exerciseId', async (c) => {
  const exerciseId = c.req.param('exerciseId');
  const exerciseData = await c.env.EXERCISES_KV.get(`exercise:${exerciseId}`);

  if (!exerciseData) {
    return c.json({ error: 'Exercise not found' }, 404);
  }

  const exercise = JSON.parse(exerciseData);

  return c.json({
    exerciseId,
    solution: exercise.solution,
    problem: exercise.problem,
  });
});

// =============================================================================
// GET HINTS
// =============================================================================

app.get('/hints/:exerciseId', async (c) => {
  const exerciseId = c.req.param('exerciseId');
  const hintIndex = parseInt(c.req.query('index') || '0');

  const exerciseData = await c.env.EXERCISES_KV.get(`exercise:${exerciseId}`);

  if (!exerciseData) {
    return c.json({ error: 'Exercise not found' }, 404);
  }

  const exercise = JSON.parse(exerciseData);
  const availableHints = exercise.hints.slice(0, hintIndex + 1);

  return c.json({
    exerciseId,
    hints: availableHints,
    hasMore: hintIndex + 1 < exercise.hints.length,
    totalHints: exercise.hints.length,
    penalty: exercise.validation.hintPenalty * availableHints.length,
  });
});

// =============================================================================
// INTEGRATION WITH LINGUA (Translation for educational content)
// =============================================================================

app.post('/translate', async (c) => {
  try {
    const { text, to, from = 'auto', context } = await c.req.json();

    if (!text || !to) {
      return c.json({ error: 'text and to language required' }, 400);
    }

    // Forward to lingua.xaostech.io
    const linguaUrl = c.env.LINGUA_API_URL || 'https://lingua.xaostech.io';
    const response = await fetch(`${linguaUrl}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        to,
        from,
        context: context || 'educational content'
      }),
    });

    const result = await response.json();
    return c.json(result);
  } catch (error: any) {
    console.error('[TRANSLATE] Error:', error);
    return c.json({ error: 'Translation failed', message: error.message }, 500);
  }
});

// =============================================================================
// 404 HANDLER
// =============================================================================

app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    path: c.req.path,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /subjects',
      'GET /subjects/:subject',
      'POST /generate',
      'POST /generate/language',
      'POST /generate/mathematics',
      'POST /validate',
      'GET /solution/:exerciseId',
      'GET /hints/:exerciseId',
      'POST /translate',
    ],
  }, 404);
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

app.onError((err, c) => {
  console.error('[ERROR]', err);
  return c.json({
    error: 'Internal Server Error',
    message: c.env.ENVIRONMENT === 'development' ? err.message : undefined,
  }, 500);
});

export default app;
