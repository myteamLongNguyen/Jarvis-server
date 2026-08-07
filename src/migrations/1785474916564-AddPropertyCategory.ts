import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyCategory1785474916564 implements MigrationInterface {
  name = 'AddPropertyCategory1785474916564';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "property_category_enum" AS ENUM ('INVESTMENT','PERSONAL')`);

    await queryRunner.query(`
      ALTER TABLE "properties"
        ADD COLUMN "category" property_category_enum NOT NULL DEFAULT 'INVESTMENT'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "category"`);
    await queryRunner.query(`DROP TYPE "property_category_enum"`);
  }
}
