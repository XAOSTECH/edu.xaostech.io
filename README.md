# edu.xaostech.io

<!-- Project Shields/Badges -->
<p align="center">
  <a href="https://github.com/XAOSTECH/edu.xaostech.io">
    <img alt="GitHub repo" src="https://img.shields.io/badge/GitHub-XAOSTECH%2Fedu.xaostech.io-181717?style=for-the-badge&logo=github">
  </a>
  <a href="https://github.com/XAOSTECH/edu.xaostech.io/releases">
    <img alt="GitHub release" src="https://img.shields.io/github/v/release/XAOSTECH/edu.xaostech.io?style=for-the-badge&logo=semantic-release&color=blue">
  </a>
  <a href="https://github.com/XAOSTECH/edu.xaostech.io/blob/main/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/XAOSTECH/edu.xaostech.io?style=for-the-badge&color=green">
  </a>
</p>

<p align="center">
  <a href="https://github.com/XAOSTECH/edu.xaostech.io/actions">
    <img alt="CI Status" src="https://github.com/XAOSTECH/edu.xaostech.io/actions/workflows/deploy.yml/badge.svg?branch=main">
  </a>
  <img alt="Cloudflare Workers" src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare">
  <img alt="Workers AI" src="https://img.shields.io/badge/AI-Workers%20AI-F38020?style=flat-square&logo=cloudflare">
</p>

---

<p align="center">
  <b>🎓 AI-Powered Educational Platform - Adaptive Exercise Generation</b>
</p>

---

## 🔍 Overview

edu.xaostech.io is an AI-powered educational platform built on Cloudflare Workers that generates adaptive exercises across multiple subjects. It uses **Cloudflare Workers AI** (free tier: 10,000 neurons/day) to create personalized learning experiences.

### Key Features

- 🤖 **AI-Generated Exercises** - Powered by Llama 3.2, Qwen3, and other models
- 📚 **8 Subjects** - Language, Mathematics, Physics, Chemistry, Biology, History, Geography, Computer Science
- 🎯 **5 Difficulty Levels** - Beginner to Expert adaptive progression
- ✅ **Automatic Validation** - Pass/fail grading with partial credit
- 💡 **Progressive Hints** - Guided learning without giving away answers
- 🌐 **Integration with Lingua** - Translation and etymology for language learning

---

## ✨ Architecture

```
edu.xaostech.io (Cloudflare Worker)
├── src/
│   ├── index.ts          # Main Hono API
│   ├── types/
│   │   └── exercise.ts   # TypeScript interfaces + Subject configs
│   └── lib/
│       └── generator.ts  # AI exercise generation logic
├── prompts/
│   └── exercise-audit.prompt.yml  # GitHub Models audit prompt
└── migrations/
    └── 0001_init_schema.sql  # D1 database schema
```

### AI Models Used (Cloudflare Workers AI Free Tier)

| Model | Use Case | Neurons/M Input |
|-------|----------|-----------------|
| `@cf/meta/llama-3.2-3b-instruct` | Fast, simple exercises | ~4.6k |
| `@cf/meta/llama-3.1-8b-instruct-fast` | Quality balanced | ~4.1k |
| `@cf/qwen/qwq-32b` | Math proofs, reasoning | ~60k |

**Free Tier Capacity**: ~300-500 exercises/day depending on complexity.

---

## 📡 API Endpoints

### Generate Exercises

```bash
POST /generate
Content-Type: application/json

{
  "subject": "language",
  "topic": "Spanish past tense verbs",
  "difficulty": "intermediate",
  "types": ["fill-blank", "conjugation"],
  "count": 1,
  "lessonContext": {
    "title": "Preterite vs Imperfect",
    "concepts": ["completed actions", "habitual past"],
    "vocabulary": ["hablar", "comer", "vivir"]
  }
}
```

### Validate Answers

```bash
POST /validate
Content-Type: application/json

{
  "exerciseId": "lan-voc-abc123",
  "answer": "hablé",
  "timeTaken": 45,
  "hintsUsed": 1
}
```

### List Subjects

```bash
GET /subjects
GET /subjects/mathematics
```

### Get Hints

```bash
GET /hints/lan-voc-abc123?index=1
```

---

## 🚀 Exercise Types Supported

| Type | Description | Subjects |
|------|-------------|----------|
| `multiple-choice` | Select correct answer(s) | All |
| `fill-blank` | Fill in missing parts | Language, Math |
| `matching` | Match items | All |
| `calculation` | Numerical computation | Math, Physics, Chemistry |
| `proof` | Mathematical/logical proof | Math |
| `translation` | Language translation | Language |
| `conjugation` | Verb conjugation | Language |
| `coding` | Programming exercises | Computer Science |

---

## 🛠️ Development

### Prerequisites

- Node.js 20+
- Wrangler CLI (`npm i -g wrangler`)
- Cloudflare account

### Setup

