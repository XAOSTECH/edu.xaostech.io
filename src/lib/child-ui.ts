/**
 * Child-Friendly UI Components for edu.xaostech.io
 * Provides kid-appropriate styling, time banners, and friendly messaging
 */

interface ChildUIContext {
    username: string;
    minutesRemaining: number;
    dailyLimit: number | null;
    filterLevel: 'strict' | 'moderate' | 'minimal';
}

/**
 * Generate child-friendly CSS with bright colors and playful design
 */
export function getChildFriendlyStyles(): string {
    return `
    :root {
      --kid-primary: #FF6B6B;
      --kid-secondary: #4ECDC4;
      --kid-accent: #FFE66D;
      --kid-purple: #A78BFA;
      --kid-green: #34D399;
      --kid-bg: #1a1a2e;
      --kid-card: #16213e;
      --kid-text: #f0f0f0;
    }
    
    body.child-mode {
      background: linear-gradient(135deg, var(--kid-bg) 0%, #0f0f23 100%);
    }
    
    .child-mode .hero {
      background: linear-gradient(135deg, rgba(255,107,107,0.2) 0%, rgba(78,205,196,0.2) 50%, rgba(167,139,250,0.2) 100%);
      border: 2px solid rgba(255,230,109,0.3);
    }
    
    .child-mode .hero h1 {
      color: var(--kid-accent);
      font-size: 2.5rem;
    }
    
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
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }
    
    .time-banner .greeting {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .time-banner .time-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0,0,0,0.2);
      padding: 0.5rem 1rem;
      border-radius: 20px;
    }
    
    .time-banner .time-left.warning {
      background: rgba(255,107,107,0.8);
      animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    .time-banner .progress-bar {
      width: 100px;
      height: 8px;
      background: rgba(0,0,0,0.3);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .time-banner .progress-fill {
      height: 100%;
      background: var(--kid-green);
      transition: width 0.3s ease;
    }
    
    .child-mode .container {
      padding-top: 5rem;
    }
    
    .child-mode .subject-card {
      background: var(--kid-card);
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }
    
    .child-mode .subject-card:hover {
      border-color: var(--kid-accent);
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 10px 30px rgba(255,230,109,0.2);
    }
    
    .child-mode .subject-card h3 {
      color: var(--kid-secondary);
    }
    
    .child-mode .btn {
      background: linear-gradient(135deg, var(--kid-primary), var(--kid-purple));
      color: white;
      font-size: 1.1rem;
      padding: 1rem 2rem;
      border-radius: 25px;
      box-shadow: 0 4px 15px rgba(255,107,107,0.3);
      transition: all 0.3s ease;
    }
    
    .child-mode .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255,107,107,0.4);
    }
    
    .achievement-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      background: var(--kid-card);
      border: 3px solid var(--kid-accent);
      border-radius: 20px;
      padding: 2rem;
      text-align: center;
      z-index: 2000;
      transition: transform 0.3s ease;
    }
    
    .achievement-popup.show {
      transform: translate(-50%, -50%) scale(1);
    }
    
    .achievement-popup .emoji {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    
    .streaks-display {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin: 1rem 0;
    }
    
    .streak-item {
      background: var(--kid-card);
      padding: 1rem;
      border-radius: 12px;
      text-align: center;
      min-width: 80px;
    }
    
    .streak-item .number {
      font-size: 2rem;
      font-weight: bold;
      color: var(--kid-accent);
    }
    
    .streak-item .label {
      font-size: 0.8rem;
      opacity: 0.7;
    }
    
    .friendly-error {
      background: linear-gradient(135deg, rgba(255,107,107,0.2), rgba(167,139,250,0.2));
      border: 2px solid var(--kid-primary);
      border-radius: 20px;
      padding: 3rem;
      text-align: center;
      max-width: 500px;
      margin: 2rem auto;
    }
    
    .friendly-error .emoji {
      font-size: 5rem;
      margin-bottom: 1rem;
    }
    
    .friendly-error h2 {
      color: var(--kid-accent);
      margin-bottom: 1rem;
    }
    
    .friendly-error p {
      font-size: 1.1rem;
      line-height: 1.6;
      margin-bottom: 1rem;
    }
    
    .subject-emoji {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      display: block;
    }
    `;
}

/**
 * Get emoji for subject
 */
export function getSubjectEmoji(subject: string): string {
    const emojis: Record<string, string> = {
        'language': '📚',
        'mathematics': '🔢',
        'physics': '⚡',
        'chemistry': '🧪',
        'biology': '🧬',
        'history': '🏛️',
        'geography': '🌍',
        'computer-science': '💻',
    };
    return emojis[subject] || '📖';
}

/**
 * Generate time banner HTML for child accounts
 */
