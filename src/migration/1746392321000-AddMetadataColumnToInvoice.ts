import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetadataColumnToInvoice1746392321000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invoices\` ADD COLUMN \`metadata\` JSON NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`invoices\` DROP COLUMN \`metadata\``
    );
  }
}
