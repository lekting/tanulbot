import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserMode1746113468010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First add the new current_mode column as an enum
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN current_mode ENUM('default', 'practice', 'diary', 'dictation', 'worksheet') 
      DEFAULT 'default' 
      AFTER is_active;
    `);

    // Migrate existing users that are in diary mode to have current_mode = 'diary'
    await queryRunner.query(`
      UPDATE users 
      SET current_mode = 'diary' 
      WHERE is_diary_mode = 1;
    `);

    // Set users that are active but not in diary mode to practice mode
    await queryRunner.query(`
      UPDATE users 
      SET current_mode = 'practice' 
      WHERE is_active = 1 AND is_diary_mode = 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore is_diary_mode
    await queryRunner.query(`
      UPDATE users
      SET is_diary_mode = 1
      WHERE current_mode = 'diary';
    `);

    // Remove the current_mode column
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN current_mode;
    `);
  }
}