```bash
cd edu.xaostech.io
npm install
```

### Local Development

```bash
npm run dev
# Opens at http://localhost:8787
```

### Deploy

```bash
npm run deploy
# Or for staging:
wrangler deploy --env staging
```

### Create KV Namespaces

```bash
wrangler kv:namespace create EXERCISES_KV
wrangler kv:namespace create PROGRESS_KV
```

### Create D1 Database

```bash
wrangler d1 create edu-xaostech-db
wrangler d1 migrations apply edu-xaostech-db
```

---

## 🔗 Integration with lingua.xaostech.io

The platform integrates with lingua.xaostech.io for:

- **Educational Translation** - `POST /translate/educational`
- **Etymology Lookup** - `POST /etymology`
- **Verb Conjugation** - `POST /conjugate`
- **Linguistic Analysis** - `POST /analyze`

---

## 📊 Exercise Format (Universal Structure)

```typescript
interface Exercise {
  id: string;
  subject: Subject;
  category: SubjectCategory;
  difficulty: DifficultyLevel;
  type: ExerciseType;
  topic: string;
  problem: {
    instruction: string;
    content: ProblemContent;
    maxPoints: number;
  };
  solution: {
    correctAnswer: SolutionAnswer;
    explanation: string;
    steps?: SolutionStep[];
  };
  hints: string[];
  validation: ValidationRules;
  metadata: ExerciseMetadata;
}
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE)bash
# Clone the repository
git clone https://github.com/XAOSTECH/edu.xaostech.io.git
cd edu.xaostech.io

# Run installation
./install.sh

# Or manual installation
{{MANUAL_INSTALL_STEPS}}
```

### Package Managers

```bash
# npm
npm install {{PACKAGE_NAME}}

# yarn
yarn add {{PACKAGE_NAME}}

# apt (Debian/Ubuntu)
sudo apt install {{PACKAGE_NAME}}

# brew (macOS)
brew install {{PACKAGE_NAME}}
```

---

## 🚀 Usage

### Basic Usage

```bash
{{BASIC_USAGE_EXAMPLE}}
```

### Advanced Usage

```bash
{{ADVANCED_USAGE_EXAMPLE}}
```

### Examples

<details>
<summary>📘 Example 1: {{EXAMPLE_1_TITLE}}</summary>

```bash
{{EXAMPLE_1_CODE}}
```

</details>

<details>
<summary>📗 Example 2: {{EXAMPLE_2_TITLE}}</summary>

```bash
{{EXAMPLE_2_CODE}}
```

</details>

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `{{ENV_VAR_1}}` | {{ENV_VAR_1_DESC}} | `{{ENV_VAR_1_DEFAULT}}` |
| `{{ENV_VAR_2}}` | {{ENV_VAR_2_DESC}} | `{{ENV_VAR_2_DEFAULT}}` |

### Configuration File

```yaml
# config.yml
{{CONFIG_FILE_EXAMPLE}}
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [📖 Getting Started](docs/GETTING_STARTED.md) | Quick start guide |
| [📋 API Reference](docs/API.md) | Complete API documentation |
| [🔧 Configuration](docs/CONFIGURATION.md) | Configuration options |
| [❓ FAQ](docs/FAQ.md) | Frequently asked questions |

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

See also: [Code of Conduct](CODE_OF_CONDUCT.md) | [Security Policy](SECURITY.md)

---

## 🗺️ Roadmap

- [x] {{COMPLETED_FEATURE_1}}
- [x] {{COMPLETED_FEATURE_2}}
- [ ] {{PLANNED_FEATURE_1}}
- [ ] {{PLANNED_FEATURE_2}}
- [ ] {{PLANNED_FEATURE_3}}

See the [open issues](https://github.com/XAOSTECH/edu.xaostech.io/issues) for a full list of proposed features and known issues.

---

## 💬 Support

- 📧 **Email**: {{SUPPORT_EMAIL}}
- 💻 **Issues**: [GitHub Issues](https://github.com/XAOSTECH/edu.xaostech.io/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/XAOSTECH/edu.xaostech.io/discussions)
- 📝 **Wiki**: [GitHub Wiki](https://github.com/XAOSTECH/edu.xaostech.io/wiki)

---

## 📄 License

Distributed under the GPL-3.0 License. See [`LICENSE`](LICENSE) for more information.

---

## 🙏 Acknowledgments

- {{ACKNOWLEDGMENT_1}}
- {{ACKNOWLEDGMENT_2}}
- {{ACKNOWLEDGMENT_3}}

---

<p align="center">
  <a href="https://github.com/XAOSTECH">
    <img src="https://img.shields.io/badge/Made%20with%20%E2%9D%A4%EF%B8%8F%20by-XAOSTECH-red?style=for-the-badge">
  </a>
</p>

<p align="center">
  <a href="#edu.xaostech.io">⬆️ Back to Top</a>
</p>