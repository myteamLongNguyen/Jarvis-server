import { MigrationInterface, QueryRunner } from 'typeorm';

const BASE_COLUMNS = `
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
`;

export class InitJarvisSchema1783066064486 implements MigrationInterface {
  name = 'InitJarvisSchema1783066064486';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // --- Enum types ---
    await queryRunner.query(`CREATE TYPE "property_type_enum" AS ENUM ('COMMERCIAL','RESIDENTIAL','INDUSTRIAL','MIXED_USE','LAND')`);
    await queryRunner.query(`CREATE TYPE "property_status_enum" AS ENUM ('ACTIVE','UNDER_CONTRACT','SOLD','ARCHIVED')`);
    await queryRunner.query(`CREATE TYPE "owning_entity_type_enum" AS ENUM ('COMPANY','TRUST','INDIVIDUAL','SMSF','PARTNERSHIP')`);
    await queryRunner.query(`CREATE TYPE "tenant_entity_type_enum" AS ENUM ('COMPANY','INDIVIDUAL','GOVERNMENT')`);
    await queryRunner.query(`CREATE TYPE "lease_status_enum" AS ENUM ('DRAFT','ACTIVE','HOLDOVER','EXPIRED','TERMINATED')`);
    await queryRunner.query(`CREATE TYPE "rent_frequency_enum" AS ENUM ('MONTHLY','QUARTERLY','ANNUALLY')`);
    await queryRunner.query(`CREATE TYPE "outgoings_recovery_type_enum" AS ENUM ('GROSS','NET','SEMI_GROSS')`);
    await queryRunner.query(`CREATE TYPE "rent_review_mechanism_enum" AS ENUM ('CPI','FIXED_PERCENT','MARKET','HYBRID')`);
    await queryRunner.query(`CREATE TYPE "bond_type_enum" AS ENUM ('BANK_GUARANTEE','CASH','PERSONAL_GUARANTEE')`);
    await queryRunner.query(`CREATE TYPE "rent_review_status_enum" AS ENUM ('SCHEDULED','COMPLETED','DISPUTED','WAIVED')`);
    await queryRunner.query(`CREATE TYPE "invoice_direction_enum" AS ENUM ('INCOMING','OUTGOING')`);
    await queryRunner.query(`CREATE TYPE "invoice_type_enum" AS ENUM ('AGENT_STATEMENT','RENT_INVOICE','MAINTENANCE','REPAIR','RATES','LAND_TAX','INSURANCE','UTILITIES','MANAGEMENT_FEE','LEASING_COMMISSION','OWNERS_CORP','LEGAL','CAPITAL_WORKS','OTHER')`);
    await queryRunner.query(`CREATE TYPE "invoice_status_enum" AS ENUM ('UNSORTED','CLASSIFIED','APPROVED','PAID','OVERDUE','DISPUTED','WRITTEN_OFF')`);
    await queryRunner.query(`CREATE TYPE "invoice_classified_by_enum" AS ENUM ('USER','AI','RULE')`);
    await queryRunner.query(`CREATE TYPE "property_expense_category_enum" AS ENUM ('RATES','LAND_TAX','INSURANCE','REPAIRS','MAINTENANCE','MANAGEMENT_FEE','LEASING_COMMISSION','LEGAL','UTILITIES','OWNERS_CORP','CAPITAL_WORKS','INTEREST','DEPRECIATION','OTHER')`);
    await queryRunner.query(`CREATE TYPE "rental_income_status_enum" AS ENUM ('EXPECTED','INVOICED','RECEIVED','OVERDUE','WRITTEN_OFF')`);
    await queryRunner.query(`CREATE TYPE "valuation_type_enum" AS ENUM ('BANK','INDEPENDENT','DESKTOP','OWNER_ESTIMATE','COUNCIL')`);
    await queryRunner.query(`CREATE TYPE "maintenance_category_enum" AS ENUM ('HVAC','PLUMBING','ELECTRICAL','STRUCTURAL','COMPLIANCE','GROUNDS','CLEANING','OTHER')`);
    await queryRunner.query(`CREATE TYPE "document_type_enum" AS ENUM ('LEASE','LEASE_VARIATION','RENT_REVIEW_NOTICE','INVOICE','PROPERTY_STATEMENT','COMMISSION_INVOICE','VALUATION','PHOTO','SITE_PLAN','COMPLIANCE_CERT','INSURANCE_POLICY','RATES_NOTICE','CORRESPONDENCE','OTHER')`);
    await queryRunner.query(`CREATE TYPE "document_ingestion_status_enum" AS ENUM ('PENDING','INGESTED','FAILED','SKIPPED')`);
    await queryRunner.query(`CREATE TYPE "document_classification_status_enum" AS ENUM ('UNCLASSIFIED','AUTO_CLASSIFIED','USER_CONFIRMED')`);

