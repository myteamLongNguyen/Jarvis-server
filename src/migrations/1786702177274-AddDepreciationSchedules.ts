import { MigrationInterface, QueryRunner } from 'typeorm';

const BASE_COLUMNS = `
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
`;

export class AddDepreciationSchedules1786702177274 implements MigrationInterface {
  name = 'AddDepreciationSchedules1786702177274';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE depreciation_method_enum AS ENUM ('DIMINISHING_VALUE','PRIME_COST')`);

    await queryRunner.query(`
      CREATE TABLE "depreciation_schedules" (
        ${BASE_COLUMNS},
        property_id uuid NOT NULL REFERENCES "properties"(id),
        financial_year_start date NOT NULL,
        financial_year_end date NOT NULL,
        method depreciation_method_enum NOT NULL,
        division_40_amount numeric(14,2),
        division_43_amount numeric(14,2),
        total_amount numeric(14,2) NOT NULL,
        source_document_id uuid REFERENCES "documents"(id),
        notes text
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "depreciation_schedules"`);
    await queryRunner.query(`DROP TYPE IF EXISTS depreciation_method_enum`);
  }
}
