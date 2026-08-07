import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentStorageFields1784259192438 implements MigrationInterface {
  name = 'AddDocumentStorageFields1784259192438';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "document_storage_provider_enum" AS ENUM ('GOOGLE_DRIVE','SUPABASE')`);

    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN "storage_provider" document_storage_provider_enum NOT NULL DEFAULT 'SUPABASE',
        ADD COLUMN "storage_path" varchar(1000),
        ALTER COLUMN "google_drive_file_id" DROP NOT NULL
    `);

    // Existing rows were all created via the Google Drive metadata-registration flow.
    await queryRunner.query(`
      UPDATE "documents" SET "storage_provider" = 'GOOGLE_DRIVE' WHERE "google_drive_file_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents"
        ALTER COLUMN "google_drive_file_id" SET NOT NULL,
        DROP COLUMN "storage_path",
        DROP COLUMN "storage_provider"
    `);
    await queryRunner.query(`DROP TYPE "document_storage_provider_enum"`);
  }
}
