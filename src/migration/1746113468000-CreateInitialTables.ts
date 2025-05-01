import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1746113468000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE users (
        telegram_id BIGINT NOT NULL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NULL,
        username VARCHAR(100) NULL,
        language VARCHAR(10) NOT NULL,
        learning_language VARCHAR(10) NOT NULL,
        points INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        is_diary_mode BOOLEAN NOT NULL DEFAULT FALSE,
        last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_telegram_id (telegram_id),
        INDEX idx_is_active (is_active)
      )
    `);

    // Create chat_messages table
    await queryRunner.query(`
      CREATE TABLE chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        role ENUM('user', 'assistant') NOT NULL,
        content TEXT NOT NULL,
        token_count INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
        INDEX idx_telegram_id (telegram_id)
      )
    `);

    // Create invoices table
    await queryRunner.query(`
      CREATE TABLE invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        subscription_plan ENUM('free', 'basic', 'premium') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL,
        payment_id VARCHAR(255) NULL,
        payment_method VARCHAR(100) NULL,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
        INDEX idx_telegram_id (telegram_id),
        INDEX idx_status (status),
        INDEX idx_expires_at (expires_at)
      )
    `);

    // Create llm_requests table
    await queryRunner.query(`
      CREATE TABLE llm_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        type ENUM('chat', 'audio', 'tts', 'embedding') NOT NULL,
        model_name VARCHAR(100) NOT NULL,
        cost DECIMAL(10,6) NOT NULL,
        input_tokens INT NULL,
        output_tokens INT NULL,
        audio_seconds FLOAT NULL,
        metadata JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
        INDEX idx_telegram_id (telegram_id),
        INDEX idx_type (type),
        INDEX idx_model_name (model_name)
      )
    `);

    // Create vocabulary_entries table
    await queryRunner.query(`
      CREATE TABLE vocabulary_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        word VARCHAR(255) NOT NULL,
        translation VARCHAR(255) NOT NULL,
        context TEXT NULL,
        error_count INT NOT NULL DEFAULT 0,
        last_practiced TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
        INDEX idx_telegram_id (telegram_id),
        INDEX idx_word (word),
        UNIQUE KEY unique_user_word (telegram_id, word)
      )
    `);

    // Create diary_entries table
    await queryRunner.query(`
      CREATE TABLE diary_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        text TEXT NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT FALSE,
        corrected_text TEXT NULL,
        improvements JSON NULL,
        unknown_words JSON NULL,
        mnemonics JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
        INDEX idx_telegram_id (telegram_id),
        INDEX idx_processed (processed)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order to avoid foreign key constraints
    await queryRunner.query(`DROP TABLE IF EXISTS diary_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS vocabulary_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS llm_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS invoices`);
    await queryRunner.query(`DROP TABLE IF EXISTS chat_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