export function getTimeBanner(ctx: ChildUIContext): string {
    const { username, minutesRemaining, dailyLimit } = ctx;
    
    if (!dailyLimit || minutesRemaining < 0) {
        return `
        <div class="time-banner">
          <div class="greeting">
            <span>👋</span>
            <span>Hi ${escapeHtml(username)}! Ready to learn?</span>
          </div>
          <div class="time-left">
            <span>🎓</span>
            <span>Unlimited learning today!</span>
          </div>
        </div>`;
    }
    
    const percentRemaining = Math.max(0, (minutesRemaining / dailyLimit) * 100);
    const isWarning = minutesRemaining <= 10;
    const hours = Math.floor(minutesRemaining / 60);
    const mins = minutesRemaining % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} minutes`;
    
    return `
    <div class="time-banner">
      <div class="greeting">
        <span>👋</span>
        <span>Hi ${escapeHtml(username)}! You're doing great!</span>
      </div>
      <div class="time-left ${isWarning ? 'warning' : ''}">
        <span>${isWarning ? '⏰' : '🕐'}</span>
        <span>${timeStr} left today</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentRemaining}%"></div>
        </div>
      </div>
    </div>`;
}

/**
 * Generate friendly time limit reached page
 */
export function getTimeLimitPage(username: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Great Job Today! - XAOSTECH EDU</title>
      <link rel="icon" type="image/png" href="https://api.xaostech.io/data/assets/XAOSTECH_LOGO.png">
      <style>
        ${getChildFriendlyStyles()}
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
          color: #f0f0f0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
      </style>
    </head>
    <body>
      <div class="friendly-error">
        <div class="emoji">🌟</div>
        <h2>Awesome Work Today, ${escapeHtml(username)}!</h2>
        <p>You've reached your learning goal for today. Your brain needs rest to remember everything you learned!</p>
        <p>Come back tomorrow for more fun learning adventures! 🚀</p>
        <div class="streaks-display">
          <div class="streak-item">
            <div class="number">🔥</div>
            <div class="label">Keep it up!</div>
          </div>
        </div>
        <p style="margin-top: 2rem; opacity: 0.7; font-size: 0.9rem;">
          Ask your parent if you'd like more learning time.
        </p>
      </div>
    </body>
    </html>`;
}

/**
 * Generate friendly outside hours page
 */
export function getOutsideHoursPage(username: string, allowedHours: { start: string; end: string }): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Learning Time - XAOSTECH EDU</title>
      <link rel="icon" type="image/png" href="https://api.xaostech.io/data/assets/XAOSTECH_LOGO.png">
      <style>
        ${getChildFriendlyStyles()}
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
          color: #f0f0f0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
      </style>
    </head>
    <body>
      <div class="friendly-error">
        <div class="emoji">🌙</div>
        <h2>Hi ${escapeHtml(username)}!</h2>
        <p>It's not learning time right now. Your learning hours are:</p>
        <div class="streaks-display">
          <div class="streak-item">
            <div class="number">🕐</div>
            <div class="label">${allowedHours.start} - ${allowedHours.end}</div>
          </div>
        </div>
        <p>Come back during your learning hours for awesome educational adventures! 📚</p>
        <p style="margin-top: 2rem; opacity: 0.7; font-size: 0.9rem;">
          In the meantime, try reading a book or playing outside! 🌳
        </p>
      </div>
    </body>
    </html>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Generate child-friendly landing page
 */
export function getChildLandingPage(ctx: ChildUIContext, subjectsJson: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>🎓 XAOSTECH EDU - Let's Learn!</title>
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
          font-size: 2.5rem;
          color: var(--primary);
          margin-bottom: 1rem;
        }
        .hero p { font-size: 1.2rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }
        .subjects {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        .subject-card {
          background: var(--card);
          border-radius: 16px;
          padding: 2rem;
          border: 2px solid #333;
          transition: all 0.3s ease;
          cursor: pointer;
          text-align: center;
        }
        .subject-card:hover {
          transform: translateY(-8px);
          border-color: var(--primary);
          box-shadow: 0 10px 30px rgba(246,130,31,0.2);
        }
        .subject-card .emoji { font-size: 3rem; margin-bottom: 1rem; display: block; }
        .subject-card h3 { color: var(--primary); margin-bottom: 0.5rem; font-size: 1.3rem; }
        .subject-card p { color: var(--muted); font-size: 0.95rem; }
        .btn {
          background: linear-gradient(135deg, #FF6B6B, #A78BFA);
          color: white;
          padding: 1rem 2rem;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255,107,107,0.3);
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,107,107,0.4); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        ${getChildFriendlyStyles()}
        footer {
          text-align: center;
          padding: 2rem;
          color: var(--muted);
          font-size: 0.9rem;
        }
        footer a { color: var(--primary); }
      </style>
    </head>
    <body class="child-mode">
      ${getTimeBanner(ctx)}
      <div class="container">
        <div class="hero">
          <h1>🎓 Let's Learn Something New!</h1>
          <p>Pick a subject below and start your learning adventure. Every exercise makes you smarter! 🧠✨</p>
        </div>

        <h2 style="margin-bottom: 1.5rem; text-align: center;">🌟 Choose Your Adventure</h2>
        <div class="subjects" id="subjects"></div>

        <div style="text-align: center; margin-top: 2rem;">
          <a href="https://account.xaostech.io" class="btn" style="text-decoration: none;">
            👤 My Profile
          </a>
        </div>
      </div>

      <footer>
        Made with 💜 by XAOSTECH |
        <a href="https://xaostech.io">Home</a>
      </footer>

      <script>
        const subjectEmojis = {
          'language': '📚',
          'mathematics': '🔢',
          'physics': '⚡',
          'chemistry': '🧪',
          'biology': '🧬',
          'history': '🏛️',
          'geography': '🌍',
          'computer-science': '💻'
        };
        
        const subjects = ${subjectsJson};
        const subjectsContainer = document.getElementById('subjects');
        
        subjects.forEach(s => {
          const card = document.createElement('div');
          card.className = 'subject-card';
          card.innerHTML = \`
            <span class="emoji">\${subjectEmojis[s.subject] || '📖'}</span>
            <h3>\${s.name}</h3>
            <p>\${s.description}</p>
          \`;
          card.onclick = () => {
            window.location.href = '/learn/' + s.subject;
          };
          subjectsContainer.appendChild(card);
        });
        
        // Update time remaining every minute
        setInterval(() => {
          fetch('/api/time-remaining')
            .then(r => r.json())
            .then(data => {
              if (data.minutesRemaining !== undefined && data.minutesRemaining <= 0) {
                window.location.reload();
              }
            })
            .catch(() => {});
        }, 60000);
      </script>
    </body>
    </html>`;
}
