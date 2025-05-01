import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingColumnsToDiaryEntries1746392322000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add improvements column
    await queryRunner.query(
      `ALTER TABLE \`diary_entries\` ADD COLUMN IF NOT EXISTS \`improvements\` JSON NULL`
    );

    // Add mnemonics column
    await queryRunner.query(
      `ALTER TABLE \`diary_entries\` ADD COLUMN IF NOT EXISTS \`mnemonics\` JSON NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the added columns in reverse order
    await queryRunner.query(
      `ALTER TABLE \`diary_entries\` DROP COLUMN \`mnemonics\``
    );
    await queryRunner.query(
      `ALTER TABLE \`diary_entries\` DROP COLUMN \`improvements\``
    );
  }
}
