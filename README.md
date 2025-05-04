# TanulBot - Multilingual Learning Telegram Bot

A Telegram bot for language learning with AI assistance, dictation practice, and Anki deck generation. Currently supports multiple languages.

> **Vibe Coding Project**: This project was created with the assistance of AI tools, demonstrating how AI can be leveraged to build practical language learning applications.

## Features

- 🗣 **Language Practice**: Chat in your target language with the bot and receive corrections
- ✍️ **Dictation Practice**: Listen to words and type them for points
- 📄 **PDF Processing**: Upload text in your target language to extract vocabulary with OCR support
- 🎯 **Anki Integration**: Auto-generate Anki decks with word pairs in your languages
- 🏆 **Progress Tracking**: Track learning progress with levels and points
- 🔄 **Speech Recognition**: Convert spoken language to text for pronunciation practice
- 🔍 **Grammar Explanations**: Get detailed explanations of grammar rules
- 📝 **Worksheets**: Generate practice worksheets for handwriting and character recognition
- 📊 **Vocabulary Analytics**: View statistics on most common words and learning progress
- 📱 **Multi-platform**: Access via Telegram on mobile or desktop devices
- 🌐 **Offline Mode**: Download generated resources for offline study
- 🌍 **Multiple Languages**: Support for various languages, not limited to Hungarian

## MySQL Database Setup

TanulBot uses MySQL for data persistence. Follow these steps to set up the database:

1. Install MySQL Server 8.0+ on your system
2. Create a new database and user:

```sql
CREATE DATABASE tanulbot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tanulbot_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON tanulbot.* TO 'tanulbot_user'@'localhost';
FLUSH PRIVILEGES;
```

3. Update your `.env` file with the database credentials:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tanulbot
DB_USER=tanulbot_user
DB_PASSWORD=your_secure_password
```

4. Run the database migration:

```bash
pnpm migrate
```

### Migrating Existing Data

If you're upgrading from an older version of TanulBot that used in-memory storage, you can migrate existing data to MySQL:

```bash
# First, initialize the database schema
pnpm migrate

# Then, migrate existing data from memory to MySQL
pnpm migrate-data
```

The migration process will:

- Create user records in the database
- Migrate user points, language preferences, and activity status
- Transfer vocabulary entries with learning progress
- Move chat history with message content
- Migrate diary entries with corrections
- Transfer LLM usage data if available

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
├── entity/        # TypeORM entity definitions
├── handlers/      # Message and event handlers
├── services/      # Core services
├── store/         # State management
│   └── repositories/ # Database repositories
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── workers/       # Background workers
├── index.ts       # Application entry point
├── migrate.ts     # Database migration utility
└── migrate-data.ts# Data migration utility
tessdata/          # Tesseract OCR language data
create-anki-deck.py # Python script for Anki deck generation
```

## Installation

1. Clone this repository
2. Install dependencies:

```bash
pnpm install
```

3. Copy `env.template` to `.env` and add your API keys and configuration
4. Run the database migration:

```bash
pnpm migrate
```

5. Start the development server:

```bash
pnpm dev
```

## Production Deployment

1. Build the production version:

```bash
pnpm build
```

2. Start the production server:

```bash
pnpm start
```

## Environment Variables

See `env.template` for required environment variables.

## Tesseract OCR Setup

For PDF processing and text extraction, this project uses Tesseract OCR which requires language data:

1. Download language data files from [tesseract-ocr/tessdata](https://github.com/tesseract-ocr/tessdata) based on the languages you want to support:

   - Download traineddata files for your target languages (see [full language list](https://github.com/tesseract-ocr/tessdata))
   - Example for Hungarian and German:

   ```
   # On Windows
   curl -L -o tessdata/hun.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/hun.traineddata
   curl -L -o tessdata/deu.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/deu.traineddata
   curl -L -o tessdata/rus.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/rus.traineddata

   # On Linux/macOS
   wget -P tessdata/ https://github.com/tesseract-ocr/tessdata/raw/main/hun.traineddata
   wget -P tessdata/ https://github.com/tesseract-ocr/tessdata/raw/main/deu.traineddata
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
- `spa` - Spanish
- `por` - Portuguese
- `jpn` - Japanese
- `kor` - Korean
- `chi_sim` - Chinese Simplified

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
   python create-anki-deck.py word_pairs.json output.apkg [--deck-name "Language Learning Deck"]
   ```

   Parameters:

   - `word_pairs.json`: JSON file containing word pairs in format `[{"front": "foreign word", "back": "translation"}]`
   - `output.apkg`: Output Anki package file
   - `--deck-name`: Optional name for the deck (default: "Language Learning Deck")
   - `--css-file`: Optional CSS file for custom card styling
   - `--quiet`: Suppress output messages

## Usage

1. Start a chat with the bot on Telegram
2. Select your target language and native language
3. Use the keyboard menu to select an activity
4. Upload PDFs in your target language to extract words
5. Practice with dictation or conversation
6. Download generated Anki decks for offline study
7. Use speech recognition for pronunciation practice
8. Request grammar explanations on specific topics

## License

MIT

## Docker Setup

TanulBot supports containerized deployment using Docker. Follow these steps to run the bot in Docker:

1. Clone this repository and navigate to the project directory
2. Create required directories:

   ```bash
   mkdir -p tessdata temp
   ```

3. Download Tesseract language data to the tessdata directory (example for Hungarian, German, and Russian):

   ```bash
   # On Windows
   curl -L -o tessdata/hun.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/hun.traineddata
   curl -L -o tessdata/deu.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/deu.traineddata
   curl -L -o tessdata/rus.traineddata https://github.com/tesseract-ocr/tessdata/raw/main/rus.traineddata

   # On Linux/macOS
   wget -P tessdata/ https://github.com/tesseract-ocr/tessdata/raw/main/hun.traineddata
   wget -P tessdata/ https://github.com/tesseract-ocr/tessdata/raw/main/deu.traineddata
   wget -P tessdata/ https://github.com/tesseract-ocr/tessdata/raw/main/rus.traineddata
   ```

4. Edit the `docker.env` file with your Telegram Bot token, OpenAI API key, and other configuration:

   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   OPENAI_API_KEY=your_openai_api_key
   ```

5. Start the containers with Docker Compose:

   ```bash
   docker-compose up -d
   ```

6. To see the logs:

   ```bash
   docker-compose logs -f
   ```

7. To stop the containers:
   ```bash
   docker-compose down
   ```

### Docker Volumes

The Docker setup uses the following volumes:

- `mysql-data`: Persistent storage for the MySQL database
- `./tessdata:/app/tessdata`: Maps your local tessdata directory into the container
- `./temp:/app/temp`: Maps a temporary directory for file processing

### Docker Environment Variables

All environment variables are stored in the `docker.env` file. For a complete list of available options, see the comments in that file.
