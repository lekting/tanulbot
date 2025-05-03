import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTopicStudyResponsesTable1746483900000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create topic_study_responses table
    await queryRunner.query(`
      CREATE TABLE topic_study_responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        text TEXT NOT NULL,
        response TEXT NOT NULL,
        learning_language VARCHAR(10) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
        INDEX idx_telegram_id (telegram_id),
        INDEX idx_learning_language (learning_language),
        INDEX idx_created_at (created_at)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS topic_study_responses`);
  }
}
