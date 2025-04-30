# TanulBot - Hungarian Learning Telegram Bot

A Telegram bot for learning Hungarian with AI assistance, dictation practice, and Anki deck generation.

## Features

- 🗣 **Hungarian Practice**: Chat in Hungarian with the bot and receive corrections
- ✍️ **Dictation Practice**: Listen to Hungarian words and type them for points
- 📄 **PDF Processing**: Upload Hungarian text to extract vocabulary
- 🎯 **Anki Integration**: Auto-generate Anki decks with Hungarian-Russian word pairs
- 🏆 **Progress Tracking**: Track learning progress with levels and points

## Technologies

- Node.js with TypeScript
- Grammy (Telegram Bot API)
- OpenAI API for language correction and TTS
- PDF processing with OCR support
- Anki deck generation

## Project Structure

```
src/
├── bot/           # Bot-specific components
├── config/        # Application configuration
├── handlers/      # Message and event handlers
├── services/      # Core services
├── store/         # State management
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── workers/       # Background workers
└── index.ts       # Application entry point
```

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env` file with the following variables:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Start the bot in development mode with `npm run dev`
5. Build for production with `npm run build`
6. Start production build with `npm start`

## Usage

1. Start a chat with the bot on Telegram
2. Use the keyboard menu to select an activity
3. Upload Hungarian PDFs to extract words
4. Practice with dictation or conversation
5. Download generated Anki decks for offline study

## License

MIT 