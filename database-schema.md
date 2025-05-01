# TanulBot Database Schema

Below is a diagram of the TanulBot database schema:

```mermaid
erDiagram
    users {
        int id PK
        bigint telegram_id UK
        string first_name
        string last_name
        string username
        string language
        string learning_language
        int points
        boolean is_active
        boolean is_diary_mode
        timestamp last_activity_at
        timestamp created_at
        timestamp updated_at
    }

    chat_messages {
        int id PK
        int user_id FK
        enum role
        text content
        int token_count
        timestamp created_at
    }

    invoices {
        int id PK
        int user_id FK
        string payment_id
        enum subscription_plan
        decimal amount
        enum status
        timestamp expires_at
        string payment_method
        json metadata
        timestamp created_at
    }

    llm_requests {
        int id PK
        int user_id FK
        enum type
        string model_name
        int input_tokens
        int output_tokens
        float audio_seconds
        decimal cost
        json metadata
        timestamp created_at
    }

    vocabulary_entries {
        int id PK
        int user_id FK
        string word
        string translation
        text context
        int error_count
        timestamp last_practiced
        timestamp created_at
        timestamp updated_at
    }

    diary_entries {
        int id PK
        int user_id FK
        text text
        text corrected_text
        json improvements
        json unknown_words
        json mnemonics
        boolean processed
        timestamp created_at
    }

    users ||--o{ chat_messages : "has"
    users ||--o{ invoices : "has"
    users ||--o{ llm_requests : "has"
    users ||--o{ vocabulary_entries : "has"
    users ||--o{ diary_entries : "has"
```

## Tables Explanation

### users

Stores user information, preferences, and learning progress.

### chat_messages

Stores chat history between users and the bot.

### invoices

Records subscription and payment information for users.

### llm_requests

Tracks usage of Large Language Model APIs, including tokens and costs.

### vocabulary_entries

Stores vocabulary words that users are learning, with learning progress.

### diary_entries

Stores user diary entries and their AI-corrected versions.
