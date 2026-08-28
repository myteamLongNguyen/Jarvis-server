import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentExpiryDate1787292046721 implements MigrationInterface {
  name = 'AddDocumentExpiryDate1787292046721';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN "expiry_date" date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "expiry_date"`);
  }
}
