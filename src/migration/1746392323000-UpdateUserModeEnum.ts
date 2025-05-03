import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserModeEnum1746392323000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Modify the current_mode enum to include the new topic_study value
    await queryRunner.query(`
      ALTER TABLE users 
      MODIFY COLUMN current_mode ENUM('default', 'practice', 'diary', 'dictation', 'worksheet', 'topic_study') DEFAULT 'default'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to original enum values
    // First reset any topic_study values to default
    await queryRunner.query(`
      UPDATE users 
      SET current_mode = 'default' 
      WHERE current_mode = 'topic_study'
    `);

    // Then modify the column back
    await queryRunner.query(`
      ALTER TABLE users 
      MODIFY COLUMN current_mode ENUM('default', 'practice', 'diary', 'dictation', 'worksheet') DEFAULT 'default'
    `);
  }
}
