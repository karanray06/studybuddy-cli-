# 🎓 StudyBuddy CLI

**AI-powered study companion with spaced repetition — runs 100% locally with Ollama.**

Built for a friend who's cramming for exams and deserves a study tool that respects their privacy, works offline, and actually helps them *learn* — not just memorize.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-Local_AI-000000?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48L3N2Zz4=)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- **📚 Smart Flashcard Generation** — Paste notes, import a PDF, or speak into your mic. The AI generates high-quality Q&A flashcards instantly.
- **🧠 Spaced Repetition (SM-2)** — The same algorithm SuperMemo uses. Cards you struggle with appear more often; cards you've mastered fade back.
- **💡 AI Explanations** — Get it wrong? The AI explains *why* the answer is correct, in a way that helps you actually understand.
- **📊 Progress Tracking** — Streaks, accuracy, daily activity charts, and per-deck mastery breakdowns.
- **📄 PDF Import** — Drop in a textbook chapter PDF and get flashcards in seconds.
- **🎤 Voice Input** — Speak your notes through a browser companion page (Web Speech API).
- **🔒 100% Local** — Your study data never leaves your machine. No accounts, no cloud, no telemetry.
- **🔄 Swap Models** — Switch between Llama, Mistral, Phi, Gemma, or any Ollama model at will.

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** — [Download](https://nodejs.org/)
2. **Ollama** — [Install Ollama](https://ollama.ai), then pull a model:
   ```bash
   ollama pull llama3.2
   ```

### Install & Run

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/studybuddy-cli.git
cd studybuddy-cli

# Install dependencies
npm install

# Launch StudyBuddy
npm start
```

## 📖 Usage

### Create a Deck

1. Choose **"Create a new deck"** from the main menu
2. Pick your input method:
   - **Paste notes** — type or paste your study material
   - **Import file** — provide a path to a PDF or text file
   - **Voice input** — opens a browser page where you speak your notes
3. Give your deck a name
4. The AI generates flashcards — review and start studying!

### Study with Spaced Repetition

1. Choose **"Study a deck"**
2. Pick **"Due cards only"** for spaced repetition or **"Review all"** for a full review
3. For each card:
   - Read the question
   - Type your answer
   - Self-assess: Got it right / wrong / partially
   - If wrong: get an AI-powered explanation
4. View your quiz summary at the end

### Track Your Progress

- **Streaks** — study every day to build your streak
- **Weekly chart** — see your activity over the last 7 days
- **Deck mastery** — see how many cards are New / Learning / Reviewing / Mastered

## 🏗️ Architecture

```
studybuddy-cli/
├── bin/
│   └── studybuddy.js       # CLI entry point
├── src/
│   ├── index.js             # Main app + interactive menus
│   ├── ai/
│   │   └── ollama.js        # Ollama REST API client
│   ├── cards/
│   │   ├── generator.js     # AI flashcard generation
│   │   ├── importer.js      # PDF/text extraction
│   │   └── manager.js       # Deck & card CRUD + storage
│   ├── quiz/
│   │   ├── engine.js        # Interactive quiz runner
│   │   └── sm2.js           # SM-2 spaced repetition algorithm
│   ├── progress/
│   │   └── tracker.js       # Streaks, stats, daily history
│   ├── ui/
│   │   ├── display.js       # Banner, progress dashboard, cards
│   │   └── theme.js         # Color palette & symbols
│   └── voice/
│       ├── page.html        # Web Speech API companion page
│       └── server.js        # Local HTTP server for voice input
├── LICENSE                  # MIT
├── package.json
└── README.md
```

### Data Storage

All data is stored locally in `~/.studybuddy/`:

```
~/.studybuddy/
├── decks/           # One JSON file per deck (cards + SM-2 state)
└── progress.json    # Streaks, stats, daily history
```

## 🤖 Why Open-Source AI?

| Concern | How StudyBuddy handles it |
|---------|--------------------------|
| **Privacy** | Study notes never leave your machine. No API keys, no cloud upload. |
| **Offline** | Works on a laptop with no internet once the model is downloaded. |
| **Cost** | Free forever. No per-token charges, no subscription. |
| **Flexibility** | Swap models instantly. Llama for quality, Phi for speed, Mistral for variety. |
| **Transparency** | Every prompt is in the source code. No black-box behavior. |

## 📜 License

MIT — see [LICENSE](./LICENSE).

---

*Built with ♥ for Hacktoberfest 2026 Weekend Challenge: Build for a Friend*
