# TanulBot - Hungarian Learning Telegram Bot

A Telegram bot for learning Hungarian with AI assistance, dictation practice, and Anki deck generation.

> **Vibe Coding Project**: This project was created with the assistance of AI tools, demonstrating how AI can be leveraged to build practical language learning applications.

## Features

- 🗣 **Hungarian Practice**: Chat in Hungarian with the bot and receive corrections
- ✍️ **Dictation Practice**: Listen to Hungarian words and type them for points
- 📄 **PDF Processing**: Upload Hungarian text to extract vocabulary with OCR support
- 🎯 **Anki Integration**: Auto-generate Anki decks with Hungarian-Russian word pairs
- 🏆 **Progress Tracking**: Track learning progress with levels and points
- 🔄 **Speech Recognition**: Convert spoken Hungarian to text for pronunciation practice
- 🔍 **Grammar Explanations**: Get detailed explanations of Hungarian grammar rules
- 📊 **Vocabulary Analytics**: View statistics on most common words and learning progress
- 📱 **Multi-platform**: Access via Telegram on mobile or desktop devices
- 🌐 **Offline Mode**: Download generated resources for offline study

## Technologies

- Node.js with TypeScript
- Grammy (Telegram Bot API)
- OpenAI API for language correction and TTS
- PDF processing with OCR support
- Anki deck generation with Python
- Tesseract OCR for text extraction

## 🍽️ Check Out MealWings.com

<div align="center">
  <a href="https://mealwings.com" target="_blank">
    <img src="https://img.shields.io/badge/Visit-MealWings.com-orange?style=for-the-badge" alt="Visit MealWings.com" />
  </a>
</div>

<p align="center"><strong>Your Personalized Culinary Companion</strong></p>

Discover **[MealWings.com](https://mealwings.com)** – the ultimate destination for food enthusiasts:

- 🥗 **Diverse Recipe Collection**: From quick weeknight dinners to gourmet experiences
- 📋 **Customized Meal Plans**: Tailored nutrition based on your dietary preferences and goals
- 🥦 **Specialized Diet Plans**: Keto, vegetarian, paleo, and more with expert guidance
- 🛒 **Smart Shopping Lists**: Automatically generated based on your selected recipes
- 📱 **Cross-Platform Experience**: Access your favorite recipes anytime, anywhere
- 👨‍🍳 **Community Features**: Share your culinary creations and connect with fellow food lovers

Transform your cooking experience with MealWings – where delicious meets nutritious!

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
tessdata/          # Tesseract OCR language data
create-anki-deck.py # Python script for Anki deck generation
```

## Getting Started

1. Clone the repository
2. Install dependencies with `pnpm install`
3. Create a `.env` file with the following variables:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Start the bot in development mode with `pnpm dev`
5. Build for production with `pnpm build`
6. Start production build with `pnpm start`

## Tesseract OCR Setup

For PDF processing and text extraction, this project uses Tesseract OCR which requires language data:

1. Download language data files from [tesseract-ocr/tessdata](https://github.com/tesseract-ocr/tessdata) based on your needs:

   - Hungarian (required): `hun.traineddata`
   - Russian (for translations): `rus.traineddata`
   - Any other languages you wish to support (see [full language list](https://github.com/tesseract-ocr/tessdata))

   ```
   # On Windows
   curl -L -o tessdata/hun.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/hun.traineddata
   curl -L -o tessdata/rus.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/rus.traineddata

   # On Linux/macOS
   wget -P tessdata/ https://github.com/tesseract-ocr/tessdata/raw/main/hun.traineddata
   wget -P tessdata/ https://github.com/tesseract-ocr/tessdata/raw/main/rus.traineddata
   ```

2. Place all downloaded `.traineddata` files in the `tessdata/` directory of the project
3. Create the `tessdata` directory if it doesn't exist: `mkdir -p tessdata`
4. The application will use these language files for OCR processing based on the language settings

Common language codes:

- `hun` - Hungarian
- `rus` - Russian
- `eng` - English
- `deu` - German
- `fra` - French
- `ita` - Italian

The bot will automatically detect which language files are available and offer those languages for processing.

## Python Script Setup (Anki Deck Generation)

The project includes a Python script for generating Anki decks from word pairs:

1. Install Python 3.6 or higher
2. Install required Python dependencies:
   ```
   pip install genanki
   ```
3. Usage:

   ```
   python create-anki-deck.py word_pairs.json output.apkg [--deck-name "Hungarian Words"]
   ```

   Parameters:

   - `word_pairs.json`: JSON file containing word pairs in format `[{"front": "magyar szó", "back": "translation"}]`
   - `output.apkg`: Output Anki package file
   - `--deck-name`: Optional name for the deck (default: "Hungarian Words")
   - `--css-file`: Optional CSS file for custom card styling
   - `--quiet`: Suppress output messages

## Usage

1. Start a chat with the bot on Telegram
2. Use the keyboard menu to select an activity
3. Upload Hungarian PDFs to extract words
4. Practice with dictation or conversation
5. Download generated Anki decks for offline study
6. Use speech recognition for pronunciation practice
7. Request grammar explanations on specific topics

## License

MIT
