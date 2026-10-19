import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives every document the app it belongs to, so the boat's paperwork and the
 * portfolio's can live in one table without surfacing in each other's lists.
 *
 * Everything already filed is property paperwork, so the column defaults to
 * PROPERTIES and existing rows take that value without a separate backfill.
 *
 * The new document types are for the vessel library, which keeps manuals,
 * service records and warranties rather than leases. DEPRECIATION_SCHEDULE is
 * unrelated to the boat: it closes a gap on the property side, where a BMT tax
 * depreciation schedule had to be filed as OTHER.
 */
export class AddDocumentArea1792450000000 implements MigrationInterface {
  name = 'AddDocumentArea1792450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "document_area_enum" AS ENUM ('PROPERTIES', 'ORIAN', 'GENERAL')
    `);
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN "area" "document_area_enum" NOT NULL DEFAULT 'PROPERTIES'
    `);
    // Every list is scoped to one owner and one area, so they index together.
    await queryRunner.query(`
      CREATE INDEX "idx_documents_owner_area" ON "documents" ("owner_id", "area")
    `);

    for (const value of ['MANUAL', 'SERVICE_RECORD', 'WARRANTY', 'DEPRECIATION_SCHEDULE']) {
      await queryRunner.query(`ALTER TYPE "document_type_enum" ADD VALUE IF NOT EXISTS '${value}'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_documents_owner_area"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "area"`);
    await queryRunner.query(`DROP TYPE "document_area_enum"`);
    // Postgres cannot drop a value from an enum type, so the four document
    // types stay. They are unused once nothing references them.
  }
}