    // --- owning_entities ---
    await queryRunner.query(`
      CREATE TABLE "owning_entities" (
        ${BASE_COLUMNS},
        legal_name varchar(150) NOT NULL,
        entity_type owning_entity_type_enum NOT NULL,
        abn varchar(20),
        acn varchar(20),
        notes text
      )
    `);

    // --- managing_agents ---
    await queryRunner.query(`
      CREATE TABLE "managing_agents" (
        ${BASE_COLUMNS},
        name varchar(150) NOT NULL,
        contact_name varchar(150),
        email varchar(255),
        phone varchar(50),
        notes text
      )
    `);

    // --- tenants ---
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        ${BASE_COLUMNS},
        name varchar(150) NOT NULL,
        entity_type tenant_entity_type_enum NOT NULL,
        abn varchar(20),
        contact_name varchar(150),
        email varchar(255),
        phone varchar(50),
        notes text
      )
    `);

    // --- properties ---
    await queryRunner.query(`
      CREATE TABLE "properties" (
        ${BASE_COLUMNS},
        name varchar(150) NOT NULL,
        address_line_1 varchar(255) NOT NULL,
        address_line_2 varchar(255),
        suburb varchar(100) NOT NULL,
        state varchar(50) NOT NULL,
        postcode varchar(20) NOT NULL,
        country varchar(2) NOT NULL DEFAULT 'AU',
        property_type property_type_enum NOT NULL,
        status property_status_enum NOT NULL DEFAULT 'ACTIVE',
        purchase_date date NOT NULL,
        purchase_price numeric(14,2) NOT NULL,
        purchase_costs numeric(14,2) NOT NULL,
        purchase_currency varchar(3) NOT NULL DEFAULT 'AUD',
        land_area_sqm numeric(14,2),
        building_area_sqm numeric(14,2),
        owned_by_entity_id uuid REFERENCES "owning_entities"(id),
        managing_agent_id uuid REFERENCES "managing_agents"(id),
        notes text
      )
    `);

    // --- documents ---
    await queryRunner.query(`
      CREATE TABLE "documents" (
        ${BASE_COLUMNS},
        property_id uuid REFERENCES "properties"(id),
        document_type document_type_enum NOT NULL,
        title varchar(255) NOT NULL,
        description text,
        document_date date NOT NULL,
        google_drive_file_id varchar(255) NOT NULL,
        google_drive_folder_path varchar(500),
        mime_type varchar(150),
        file_size_bytes bigint,
        checksum_sha256 varchar(64),
        ingestion_status document_ingestion_status_enum NOT NULL DEFAULT 'PENDING',
        classification_status document_classification_status_enum NOT NULL DEFAULT 'UNCLASSIFIED',
        ingested_at timestamptz,
        classified_at timestamptz
      )
    `);

    // --- leases ---
    await queryRunner.query(`
      CREATE TABLE "leases" (
        ${BASE_COLUMNS},
        property_id uuid NOT NULL REFERENCES "properties"(id),
        tenant_id uuid NOT NULL REFERENCES "tenants"(id),
        status lease_status_enum NOT NULL DEFAULT 'DRAFT',
        commencement_date date NOT NULL,
        expiry_date date NOT NULL,
        initial_term_months int NOT NULL,
        option_terms jsonb,
        base_rent_annual numeric(14,2) NOT NULL,
        rent_frequency rent_frequency_enum NOT NULL,
        outgoings_recovery_type outgoings_recovery_type_enum NOT NULL,
        rent_review_mechanism rent_review_mechanism_enum NOT NULL,
        rent_review_value numeric(6,3),
        next_review_date date,
        rent_free_period_months int,
        bond_amount numeric(14,2) NOT NULL,
        bond_type bond_type_enum NOT NULL,
        notes text
      )
    `);

    // --- rent_reviews ---
    await queryRunner.query(`
      CREATE TABLE "rent_reviews" (
        ${BASE_COLUMNS},
        lease_id uuid NOT NULL REFERENCES "leases"(id),
        review_date date NOT NULL,
        review_type rent_review_mechanism_enum NOT NULL,
        old_rent_annual numeric(14,2) NOT NULL,
        new_rent_annual numeric(14,2) NOT NULL,
        percent_change numeric(6,3) NOT NULL,
        status rent_review_status_enum NOT NULL DEFAULT 'SCHEDULED',
        notes text,
        source_document_id uuid REFERENCES "documents"(id)
      )
    `);

    // --- invoices ---
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        ${BASE_COLUMNS},
        property_id uuid REFERENCES "properties"(id),
        direction invoice_direction_enum NOT NULL,
        invoice_type invoice_type_enum NOT NULL,
        invoice_number varchar(100),
        issuer_name varchar(150) NOT NULL,
        issuer_abn varchar(20),
        issue_date date NOT NULL,
        due_date date,
        period_start date,
        period_end date,
        subtotal numeric(14,2) NOT NULL,
        gst_amount numeric(14,2) NOT NULL,
        total_amount numeric(14,2) NOT NULL,
        currency varchar(3) NOT NULL DEFAULT 'AUD',
        status invoice_status_enum NOT NULL DEFAULT 'UNSORTED',
        paid_date date,
        paid_amount numeric(14,2),
        classification_confidence numeric(4,3),
        classified_by invoice_classified_by_enum,
        source_document_id uuid REFERENCES "documents"(id),
        notes text
      )
    `);

    // --- invoice_line_items ---
    await queryRunner.query(`
      CREATE TABLE "invoice_line_items" (
        ${BASE_COLUMNS},
        invoice_id uuid NOT NULL REFERENCES "invoices"(id),
        line_number int NOT NULL,
        description varchar(500) NOT NULL,
        category property_expense_category_enum NOT NULL,
        property_id uuid REFERENCES "properties"(id),
        quantity numeric(14,2) NOT NULL DEFAULT 1,
        unit_amount numeric(14,2) NOT NULL,
        amount numeric(14,2) NOT NULL,
        gst_amount numeric(14,2) NOT NULL,
        notes text
      )
    `);

    // --- property_statements ---
    await queryRunner.query(`
      CREATE TABLE "property_statements" (
        ${BASE_COLUMNS},
        property_id uuid NOT NULL REFERENCES "properties"(id),
        managing_agent_id uuid NOT NULL REFERENCES "managing_agents"(id),
        statement_date date NOT NULL,
        period_start date NOT NULL,
        period_end date NOT NULL,
        gross_income numeric(14,2) NOT NULL,
        total_expenses numeric(14,2) NOT NULL,
        net_to_owner numeric(14,2) NOT NULL,
        opening_balance numeric(14,2) NOT NULL,
        closing_balance numeric(14,2) NOT NULL,
        source_invoice_id uuid REFERENCES "invoices"(id),
        source_document_id uuid REFERENCES "documents"(id),
        notes text
      )
    `);

    // --- rental_incomes ---
    await queryRunner.query(`
      CREATE TABLE "rental_incomes" (
        ${BASE_COLUMNS},
        property_id uuid NOT NULL REFERENCES "properties"(id),
        lease_id uuid REFERENCES "leases"(id),
        period_start date NOT NULL,
        period_end date NOT NULL,
        gross_amount numeric(14,2) NOT NULL,
        outgoings_reimbursed numeric(14,2) NOT NULL DEFAULT 0,
        gst_amount numeric(14,2) NOT NULL DEFAULT 0,
        agent_commission numeric(14,2) NOT NULL DEFAULT 0,
        other_deductions numeric(14,2) NOT NULL DEFAULT 0,
        net_amount numeric(14,2) NOT NULL,
        amount_received numeric(14,2),
        received_date date,
        status rental_income_status_enum NOT NULL DEFAULT 'EXPECTED',
        source_invoice_id uuid REFERENCES "invoices"(id),
        source_statement_id uuid REFERENCES "property_statements"(id),
        notes text
      )
    `);

    // --- property_expenses ---
    await queryRunner.query(`
      CREATE TABLE "property_expenses" (
        ${BASE_COLUMNS},
        property_id uuid NOT NULL REFERENCES "properties"(id),
        expense_date date NOT NULL,
        period_start date,
        period_end date,
        category property_expense_category_enum NOT NULL,
        description varchar(500) NOT NULL,
        amount numeric(14,2) NOT NULL,
        gst_amount numeric(14,2) NOT NULL DEFAULT 0,
        currency varchar(3) NOT NULL DEFAULT 'AUD',
        recoverable_from_tenant boolean NOT NULL DEFAULT false,
        recovered_amount numeric(14,2) NOT NULL DEFAULT 0,
        paid_date date,
        source_invoice_id uuid REFERENCES "invoices"(id),
        source_invoice_line_item_id uuid REFERENCES "invoice_line_items"(id),
        source_document_id uuid REFERENCES "documents"(id),
        notes text
      )
    `);

    // --- valuations ---
    await queryRunner.query(`
      CREATE TABLE "valuations" (
        ${BASE_COLUMNS},
        property_id uuid NOT NULL REFERENCES "properties"(id),
        valuation_date date NOT NULL,
        valuation_amount numeric(14,2) NOT NULL,
        valuation_type valuation_type_enum NOT NULL,
        valuer varchar(150),
        purpose varchar(255),
        source_document_id uuid REFERENCES "documents"(id),
        notes text
      )
    `);

    // --- maintenance_records ---
    await queryRunner.query(`
      CREATE TABLE "maintenance_records" (
        ${BASE_COLUMNS},
        property_id uuid NOT NULL REFERENCES "properties"(id),
        service_date date NOT NULL,
        category maintenance_category_enum NOT NULL,
        vendor varchar(150) NOT NULL,
        description varchar(500) NOT NULL,
        cost numeric(14,2) NOT NULL,
        gst_amount numeric(14,2) NOT NULL DEFAULT 0,
        currency varchar(3) NOT NULL DEFAULT 'AUD',
        next_service_due_date date,
        source_invoice_id uuid REFERENCES "invoices"(id),
        source_expense_id uuid REFERENCES "property_expenses"(id),
        source_document_id uuid REFERENCES "documents"(id),
        notes text
      )
    `);

    // --- document_chunks (placeholder for future embeddings, no entity/service yet) ---
    await queryRunner.query(`
      CREATE TABLE "document_chunks" (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id uuid NOT NULL REFERENCES "documents"(id),
        chunk_index int NOT NULL,
        content text NOT NULL,
        embedding vector(1536),
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // --- Indexes ---
    await queryRunner.query(`CREATE INDEX "idx_properties_owner_status" ON "properties" (owner_id, status)`);
    await queryRunner.query(`CREATE INDEX "idx_leases_property_status" ON "leases" (property_id, status)`);
    await queryRunner.query(`CREATE INDEX "idx_leases_expiry_date" ON "leases" (expiry_date)`);
    await queryRunner.query(`CREATE INDEX "idx_rent_reviews_next_review_date" ON "rent_reviews" (review_date)`);
    await queryRunner.query(`CREATE INDEX "idx_invoices_owner_status" ON "invoices" (owner_id, status)`);
    await queryRunner.query(`CREATE INDEX "idx_invoices_property_issue_date" ON "invoices" (property_id, issue_date)`);
    await queryRunner.query(`CREATE INDEX "idx_invoices_due_date_open" ON "invoices" (due_date) WHERE status IN ('APPROVED','OVERDUE')`);
    await queryRunner.query(`CREATE INDEX "idx_invoice_line_items_invoice" ON "invoice_line_items" (invoice_id)`);
    await queryRunner.query(`CREATE INDEX "idx_invoice_line_items_property" ON "invoice_line_items" (property_id)`);
    await queryRunner.query(`CREATE INDEX "idx_rental_incomes_property_period_start" ON "rental_incomes" (property_id, period_start)`);
    await queryRunner.query(`CREATE INDEX "idx_property_expenses_property_expense_date" ON "property_expenses" (property_id, expense_date)`);
    await queryRunner.query(`CREATE INDEX "idx_property_expenses_category" ON "property_expenses" (category)`);
    await queryRunner.query(`CREATE INDEX "idx_documents_property_document_type" ON "documents" (property_id, document_type)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_documents_google_drive_file_id" ON "documents" (google_drive_file_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "document_chunks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "maintenance_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "valuations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "property_expenses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rental_incomes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "property_statements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoice_line_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rent_reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "properties"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "managing_agents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "owning_entities"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "document_classification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_ingestion_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "document_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "maintenance_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "valuation_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rental_income_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "property_expense_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invoice_classified_by_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invoice_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invoice_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invoice_direction_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rent_review_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "bond_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rent_review_mechanism_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "outgoings_recovery_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rent_frequency_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lease_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tenant_entity_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "owning_entity_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "property_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "property_type_enum"`);
  }
}
