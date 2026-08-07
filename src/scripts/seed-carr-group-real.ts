/**
 * Real-data seed script for the Carr Group property portfolio, replacing the old
 * placeholder/example data (formerly produced by seed-carr-group.ts, now removed).
 *
 * Source: documents supplied by Andrew, read from
 *   C:\Users\Long.Nguyen\Downloads\properties\
 * covering 10 properties (7 investment, 3 personal-use) — property profile docs,
 * agent statements (Nichols Crowder / Jacobs & Lowe Bennetts), leases/AFLs, vendor
 * invoices, a BMT depreciation schedule, a rent-review letter, an exclusive sale
 * authority, a management authority, and utility bills.
 *
 * Every record is scoped to ownerId = the real Supabase user (see OWNER_ID below).
 * This script WIPES all existing rows in every domain table for ALL owners before
 * seeding (this DB only ever held demo/placeholder data — confirmed with the user)
 * and then inserts the real data.
 *
 * Conventions carried over from the old placeholder script:
 *   - "PLACEHOLDER:" in a notes field = a required (NOT NULL) column with NO
 *     source value anywhere in the supplied documents. A dummy sentinel is used
 *     (purchaseDate 1900-01-01, purchasePrice/purchaseCosts $1, lease
 *     commencementDate 1900-01-01 / expiryDate 1900-01-02 / initialTermMonths 0 /
 *     bondAmount 0 / bondType BANK_GUARANTEE) purely to satisfy the schema — never
 *     trust these values. Search for "PLACEHOLDER:" before relying on any of them.
 *   - "DERIVED:" = a real figure computed from real source figures (e.g.
 *     annualising a monthly rent), with the calculation shown.
 *   - "CONFLICT:" = the source documents disagree with each other; the note
 *     explains which value was used and why.
 *
 * Run with:
 *   SEED_OWNER_ID=<supabase-user-uuid> npm run seed:carr-group-real
 */
import dataSource from '../core/database/data-source';
import { PropertyOwningEntity, OwningEntityType } from '../entities/property-owning-entity.entity';
import { ManagingAgentEntity } from '../entities/managing-agent.entity';
import { TenantEntity, TenantEntityType } from '../entities/tenant.entity';
import { PropertyEntity, PropertyType, PropertyStatus, PropertyCategory } from '../entities/property.entity';
import {
  LeaseEntity,
  LeaseStatus,
  RentFrequency,
  OutgoingsRecoveryType,
  BondType,
  RentReviewMechanism,
} from '../entities/lease.entity';
import { RentReviewEntity, RentReviewStatus } from '../entities/rent-review.entity';
import { InvoiceEntity, InvoiceDirection, InvoiceType, InvoiceStatus } from '../entities/invoice.entity';
import { PropertyStatementEntity } from '../entities/property-statement.entity';
import { RentalIncomeEntity, RentalIncomeStatus } from '../entities/rental-income.entity';
import { PropertyExpenseEntity, PropertyExpenseCategory } from '../entities/property-expense.entity';
import { ValuationEntity, ValuationType } from '../entities/valuation.entity';
import { MaintenanceRecordEntity, MaintenanceCategory } from '../entities/maintenance-record.entity';
import { DocumentEntity, DocumentType } from '../entities/document.entity';
import { EntityTarget, ObjectLiteral, Repository } from 'typeorm';

const ownerId = process.env.SEED_OWNER_ID || process.argv[2] || 'b7b741b8-ddf0-4e36-a442-e72571bf14b8';

async function findOrCreate<T extends ObjectLiteral>(
  repo: Repository<T>,
  where: Partial<T>,
  data: Partial<T>,
  label: string,
): Promise<T> {
  const existing = await repo.findOne({ where: { ...where, ownerId } as any });
  if (existing) {
    console.log(`  = ${label} already exists, skipping`);
    return existing;
  }
  const created = repo.create({ ...data, ownerId } as any);
  const saved = await repo.save(created);
  console.log(`  + created ${label}`);
  return saved as unknown as T;
}

// Deep-past sentinel used only when a REQUIRED date/number has no source value anywhere.
const PLACEHOLDER_DATE = '1900-01-01';

async function wipeExistingData(): Promise<void> {
  console.log('Wiping existing (placeholder) data from all domain tables...\n');
  // Children before parents (FK-safe order).
  const tables = [
    'maintenance_records',
    'rental_incomes',
    'property_expenses',
    'property_statements',
    'invoice_line_items',
    'invoices',
    'rent_reviews',
    'leases',
    'valuations',
    'documents',
    'properties',
    'tenants',
    'managing_agents',
    'owning_entities',
  ];
  for (const table of tables) {
    await dataSource.query(`DELETE FROM ${table}`);
  }
  console.log('Wipe complete.\n');
}

async function main() {
  await dataSource.initialize();
  console.log(`Seeding REAL Carr Group data for owner ${ownerId}...\n`);

  await wipeExistingData();

  const owningEntityRepo = dataSource.getRepository(PropertyOwningEntity);
  const agentRepo = dataSource.getRepository(ManagingAgentEntity);
  const tenantRepo = dataSource.getRepository(TenantEntity);
  const propertyRepo = dataSource.getRepository(PropertyEntity);
  const leaseRepo = dataSource.getRepository(LeaseEntity);
  const rentReviewRepo = dataSource.getRepository(RentReviewEntity);
  const invoiceRepo = dataSource.getRepository(InvoiceEntity);
  const statementRepo = dataSource.getRepository(PropertyStatementEntity);
  const rentalIncomeRepo = dataSource.getRepository(RentalIncomeEntity);
  const expenseRepo = dataSource.getRepository(PropertyExpenseEntity);
  const valuationRepo = dataSource.getRepository(ValuationEntity);
  const maintenanceRepo = dataSource.getRepository(MaintenanceRecordEntity);
  const documentRepo = dataSource.getRepository(DocumentEntity);

  // =========================================================================
  // Owning entities
  // =========================================================================
  console.log('Owning entities');
  const carrHoldings = await findOrCreate(
    owningEntityRepo,
    { legalName: 'A & H Carr Holdings Pty Ltd ATF Carr Family Trust' },
    {
      legalName: 'A & H Carr Holdings Pty Ltd ATF Carr Family Trust',
      entityType: OwningEntityType.TRUST,
      abn: '74245455451',
      acn: '104520603',
      notes:
        'Trustee company A & H Carr Holdings Pty Ltd, trustee for the Carr Family Trust. Registered/mailing ' +
        'address given inconsistently across source documents as both "27 Watts Parade, Mount Eliza VIC 3930" ' +
        'and "PO Box 289, Mount Eliza VIC 3930" — likely a street address vs. postal address, not a real conflict. ' +
        'Contacts: Andrew Carr (andrew@carrholdings.com.au, phone shown as both +61412521135 and 0412520011 across ' +
        'documents) and Helen Carr (helen@carrholdings.com.au). Some agent-statement paperwork misspells the ABN/ACN ' +
        'qualifier as "AFT" instead of "ATF" — treated as a typo, same entity. ' +
        'Sources: RAYL1 Authority.pdf, Carbine Way Exclusive Sale Authority, multiple Nichols Crowder/Jacobs & Lowe ' +
        'Bennetts statements.',
    },
    'owning entity: A & H Carr Holdings ATF Carr Family Trust',
  );

  const whitehaven = await findOrCreate(
    owningEntityRepo,
    { legalName: 'Whitehaven Global Securities Pty Ltd' },
    {
      legalName: 'Whitehaven Global Securities Pty Ltd',
      entityType: OwningEntityType.COMPANY,
      notes:
        'Owner of 5/177-179 Mornington Tyabb Road per all Nichols Crowder statements (spelled "Whitehaven Gobal ' +
        'Securities" — typo — on the 7 monthly statements, correctly "Global" on the EOY statement). ABN/ACN not ' +
        'present in any supplied source document. Mailing address given as both "PO Box 289, Mount Eliza VIC 3930" ' +
        '(EOY statement) and "27 Watts Parade, Mount Eliza VIC 3930" (monthly statements).',
    },
    'owning entity: Whitehaven Global Securities',
  );

  // =========================================================================
  // Managing agents
  // =========================================================================
  console.log('\nManaging agents');
  const cbre = await findOrCreate(
    agentRepo,
    { name: 'CBRE (V) Pty Ltd' },
    {
      name: 'CBRE (V) Pty Ltd',
      email: 'ssc.cof.cashapp.pac@cbre.com',
      phone: '61 3 8621 3333',
      notes:
        'ABN 15 083 694 357. Acted as co-leasing agent (with Jacobs & Lowe Bennetts, 50/50 split) for the 996 ' +
        'Nepean Highway / Services Australia lease. Commission invoice 41AT10013788. Not an ongoing managing agent ' +
        '— no property is linked to CBRE as managingAgentId.',
    },
    'managing agent: CBRE (V) Pty Ltd',
  );

  const jacobsLowe = await findOrCreate(
    agentRepo,
    { name: 'Jacobs & Lowe Bennetts Pty Ltd' },
    {
      name: 'Jacobs & Lowe Bennetts Pty Ltd',
      contactName: 'Kerryn Keogh (accounts) / Jeremy Lewis, Gina Fyfe (leasing & sales)',
      email: 'accounts@jlbre.com.au',
      phone: '03-5976 5900',
      notes:
        'ABN 92 239 541 754, ACN 114 504 237, ATF JLB Trust. 160B Main Street, Mornington VIC 3931. Co-leasing ' +
        'agent for 996 Nepean Highway (commission invoice 39519573, 50% split). Current managing agent for Carbine ' +
        'Way (from ~Dec 2025) and Raylee Place (appointed via Exclusive Commercial Property Management Authority ' +
        'RAYL1, signed 23/06/2026, commission 3.91% of gross annual rent), replacing Nichols Crowder on both. Also ' +
        'listing agent on the Carbine Way Exclusive Sale Authority.',
    },
    'managing agent: Jacobs & Lowe Bennetts Pty Ltd',
  );

  const nicholsCrowder = await findOrCreate(
    agentRepo,
    { name: 'Nichols Crowder (Carrum Downs) Pty Ltd' },
    {
      name: 'Nichols Crowder (Carrum Downs) Pty Ltd',
      contactName: 'Cristy Gatto',
      email: 'remittance@nicholscrowder.au',
      phone: '03-9775 1535',
      notes:
        'ABN 71 509 546 720, ACN 125 199 993. 1 Colemans Road, Carrum Downs VIC 3201. Email domain shown as both ' +
        '"nicholscrowder.com" (statements up to ~June 2026) and "nicholscrowder.au" (statements from ~July 2026 ' +
        'onward) — likely a domain migration. Managing agent for 5/177-179 Mornington Tyabb Road, 6 Elite Way, ' +
        '2&3/47 Wangara Road; was previously the managing agent for Carbine Way (Jul-Oct 2025, superseded by ' +
        'Jacobs & Lowe Bennetts) and Raylee Place (through June 2026, superseded by Jacobs & Lowe Bennetts).',
    },
    'managing agent: Nichols Crowder (Carrum Downs) Pty Ltd',
  );

  // =========================================================================
  // Tenants
  // =========================================================================
  console.log('\nTenants');
  const servicesAustralia = await findOrCreate(
    tenantRepo,
    { name: 'Commonwealth of Australia represented by Services Australia' },
    {
      name: 'Commonwealth of Australia represented by Services Australia',
      entityType: TenantEntityType.GOVERNMENT,
      contactName: 'JLL - National Transaction Manager (Tenant\'s Representative)',
      email: 'DHSleasing.Csaus@ap.jll.com',
      phone: '(02) 6248 7501',
      notes:
        'Tenant under the now-EXECUTED Lease for 996 Nepean Highway, Mornington (Execution Version dated ' +
        '29.06.26). Address for service: Level 1, South Tower, 6 Brindabella Circuit, Canberra Airport ACT 2609. ' +
        'No ABN disclosed for the Tenant in the lease documents (only the Landlord\'s ABN appears).',
    },
    'tenant: Commonwealth of Australia (Services Australia)',
  );

  const coastcare = await findOrCreate(
    tenantRepo,
    { name: 'Coastcare Medical Equipment Hire & Sales Pty Ltd' },
    {
      name: 'Coastcare Medical Equipment Hire & Sales Pty Ltd',
      entityType: TenantEntityType.COMPANY,
      notes: 'Tenant at 5/177-179 Mornington Tyabb Road per all 7 Nichols Crowder monthly statements + EOY statement.',
    },
    'tenant: Coastcare Medical Equipment Hire & Sales',
  );

  const rawTravel = await findOrCreate(
    tenantRepo,
    { name: 'Raw Travel Pty Ltd' },
    {
      name: 'Raw Travel Pty Ltd',
      entityType: TenantEntityType.COMPANY,
      notes: 'Tenant at 6 & 9 / 26-28 Carbine Way, Mornington, per property profile, both agent statements, and the rent review letter.',
    },
    'tenant: Raw Travel Pty Ltd',
  );

  const octagon = await findOrCreate(
    tenantRepo,
    { name: 'Octagon Removals and Storage Pty Ltd' },
    {
      name: 'Octagon Removals and Storage Pty Ltd',
      entityType: TenantEntityType.COMPANY,
      notes: 'Tenant at 6 Elite Way, Mornington, per property profile and both agent statements.',
    },
    'tenant: Octagon Removals and Storage',
  );

  const threadGroup = await findOrCreate(
    tenantRepo,
    { name: 'Thread Group Australia Pty Ltd ATF Trust' },
    {
      name: 'Thread Group Australia Pty Ltd ATF Trust',
      entityType: TenantEntityType.COMPANY,
      notes:
        'Tenant at 2 & 3 / 47 Wangara Road, Cheltenham per agent statements (name shown only as "Thread Group ' +
        'Australia Pty Ltd ATF Trust" — the specific trust name is not spelled out anywhere; property profile ' +
        'calls it simply "Thread Group Australia"). NOTE: a master summary document also names "Thread Group ' +
        'Australia" as the tenant at Vale Road, Moss Vale, but that name never actually appears in any Vale Road ' +
        'source document supplied — see the Vale Road property notes below; no lease/tenant link was created for ' +
        'Vale Road pending clarification.',
    },
    'tenant: Thread Group Australia',
  );

  const amxSuperstores = await findOrCreate(
    tenantRepo,
    { name: 'AMX Superstores Pty Ltd' },
    {
      name: 'AMX Superstores Pty Ltd',
      entityType: TenantEntityType.COMPANY,
      notes:
        'Tenant at 1 Raylee Place, Lynbrook. CONFLICT: named "AMX Superstores Pty Ltd" on the most recent (July ' +
        '2026, Jacobs & Lowe Bennetts) statement, but "AMX Holdings Pty Ltd" on the June 2026 Nichols Crowder ' +
        'statement, and informally "AMX Superstore" in the property profile. Could be a holding-company/operating- ' +
        'subsidiary distinction or a data-entry inconsistency between agents — not resolvable from the documents ' +
        'supplied. Used the most recent statement\'s name.',
    },
    'tenant: AMX Superstores Pty Ltd',
  );

  // =========================================================================
  // Properties
  // =========================================================================
  console.log('\nProperties');

  const nepeanHwy = await findOrCreate(
    propertyRepo,
    { addressLine1: '996 Nepean Highway' },
    {
      name: '996 Nepean Highway, Mornington',
      addressLine1: '996 Nepean Highway',
      suburb: 'Mornington',
      state: 'VIC',
      postcode: '3931',
      country: 'AU',
      propertyType: PropertyType.COMMERCIAL,
      status: PropertyStatus.ACTIVE,
      category: PropertyCategory.INVESTMENT,
      purchaseDate: PLACEHOLDER_DATE,
      purchasePrice: 6729986, // Cost Base per FY26 dashboard / property profile, used as a purchase-price proxy
      purchaseCosts: 1, // PLACEHOLDER: acquisition cost breakdown not available anywhere
      purchaseCurrency: 'AUD',
      landAreaSqm: 1798,
      buildingAreaSqm: 729, // whole-building GLA per dashboard/profile; the *leased* NLA under the new lease is smaller (681.5 sqm) — not a conflict, different measure
      ownedByEntityId: carrHoldings.id,
      managingAgentId: null,
      notes:
        'PLACEHOLDER: purchaseDate/purchaseCosts not found in any supplied document (only Cost Base $6,729,986 ' +
        'and Market Value $6,800,000 were given) — verify against the settlement statement. No ongoing managing ' +
        'agent found (property was vacant until the new lease; CBRE/Jacobs & Lowe Bennetts acted only as leasing ' +
        'agents on commission, captured via invoices, not as managingAgentId). BMT Tax Depreciation Schedule on ' +
        'file: total capital expenditure $3,239,870 (Div 40 $384,185 + Div 43 $2,855,685), FY2025-26 forecast ' +
        'depreciation claim $120,429 (diminishing value) / $95,383 (prime cost) — not booked as a cash expense, ' +
        'see gap report.',
    },
    'property: 996 Nepean Highway, Mornington',
  );

  const morningtonTyabb = await findOrCreate(
    propertyRepo,
    { addressLine1: '5/177-179 Mornington Tyabb Road' },
    {
      name: '5/177-179 Mornington Tyabb Road, Mornington',
      addressLine1: '5/177-179 Mornington Tyabb Road',
      suburb: 'Mornington',
      state: 'VIC',
      postcode: '3931',
      country: 'AU',
      propertyType: PropertyType.COMMERCIAL,
      status: PropertyStatus.ACTIVE,
      category: PropertyCategory.INVESTMENT,
      purchaseDate: PLACEHOLDER_DATE,
      purchasePrice: 1415718, // "Cost Base" per property profile docx, used as a purchase-price proxy
      purchaseCosts: 1, // PLACEHOLDER
      purchaseCurrency: 'AUD',
      ownedByEntityId: whitehaven.id,
      managingAgentId: nicholsCrowder.id,
      notes:
        'PLACEHOLDER: purchaseDate/purchaseCosts not found (only "Cost Base $1,415,718" from the property profile ' +
        'was available, used as a purchase-price proxy). CONFLICT: the property profile\'s own summary rent/expense ' +
        'figures ($45,957 p.a. rent / $9,140 p.a. expenses) do NOT reconcile with the real Nichols Crowder ' +
        'statements, which show FY2025-26 actual rent of $79,413.95 + $111.35 adjustment and expenses of ' +
        '$19,508.73 (both ex GST) — the real agent statements were used throughout, not the profile summary. ' +
        'Strata lot 5 within Owners Corporation 525588J ("37 Degrees"). Statement #177 is missing from the ' +
        'supplied documents (sequence jumps #176 to #178).',
    },
    'property: 5/177-179 Mornington Tyabb Road, Mornington',
  );

  const carbineWay = await findOrCreate(
    propertyRepo,
    { addressLine1: '6 & 9, 26-28 Carbine Way' },
    {
      name: '6 & 9 / 26-28 Carbine Way, Mornington',
      addressLine1: '6 & 9, 26-28 Carbine Way',
      suburb: 'Mornington',
      state: 'VIC',
      postcode: '3931',
      country: 'AU',
      propertyType: PropertyType.COMMERCIAL,
      status: PropertyStatus.ACTIVE,
      category: PropertyCategory.INVESTMENT,
      purchaseDate: PLACEHOLDER_DATE,
      purchasePrice: 1, // PLACEHOLDER
      purchaseCosts: 1, // PLACEHOLDER
      purchaseCurrency: 'AUD',
      ownedByEntityId: carrHoldings.id,
      managingAgentId: jacobsLowe.id,
      notes:
        'CONFLICT: unit numbers given as "6 & 9" in 5 of 6 address-bearing source documents (both Jacobs & Lowe ' +
        'statements, the JLB EOY statement, the rent review letter, and the Exclusive Sale Authority) vs. "9 & 11" ' +
        'in only the Nichols Crowder EOY statement. Used "6 & 9" (majority) — verify against title before trusting. ' +
        'PLACEHOLDER: purchaseDate/Price/Costs not found anywhere. Three different current-value figures exist ' +
        'across the source documents ($1,330,000 master dashboard / $1,100,000 property profile / $1,250,000 ' +
        'agent\'s statutory sale estimate) — see the two Valuation records seeded below; none has a confirmed ' +
        'independent valuation date/valuer. IMPORTANT: this property is currently under an active Exclusive Sale ' +
        'Authority (signed 18-05-2026, vendor price $1,250,000, subject to the existing Raw Travel tenancy, 2.2% ' +
        'commission) — the PropertyStatus enum has no "listed for sale" state, so status is left ACTIVE (still ' +
        'tenanted) with this note; see gap report.',
    },
    'property: 6 & 9 / 26-28 Carbine Way, Mornington',
  );

  const eliteWay = await findOrCreate(
    propertyRepo,
    { addressLine1: '6 Elite Way' },
    {
      name: '6 Elite Way, Mornington',
      addressLine1: '6 Elite Way',
      suburb: 'Mornington',
      state: 'VIC',
      postcode: '3931',
      country: 'AU',
      propertyType: PropertyType.INDUSTRIAL,
      status: PropertyStatus.ACTIVE,
      category: PropertyCategory.INVESTMENT,
      purchaseDate: PLACEHOLDER_DATE,
      purchasePrice: 1, // PLACEHOLDER
      purchaseCosts: 1, // PLACEHOLDER
      purchaseCurrency: 'AUD',
      ownedByEntityId: carrHoldings.id,
      managingAgentId: nicholsCrowder.id,
      notes:
        'PLACEHOLDER: purchaseDate/Price/Costs not found anywhere (only a $1,950,000 internal "book value" figure ' +
        'was given, undated, no valuer). propertyType is ambiguous — profile calls it "Industrial / Commercial ' +
        'Warehouse"; INDUSTRIAL chosen as the closer fit, flagged as a judgment call.',
    },
    'property: 6 Elite Way, Mornington',
  );

  const wangaraRoad = await findOrCreate(
    propertyRepo,
    { addressLine1: '2 & 3, 47 Wangara Road' },
    {
      name: '2 & 3 / 47 Wangara Road, Cheltenham',
      addressLine1: '2 & 3, 47 Wangara Road',
      suburb: 'Cheltenham',
      state: 'VIC',
      postcode: '3192',
      country: 'AU',
      propertyType: PropertyType.INDUSTRIAL,
      status: PropertyStatus.ACTIVE,
      category: PropertyCategory.INVESTMENT,
      purchaseDate: PLACEHOLDER_DATE,
      purchasePrice: 1, // PLACEHOLDER
      purchaseCosts: 1, // PLACEHOLDER
      purchaseCurrency: 'AUD',
      ownedByEntityId: carrHoldings.id,
      managingAgentId: nicholsCrowder.id,
      notes:
        'PLACEHOLDER: purchaseDate/Price/Costs not found anywhere (only a $3,480,000 current-market-value figure ' +
        'was given, undated, no valuer). propertyType ambiguous ("Commercial / Industrial" in source) — INDUSTRIAL ' +
        'chosen, flagged as a judgment call. Folder was named "Wangarra" but every source document spells it ' +
        '"Wangara" (no double r) — used the document spelling.',
    },
    'property: 2 & 3 / 47 Wangara Road, Cheltenham',
  );

  const rayleePlace = await findOrCreate(
    propertyRepo,
    { addressLine1: '1 Raylee Place' },
    {
      name: '1 Raylee Place, Lynbrook',
      addressLine1: '1 Raylee Place',
      suburb: 'Lynbrook',
      state: 'VIC',
      postcode: '3975',
      country: 'AU',
      propertyType: PropertyType.COMMERCIAL,
      status: PropertyStatus.ACTIVE,
      category: PropertyCategory.INVESTMENT,
      purchaseDate: PLACEHOLDER_DATE,
      purchasePrice: 1, // PLACEHOLDER
      purchaseCosts: 1, // PLACEHOLDER
      purchaseCurrency: 'AUD',
      ownedByEntityId: carrHoldings.id,
      managingAgentId: jacobsLowe.id,
      notes:
        'PLACEHOLDER: purchaseDate/Price/Costs not found anywhere. Two current-value figures exist: $3,488,000 ' +
        '(current) and $3,172,197 (previous) — both undated, no named valuer; see the two Valuation records ' +
        'seeded below. Managing agent changed from Nichols Crowder to Jacobs & Lowe Bennetts via an Exclusive ' +
        'Commercial Property Management Authority (RAYL1) signed 23/06/2026; commission rate 3.91% of gross ' +
        'annual rent (no field in ManagingAgentEntity for this — see gap report).',
    },
    'property: 1 Raylee Place, Lynbrook',
  );

  const valeRoad = await findOrCreate(
    propertyRepo,
    { addressLine1: 'Vale Road' },
    {
      name: 'Vale Road, Moss Vale',
      addressLine1: 'Vale Road',
      suburb: 'Moss Vale',
      state: 'NSW',
      postcode: '2577', // commonly known Moss Vale postcode — NOT stated in the source documents themselves; see gap report
      country: 'AU',
      propertyType: PropertyType.INDUSTRIAL,
      status: PropertyStatus.ACTIVE,
      category: PropertyCategory.INVESTMENT,
      purchaseDate: PLACEHOLDER_DATE,
      purchasePrice: 1, // PLACEHOLDER
      purchaseCosts: 1, // PLACEHOLDER
      purchaseCurrency: 'AUD',
      ownedByEntityId: carrHoldings.id,
      managingAgentId: null,
      notes:
        'PLACEHOLDER: purchaseDate/Price/Costs not found (only a $18,000,000 current market value was given, ' +
        'undated). postcode 2577 is NOT sourced from any supplied document (Moss Vale\'s well-known postcode was ' +
        'used as a placeholder rather than leaving the NOT-NULL column empty) — verify. CRITICAL: no lease/tenant ' +
        'record was created for this property. A master summary document names the tenant as "Thread Group ' +
        'Australia" with monthly rent $61,496.24, but that tenant name appears in NO Vale Road source document ' +
        'supplied. The only Vale Road documents are the property profile (which names the tenant as "Oxley Frame ' +
        '& Truss Pty Ltd", the same figure as the rent) and a remittance advice showing A & H Carr Holdings PAYING ' +
        '$67,878.44 to Oxley Frame & Truss Pty Ltd (a structural building-materials supplier name, consistent with ' +
        'a capital-works payment, not rent). This looks like a data-conflation error in the profile document, but ' +
        'is not resolvable from the documents supplied — see gap report. The two Oxley Frame & Truss invoices are ' +
        'seeded below as capital works expenses only, with no tenant/lease attached.',
    },
    'property: Vale Road, Moss Vale',
  );

  const homeWattsParade = await findOrCreate(
    propertyRepo,
    { addressLine1: '27 Watts Parade' },
    {
      name: '27 Watts, Mount Eliza',
      addressLine1: '27 Watts Parade',
      suburb: 'Mount Eliza',
      state: 'VIC',
      postcode: '3930',
      country: 'AU',
      propertyType: PropertyType.RESIDENTIAL,
      status: PropertyStatus.ACTIVE,
      category: PropertyCategory.PERSONAL,
      purchaseDate: PLACEHOLDER_DATE,
      purchasePrice: 1, // PLACEHOLDER
      purchaseCosts: 1, // PLACEHOLDER
      purchaseCurrency: 'AUD',
      ownedByEntityId: null,
      managingAgentId: null,
      notes:
        'DERIVED address: the "27 Watts" property profile itself gives NO address at all — the address used here ' +
        'is derived from many OTHER portfolio documents (CBRE/Jacobs & Lowe Bennetts/Nichols Crowder invoices and ' +
        'statements) which consistently cite "27 Watts Parade, Mount Eliza VIC 3930" as the Carr Holdings ' +
        'registered/mailing address — corroborated cross-document, not a guess, but still unconfirmed by the 27 ' +
        'Watts profile itself. PLACEHOLDER: purchaseDate/Price/Costs not found anywhere (only current valuation ' +
        '$12,000,000 given, undated). ownedByEntityId left blank: document names ownership only as "Carr Group ' +
        'Related Entity", not a specific legal entity — did not assume it is A & H Carr Holdings ATF Carr Family ' +
        'Trust despite that being likely. Personal-use lifestyle asset, not income-producing, per document.',
    },
    'property: 27 Watts, Mount Eliza (personal)',
  );

  const kilparra = await findOrCreate(
    propertyRepo,
    { name: 'Kilparra' },
    {
      name: 'Kilparra',
      addressLine1: 'Kilparra (address not stated in any source document)',
      suburb: 'UNKNOWN',
      state: 'UNKNOWN',
      postcode: 'UNKNOWN',
      country: 'AU',
      propertyType: PropertyType.RESIDENTIAL,
      status: PropertyStatus.ACTIVE,
      category: PropertyCategory.PERSONAL,
      purchaseDate: PLACEHOLDER_DATE,
      purchasePrice: 1, // PLACEHOLDER
      purchaseCosts: 1, // PLACEHOLDER
      purchaseCurrency: 'AUD',
      ownedByEntityId: null,
      managingAgentId: null,
      notes:
        'PLACEHOLDER: this property\'s ONLY source document (a 1-page sanitised profile) gives no street address, ' +
        'suburb, state, or postcode at all — "Kilparra" appears to be a property/homestead name, not an address. ' +
        'suburb/state/postcode set to the literal string "UNKNOWN" purely to satisfy NOT-NULL columns — this is a ' +
        'brand new property record (did not previously exist in the DB) and needs a real address before it is ' +
        'usable. propertyType RESIDENTIAL is a guess (document only says "Personal Use Property", no asset-type ' +
        'label). ownedByEntityId left blank: no specific legal owning entity named. Current stated value ' +
        '$1,000,000 (see Valuation below), personal-use / non-income-producing.',
    },
    'property: Kilparra (personal, address unknown)',
  );

  const springSt = await findOrCreate(
    propertyRepo,
    { name: '17 Spring St' },
    {
      name: '17 Spring St',
      addressLine1: '17 Spring St (suburb/state/postcode not stated in any source document)',
      suburb: 'UNKNOWN',
      state: 'UNKNOWN',
      postcode: 'UNKNOWN',
      country: 'AU',
      propertyType: PropertyType.RESIDENTIAL,
      status: PropertyStatus.ACTIVE,
      category: PropertyCategory.PERSONAL,
      purchaseDate: PLACEHOLDER_DATE,
      purchasePrice: 1, // PLACEHOLDER
      purchaseCosts: 1, // PLACEHOLDER
      purchaseCurrency: 'AUD',
      ownedByEntityId: null,
      managingAgentId: null,
      notes:
        'PLACEHOLDER: this property\'s ONLY source document (a 1-page sanitised profile) never gives a suburb, ' +
        'state, or postcode — only the street name/number "17 Spring St". Since "Spring St" exists in many ' +
        'Australian cities, no state could safely be inferred (unlike 27 Watts, no other portfolio document ' +
        'corroborates a location for this one). suburb/state/postcode set to the literal string "UNKNOWN" purely ' +
        'to satisfy NOT-NULL columns. Brand new property record. Current stated value $5,000,000 (see Valuation ' +
        'below), personal-use / non-income-producing.',
    },
    'property: 17 Spring St (personal, address unknown)',
  );

  // =========================================================================
  // Leases
  // =========================================================================
  console.log('\nLeases');

  const nepeanLease = await findOrCreate(
    leaseRepo,
    { propertyId: nepeanHwy.id, tenantId: servicesAustralia.id },
    {
      propertyId: nepeanHwy.id,
      tenantId: servicesAustralia.id,
      status: LeaseStatus.ACTIVE,
      commencementDate: '2026-06-24',
      expiryDate: '2033-06-23',
      initialTermMonths: 84,
      optionTerms: [
        { termMonths: 36, exercised: false, exerciseByDate: '2033-03-23' },
        { termMonths: 36, exercised: false, exerciseByDate: null },
      ],
      baseRentAnnual: 306675.0, // real figure: $25,556.25/month x 12, per the executed Lease's Information Table Item 11 (based on measured 681.5 sqm NLA, not the 784 sqm cap)
      rentFrequency: RentFrequency.MONTHLY,
      outgoingsRecoveryType: OutgoingsRecoveryType.GROSS,
      rentReviewMechanism: RentReviewMechanism.FIXED_PERCENT,
      rentReviewValue: 3.0,
      nextReviewDate: '2027-06-24',
      rentFreePeriodMonths: 3,
      bondAmount: 0, // DERIVED: no Bond/Bank Guarantee field exists anywhere in the executed lease; Commonwealth tenant self-insures (cl. 42.1)
      bondType: BondType.BANK_GUARANTEE, // schema requires a type even though no bond exists; see notes
      notes:
        'REAL EXECUTED LEASE (supersedes all earlier AFL-derived placeholder assumptions). CONFLICT vs. prior ' +
        'assumptions: commencement date is 24 June 2026 (not 27 Aug 2026 as a sanitised summary doc stated, and ' +
        'not 23 June 2026 as the AFL\'s own Practical-Completion formula would predict). baseRentAnnual is ' +
        '$306,675.00 (not the $352,800 estimate used previously) because the actual measured NLA is 681.5 sqm, ' +
        'not the 784 sqm "Maximum NLA" cap. No market rent review occurs within the 7-year initial term — Item 12 ' +
        'explicitly marks the Year-7 "market review" as Not Applicable; the only reviews during the initial term ' +
        'are the fixed 3% annual ones. A market-based reset only applies if/when an Option Term is exercised. Two ' +
        '3-year option terms confirmed; second option\'s exact exercise-by date not given in the pages read ' +
        '(Item 13\'s formula is drafted around the *initial* term\'s expiry). Gross lease, no outgoings payable by ' +
        'tenant (confirmed). 21 car parking spaces incl. 1 secure bay. Tenant has NO make-good obligation at lease ' +
        'end. Public Risk Insurance requirement $20,000,000, tenant self-insures (no bank guarantee/bond exists — ' +
        'bondType above is a schema placeholder only). CAVEAT: the Signing Page (near the end of the PDF) had ' +
        'blank/unfilled signature fields in the extracted text despite the filename "Execution Version" and a PDF ' +
        'file date of 29 June 2026 — could be a text-extraction limitation on scanned signatures rather than proof ' +
        'the lease is actually unsigned. Verify execution before treating status=ACTIVE as certain. AFL reference: ' +
        'the underlying Agreement for Lease is dated 25 May 2026 (per the executed Lease\'s own recitals), not ' +
        '12.05.26 as its filename suggests.',
    },
    'lease: 996 Nepean Highway <> Services Australia',
  );

  const tyabbLease = await findOrCreate(
    leaseRepo,
    { propertyId: morningtonTyabb.id, tenantId: coastcare.id },
    {
      propertyId: morningtonTyabb.id,
      tenantId: coastcare.id,
      status: LeaseStatus.ACTIVE,
      commencementDate: PLACEHOLDER_DATE,
      expiryDate: '1900-01-02',
      initialTermMonths: 0,
      baseRentAnnual: 79525.3, // real FY2025-26 actual: $79,413.95 rent + $111.35 adjustment, ex GST, per the EOY statement
      rentFrequency: RentFrequency.MONTHLY,
      outgoingsRecoveryType: OutgoingsRecoveryType.NET, // DERIVED: council rates/water/fire protection/OC fees/repairs all recovered from tenant almost 1:1 against the matching expense lines
      rentReviewMechanism: RentReviewMechanism.FIXED_PERCENT,
      rentReviewValue: null,
      bondAmount: 0,
      bondType: BondType.BANK_GUARANTEE,
      notes:
        'PLACEHOLDER: no lease agreement document was supplied for this property — only 8 monthly/annual agent ' +
        'statements. commencementDate/expiryDate/initialTermMonths/bondAmount/bondType are dummy sentinel values ' +
        '(1900-01-01/1900-01-02/0/$0/BANK_GUARANTEE) purely to satisfy NOT-NULL schema columns — NONE of these are ' +
        'real; do not use them. rentReviewMechanism defaulted to FIXED_PERCENT with no value because no rent- ' +
        'review clause is evidenced anywhere (the current monthly net rate of $6,840.55 was flat across every ' +
        'statement supplied, May-July 2026). baseRentAnnual and outgoingsRecoveryType ARE real, derived from the ' +
        'actual FY2025-26 EOY statement. See the property\'s own notes for the profile-vs-statement rent conflict.',
    },
    'lease: 5/177-179 Mornington Tyabb Road <> Coastcare',
  );

  const carbineLease = await findOrCreate(
    leaseRepo,
    { propertyId: carbineWay.id, tenantId: rawTravel.id },
    {
      propertyId: carbineWay.id,
      tenantId: rawTravel.id,
      status: LeaseStatus.ACTIVE,
      commencementDate: PLACEHOLDER_DATE,
      expiryDate: '1900-01-02',
      initialTermMonths: 0,
      baseRentAnnual: 72800.04, // real: $6,066.67/month excl GST x 12, confirmed by property profile + rent review letter + both current agent statements
      rentFrequency: RentFrequency.MONTHLY,
      outgoingsRecoveryType: OutgoingsRecoveryType.NET, // DERIVED: council rates/water/essential safety/R&M all recovered from tenant, matching expense lines, in the EOY statement
      rentReviewMechanism: RentReviewMechanism.FIXED_PERCENT,
      rentReviewValue: 4.0,
      nextReviewDate: '2026-09-16',
      bondAmount: 0,
      bondType: BondType.BANK_GUARANTEE,
      notes:
        'PLACEHOLDER: no lease agreement document was supplied — only agent statements, a rent-review letter and ' +
        'the Exclusive Sale Authority. commencementDate/expiryDate/initialTermMonths/bondAmount/bondType are dummy ' +
        'sentinel values, not real. baseRentAnnual, the fixed 4% annual review (locked each 16 September — ' +
        'explicitly different from the Carr Group\'s usual 3% pattern), and outgoingsRecoveryType ARE real, ' +
        'confirmed by the Nichols Crowder rent review letter dated 12/08/2025.',
    },
    'lease: 6 & 9 / 26-28 Carbine Way <> Raw Travel',
  );

  const eliteLease = await findOrCreate(
    leaseRepo,
    { propertyId: eliteWay.id, tenantId: octagon.id },
    {
      propertyId: eliteWay.id,
      tenantId: octagon.id,
      status: LeaseStatus.ACTIVE,
      commencementDate: PLACEHOLDER_DATE,
      expiryDate: '1900-01-02',
      initialTermMonths: 0,
      baseRentAnnual: 135372.84, // DERIVED: current monthly net rate $11,281.07 (post-review) x 12, per the July 2026 statement
      rentFrequency: RentFrequency.MONTHLY,
      outgoingsRecoveryType: OutgoingsRecoveryType.NET, // DERIVED: rates/water/fire protection/OC fees/R&M revenue lines closely track matching expense lines in the EOY statement
      rentReviewMechanism: RentReviewMechanism.FIXED_PERCENT,
      rentReviewValue: 3.0, // DERIVED: EOY statement shows monthly rent stepping from $10,952.50 to $11,281.07 mid-FY, an exact 3.00% increase
      bondAmount: 0,
      bondType: BondType.BANK_GUARANTEE,
      notes:
        'PLACEHOLDER: no lease agreement document was supplied. commencementDate/expiryDate/initialTermMonths/ ' +
        'bondAmount/bondType are dummy sentinel values, not real. baseRentAnnual is DERIVED from the current ' +
        'monthly rate; a mid-FY2025-26 rent increase of exactly 3.00% is evidenced in the EOY statement but the ' +
        'exact review date could not be pinned down (a PDF column-ordering artifact obscured which month it ' +
        'landed in) — no RentReview row was created for it pending a cleaner re-read of that statement.',
    },
    'lease: 6 Elite Way <> Octagon Removals and Storage',
  );

  const wangaraLease = await findOrCreate(
    leaseRepo,
    { propertyId: wangaraRoad.id, tenantId: threadGroup.id },
    {
      propertyId: wangaraRoad.id,
      tenantId: threadGroup.id,
      status: LeaseStatus.ACTIVE,
      commencementDate: PLACEHOLDER_DATE,
      expiryDate: '1900-01-02',
      initialTermMonths: 0,
      baseRentAnnual: 201571.08, // real: $16,797.59/month excl GST x 12, per property profile & confirmed by both agent statements
      rentFrequency: RentFrequency.MONTHLY,
      outgoingsRecoveryType: OutgoingsRecoveryType.NET, // DERIVED, same pattern as the other Nichols Crowder-managed properties
      rentReviewMechanism: RentReviewMechanism.FIXED_PERCENT,
      rentReviewValue: 3.0,
      nextReviewDate: '2027-06-01',
      bondAmount: 0,
      bondType: BondType.BANK_GUARANTEE,
      notes:
        'PLACEHOLDER: no lease agreement document was supplied. commencementDate/expiryDate/initialTermMonths/ ' +
        'bondAmount/bondType are dummy sentinel values, not real. baseRentAnnual and the fixed 3% annual review ' +
        '(effective 1 June each year, last review 1 June 2026: $16,308.34 -> $16,797.59/month, exact 3.00%) ARE ' +
        'real, confirmed by the property profile and cross-checked against the EOY statement\'s rent step-up.',
    },
    'lease: 2 & 3 / 47 Wangara Road <> Thread Group Australia',
  );

  const rayleeLease = await findOrCreate(
    leaseRepo,
    { propertyId: rayleePlace.id, tenantId: amxSuperstores.id },
    {
      propertyId: rayleePlace.id,
      tenantId: amxSuperstores.id,
      status: LeaseStatus.ACTIVE,
      commencementDate: PLACEHOLDER_DATE,
      expiryDate: '1900-01-02',
      initialTermMonths: 0,
      baseRentAnnual: 226125.0, // real: $18,843.75/month excl GST x 12, per property profile & July 2026 statement (post-review rate)
      rentFrequency: RentFrequency.MONTHLY,
      outgoingsRecoveryType: OutgoingsRecoveryType.NET, // DERIVED: council rates/water/essential safety all fully recovered from tenant, matching expense lines exactly, in the EOY statement
      rentReviewMechanism: RentReviewMechanism.CPI,
      rentReviewValue: null, // no explicit CPI index % stated anywhere; see RentReview note below
      nextReviewDate: '2027-06-01',
      bondAmount: 0,
      bondType: BondType.BANK_GUARANTEE,
      notes:
        'PLACEHOLDER: no lease agreement document was supplied. commencementDate/expiryDate/initialTermMonths/ ' +
        'bondAmount/bondType are dummy sentinel values, not real. baseRentAnnual and the annual CPI-linked review ' +
        '(effective 1 June each year, last review 1 June 2026: $18,162.50 -> $18,843.75/month, +3.75%) ARE real, ' +
        'confirmed by the property profile and cross-checked against the EOY statement. Rent frequency confirmed ' +
        'monthly across all three statements supplied.',
    },
    'lease: 1 Raylee Place <> AMX Superstores',
  );

  // =========================================================================
  // Rent reviews (completed events with real before/after figures)
  // =========================================================================
  console.log('\nRent reviews');

  await findOrCreate(
    rentReviewRepo,
    { leaseId: carbineLease.id, reviewDate: '2025-09-16' },
    {
      leaseId: carbineLease.id,
      reviewDate: '2025-09-16',
      reviewType: RentReviewMechanism.FIXED_PERCENT,
      oldRentAnnual: 70000.08, // DERIVED: $5,833.34/month (pre-review rate per EOY statement) x 12
      newRentAnnual: 72800.04,
      percentChange: 4.0,
      status: RentReviewStatus.COMPLETED,
      notes:
        'Nichols Crowder Property Solutions letter dated 12/08/2025 (signed Cristy Gatto), confirming the fixed ' +
        '4% annual increase effective 16/09/2025 to $6,066.67/month + GST. Corroborated by the Sept 2025 blended ' +
        'monthly figure and every subsequent statement through July 2026. Source: "Rent Review - LLD.pdf".',
    },
    'rent review: Carbine Way, 16 Sep 2025 (+4%)',
  );

  await findOrCreate(
    rentReviewRepo,
    { leaseId: wangaraLease.id, reviewDate: '2026-06-01' },
    {
      leaseId: wangaraLease.id,
      reviewDate: '2026-06-01',
      reviewType: RentReviewMechanism.FIXED_PERCENT,
      oldRentAnnual: 195700.08, // DERIVED: $16,308.34/month x 12
      newRentAnnual: 201571.08,
      percentChange: 3.0,
      status: RentReviewStatus.COMPLETED,
      notes:
        'Property profile states "Last Review Effective: 1 June 2026", fixed 3% annual increase. Confirmed by the ' +
        'EOY statement, which shows the monthly rent stepping from $16,308.34 (Jul 2025-May 2026) to $16,797.59 ' +
        '(June 2026) — an exact 3.00% increase.',
    },
    'rent review: Wangara Road, 1 Jun 2026 (+3%)',
  );

  await findOrCreate(
    rentReviewRepo,
    { leaseId: rayleeLease.id, reviewDate: '2026-06-01' },
    {
      leaseId: rayleeLease.id,
      reviewDate: '2026-06-01',
      reviewType: RentReviewMechanism.CPI,
      oldRentAnnual: 217950.0, // DERIVED: $18,162.50/month x 12
      newRentAnnual: 226125.0,
      percentChange: 3.75,
      status: RentReviewStatus.COMPLETED,
      notes:
        'Property profile states "Annual CPI Review", "Last Review Effective: 1 June 2026". Confirmed by the EOY ' +
        'statement, which shows the monthly rent stepping from $18,162.50 to $18,843.75 (+3.75%). No explicit CPI ' +
        'index value/% is cited in any source document, only the before/after rent figures.',
    },
    'rent review: Raylee Place, 1 Jun 2026 (CPI, +3.75%)',
  );

  // =========================================================================
  // 996 Nepean Highway — vendor invoices + linked expenses + maintenance
  // =========================================================================
  console.log('\n996 Nepean Highway: invoices, expenses, maintenance');

  const cbreInvoice = await findOrCreate(
    invoiceRepo,
    { invoiceNumber: '41AT10013788' },
    {
      propertyId: nepeanHwy.id,
      direction: InvoiceDirection.OUTGOING,
      invoiceType: InvoiceType.LEASING_COMMISSION,
      invoiceNumber: '41AT10013788',
      issuerName: 'CBRE (V) Pty Ltd',
      issuerAbn: '15083694357',
      issueDate: '2026-06-02',
      dueDate: '2026-06-16',
      subtotal: 26460.0,
      gstAmount: 2646.0,
      totalAmount: 29106.0,
      currency: 'AUD',
      status: InvoiceStatus.CLASSIFIED,
      notes:
        'Leasing fee, 996 Nepean Highway. This is CBRE\'s 50% share of a $58,212 (incl GST) total leasing ' +
        'commission pool, split evenly with Jacobs & Lowe Bennetts (invoice 39519573, also $29,106) — confirmed ' +
        'arithmetic, not a duplicate charge. Remit to CBRE (C) Pty Ltd, ANZ BSB/Acc 014-002 8372 60111.',
    },
    'invoice: CBRE leasing commission 41AT10013788',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: nepeanHwy.id, sourceInvoiceId: cbreInvoice.id },
    {
      propertyId: nepeanHwy.id,
      expenseDate: '2026-06-02',
      category: PropertyExpenseCategory.LEASING_COMMISSION,
      description: 'Leasing commission - CBRE (V) Pty Ltd (50% share)',
      amount: 26460.0,
      gstAmount: 2646.0,
      currency: 'AUD',
      sourceInvoiceId: cbreInvoice.id,
    },
    'expense: CBRE leasing commission',
  );

  const jlInvoice = await findOrCreate(
    invoiceRepo,
    { invoiceNumber: '39519573' },
    {
      propertyId: nepeanHwy.id,
      direction: InvoiceDirection.OUTGOING,
      invoiceType: InvoiceType.LEASING_COMMISSION,
      invoiceNumber: '39519573',
      issuerName: 'Jacobs & Lowe Bennetts Pty Ltd',
      issuerAbn: '92239541754',
      issueDate: '2026-06-01',
      subtotal: 26460.0,
      gstAmount: 2646.0,
      totalAmount: 29106.0,
      currency: 'AUD',
      status: InvoiceStatus.CLASSIFIED,
      notes:
        'Commercial Leasing Fee @ 50% - ref NEPE996, ref 1716842. The other 50% share of the same $58,212 total ' +
        'commission pool as CBRE\'s invoice 41AT10013788.',
    },
    'invoice: Jacobs & Lowe leasing commission 39519573',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: nepeanHwy.id, sourceInvoiceId: jlInvoice.id },
    {
      propertyId: nepeanHwy.id,
      expenseDate: '2026-06-01',
      category: PropertyExpenseCategory.LEASING_COMMISSION,
      description: 'Leasing commission - Jacobs & Lowe Bennetts Pty Ltd (50% share)',
      amount: 26460.0,
      gstAmount: 2646.0,
      currency: 'AUD',
      sourceInvoiceId: jlInvoice.id,
    },
    'expense: Jacobs & Lowe Bennetts leasing commission',
  );

  const eaInvoice = await findOrCreate(
    invoiceRepo,
    { invoiceNumber: '091902218918' },
    {
      propertyId: nepeanHwy.id,
      direction: InvoiceDirection.OUTGOING,
      invoiceType: InvoiceType.UTILITIES,
      invoiceNumber: '091902218918',
      issuerName: 'EnergyAustralia Pty Ltd',
      issuerAbn: '99086014968',
      issueDate: '2026-03-23',
      dueDate: '2026-04-13',
      periodStart: '2025-12-19',
      periodEnd: '2026-03-18',
      subtotal: 141.03,
      gstAmount: 14.1,
      totalAmount: 155.13,
      currency: 'AUD',
      status: InvoiceStatus.CLASSIFIED,
      notes:
        'Electricity account 0915180161, NMI 64084995776. Billed to A & H Carr Holdings while property vacant. ' +
        'Solar buyback of 6,174.084 kWh generated a $101.87 credit this period.',
    },
    'invoice: EnergyAustralia electricity 091902218918',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: nepeanHwy.id, sourceInvoiceId: eaInvoice.id },
    {
      propertyId: nepeanHwy.id,
      expenseDate: '2026-03-23',
      periodStart: '2025-12-19',
      periodEnd: '2026-03-18',
      category: PropertyExpenseCategory.UTILITIES,
      description: 'Electricity - EnergyAustralia, account 0915180161',
      amount: 141.03,
      gstAmount: 14.1,
      currency: 'AUD',
      sourceInvoiceId: eaInvoice.id,
    },
    'expense: EnergyAustralia electricity',
  );

  const beconInvoice = await findOrCreate(
    invoiceRepo,
    { invoiceNumber: '8198' },
    {
      propertyId: nepeanHwy.id,
      direction: InvoiceDirection.OUTGOING,
      invoiceType: InvoiceType.CAPITAL_WORKS,
      invoiceNumber: '8198',
      issuerName: 'Becon Constructions (Aust.) Pty Ltd',
      issuerAbn: '78092361165',
      issueDate: '2026-05-31',
      dueDate: '2026-06-14',
      subtotal: 127167.2,
      gstAmount: 12716.72,
      totalAmount: 139883.92,
      currency: 'AUD',
      status: InvoiceStatus.CLASSIFIED,
      notes: 'Job 1586 - Mornington Office Fit Out, Progress Claim 2.',
    },
    'invoice: Becon Constructions fit-out progress claim 8198',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: nepeanHwy.id, sourceInvoiceId: beconInvoice.id },
    {
      propertyId: nepeanHwy.id,
      expenseDate: '2026-05-31',
      category: PropertyExpenseCategory.CAPITAL_WORKS,
      description: 'Mornington office fit-out - progress claim 2 (Becon Constructions)',
      amount: 127167.2,
      gstAmount: 12716.72,
      currency: 'AUD',
      sourceInvoiceId: beconInvoice.id,
    },
    'expense: Becon fit-out progress claim',
  );

  const cleanlineInvoice = await findOrCreate(
    invoiceRepo,
    { invoiceNumber: '240' },
    {
      propertyId: nepeanHwy.id,
      direction: InvoiceDirection.OUTGOING,
      invoiceType: InvoiceType.MAINTENANCE,
      invoiceNumber: '240',
      issuerName: 'Cleanline Property Services',
      issuerAbn: '58688895436',
      issueDate: '2026-08-01',
      dueDate: '2026-08-08',
      subtotal: 544.55,
      gstAmount: 54.45,
      totalAmount: 599.0,
      currency: 'AUD',
      status: InvoiceStatus.CLASSIFIED,
      notes: 'Exterior window clean (double storey, water-fed pole) and Lukabond cladding clean. Billed to Andrew Carr.',
    },
    'invoice: Cleanline Property Services #240',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: nepeanHwy.id, sourceInvoiceId: cleanlineInvoice.id },
    {
      propertyId: nepeanHwy.id,
      expenseDate: '2026-08-01',
      category: PropertyExpenseCategory.MAINTENANCE,
      description: 'Exterior window and cladding clean - Cleanline Property Services',
      amount: 544.55,
      gstAmount: 54.45,
      currency: 'AUD',
      sourceInvoiceId: cleanlineInvoice.id,
    },
    'expense: Cleanline window/cladding clean',
  );
  await findOrCreate(
    maintenanceRepo,
    { propertyId: nepeanHwy.id, serviceDate: '2026-08-01', vendor: 'Cleanline Property Services' },
    {
      propertyId: nepeanHwy.id,
      serviceDate: '2026-08-01',
      category: MaintenanceCategory.CLEANING,
      vendor: 'Cleanline Property Services',
      description: 'Exterior window clean (double-storey, water-fed pole) plus Lukabond cladding clean',
      cost: 544.55,
      gstAmount: 54.45,
      currency: 'AUD',
      sourceInvoiceId: cleanlineInvoice.id,
    },
    'maintenance: Cleanline window/cladding clean',
  );

  await findOrCreate(
    maintenanceRepo,
    { propertyId: nepeanHwy.id, serviceDate: '2026-06-01', vendor: 'Record Automatic Doors Pty Ltd' },
    {
      propertyId: nepeanHwy.id,
      serviceDate: '2026-06-01',
      category: MaintenanceCategory.OTHER,
      vendor: 'Record Automatic Doors Pty Ltd',
      description:
        'Reattendance call-out: front right entrance auto door (Services Australia tenancy) reported failing to ' +
        'close/retracting on its own. Technician found no fault reproducible; confirmed door operating correctly ' +
        'before leaving site. Jobcard 87690-170154.',
      cost: 0, // PLACEHOLDER: no dollar figure stated on the jobcard (likely a warranty/no-charge callout)
      currency: 'AUD',
      notes:
        'PLACEHOLDER: cost set to $0 because the jobcard states no charge/amount anywhere. Pre-approved repair ' +
        'limit noted on the jobcard as $500.00, but no actual cost was incurred/recorded.',
    },
    'maintenance: Record Automatic Doors reactive callout (jobcard 87690)',
  );

  // Unsigned proposal — NOT seeded as a MaintenanceRecord, only as a Document (below).

  await findOrCreate(
    valuationRepo,
    { propertyId: nepeanHwy.id, valuationDate: '2026-06-30' },
    {
      propertyId: nepeanHwy.id,
      valuationDate: '2026-06-30', // DERIVED: approximated as FY26 year-end; no source document gives an exact valuation date
      valuationAmount: 6800000,
      valuationType: ValuationType.OWNER_ESTIMATE,
      purpose: 'Portfolio reporting',
      notes: 'Market value per Carr Group Rental Portfolio Dashboard FY26 / property profile (Cost Base $6,729,986, +1.04% capital growth).',
    },
    'valuation: 996 Nepean Highway',
  );

  // =========================================================================
  // 5/177-179 Mornington Tyabb Road — 8 statement periods + water bill
  // =========================================================================
  console.log('\n5/177-179 Mornington Tyabb Road: statements, income, expenses');

  type TyabbPeriod = {
    label: string;
    statementDate: string;
    periodStart: string;
    periodEnd: string;
    gross: number;
    expenses: number;
    net: number;
    rentGross: number;
    rentGst: number;
    mgmtFee: number;
    mgmtFeeGst: number;
    extra?: { category: PropertyExpenseCategory; description: string; amount: number; gstAmount?: number }[];
  };
  const tyabbPeriods: TyabbPeriod[] = [
    {
      label: 'Statement #171',
      statementDate: '2026-05-26',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      gross: 3325.0,
      expenses: 62.56,
      net: 1562.44,
      rentGross: 1625.0,
      rentGst: 147.73,
      mgmtFee: 62.56,
      mgmtFeeGst: 5.69,
    },
    {
      label: 'Statement #172',
      statementDate: '2026-06-01',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      gross: 3325.0,
      expenses: 1691.11,
      net: 1633.89,
      rentGross: 1625.0,
      rentGst: 147.73,
      mgmtFee: 62.56,
      mgmtFeeGst: 5.69,
      extra: [{ category: PropertyExpenseCategory.OWNERS_CORP, description: 'OC Fees - Lot 5, OC 525588J - 37 Degrees Owners Corporation', amount: 1628.55 }],
    },
    {
      label: 'Statement #173',
      statementDate: '2026-06-09',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      gross: 1625.0,
      expenses: 62.56,
      net: 1562.44,
      rentGross: 1625.0,
      rentGst: 147.73,
      mgmtFee: 62.56,
      mgmtFeeGst: 5.69,
    },
    {
      label: 'Statement #174',
      statementDate: '2026-06-16',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      gross: 1625.0,
      expenses: 62.56,
      net: 1562.44,
      rentGross: 1625.0,
      rentGst: 147.73,
      mgmtFee: 62.56,
      mgmtFeeGst: 5.69,
    },
    {
      label: 'Statement #175',
      statementDate: '2026-06-23',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      gross: 1625.0,
      expenses: 62.56,
      net: 1562.44,
      rentGross: 1024.61,
      rentGst: 93.14,
      mgmtFee: 62.56,
      mgmtFeeGst: 5.69,
      extra: [{ category: PropertyExpenseCategory.MAINTENANCE, description: 'Air conditioner service recovery (invoice 2433)', amount: 600.39, gstAmount: 54.58 }],
    },
    {
      label: 'Statement #176',
      statementDate: '2026-07-01',
      periodStart: '2026-07-01',
      periodEnd: '2026-09-30',
      gross: 6322.02,
      expenses: 243.4,
      net: 6078.62,
      rentGross: 3250.0,
      rentGst: 295.45,
      mgmtFee: 243.4,
      mgmtFeeGst: 22.13,
      extra: [
        { category: PropertyExpenseCategory.OWNERS_CORP, description: 'OC Fees Lot 5, 525588J (Jul-Sep 2026, quarterly)', amount: 1791.41, gstAmount: 162.86 },
        { category: PropertyExpenseCategory.MAINTENANCE, description: 'Air conditioner service recovery (invoice 2433, further instalment)', amount: 1280.61, gstAmount: 116.42 },
      ],
    },
    {
      label: 'Statement #178',
      statementDate: '2026-07-14',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      gross: 1625.0,
      expenses: 62.56,
      net: 1562.44,
      rentGross: 1625.0,
      rentGst: 147.73,
      mgmtFee: 62.56,
      mgmtFeeGst: 5.69,
    },
  ];

  for (const p of tyabbPeriods) {
    const statement = await findOrCreate(
      statementRepo,
      { propertyId: morningtonTyabb.id, statementDate: p.statementDate },
      {
        propertyId: morningtonTyabb.id,
        managingAgentId: nicholsCrowder.id,
        statementDate: p.statementDate,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        grossIncome: p.gross,
        totalExpenses: p.expenses,
        netToOwner: p.net,
        openingBalance: 0, // PLACEHOLDER: not stated on any source statement
        closingBalance: 0, // PLACEHOLDER: not stated on any source statement
        notes: `Nichols Crowder ${p.label} (${p.statementDate}). Statement #177 is missing from the supplied documents.`,
      },
      `property statement (Tyabb): ${p.label}`,
    );

    await findOrCreate(
      rentalIncomeRepo,
      { propertyId: morningtonTyabb.id, periodStart: p.periodStart, periodEnd: p.periodEnd, sourceStatementId: statement.id },
      {
        propertyId: morningtonTyabb.id,
        leaseId: tyabbLease.id,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        grossAmount: p.rentGross,
        gstAmount: p.rentGst,
        netAmount: p.rentGross - p.rentGst,
        amountReceived: p.rentGross,
        receivedDate: p.statementDate,
        status: RentalIncomeStatus.RECEIVED,
        sourceStatementId: statement.id,
        notes: `Rent from Coastcare Medical Equipment Hire & Sales, per Nichols Crowder ${p.label}.`,
      },
      `rental income (Tyabb): ${p.label}`,
    );

    await findOrCreate(
      expenseRepo,
      { propertyId: morningtonTyabb.id, expenseDate: p.statementDate, category: PropertyExpenseCategory.MANAGEMENT_FEE },
      {
        propertyId: morningtonTyabb.id,
        expenseDate: p.statementDate,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        category: PropertyExpenseCategory.MANAGEMENT_FEE,
        description: 'Commercial Management Fees - Nichols Crowder',
        amount: p.mgmtFee,
        gstAmount: p.mgmtFeeGst,
        currency: 'AUD',
        notes: `Per ${p.label}.`,
      },
      `expense (Tyabb): management fee, ${p.label}`,
    );

    for (const extra of p.extra ?? []) {
      await findOrCreate(
        expenseRepo,
        { propertyId: morningtonTyabb.id, expenseDate: p.statementDate, category: extra.category, description: extra.description },
        {
          propertyId: morningtonTyabb.id,
          expenseDate: p.statementDate,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          category: extra.category,
          description: extra.description,
          amount: extra.amount,
          gstAmount: extra.gstAmount ?? 0,
          currency: 'AUD',
          recoverableFromTenant: true,
          notes: `Per ${p.label}.`,
        },
        `expense (Tyabb): ${extra.description}, ${p.label}`,
      );
    }
  }

  const seWaterInvoice = await findOrCreate(
    invoiceRepo,
    { invoiceNumber: '32847539', propertyId: morningtonTyabb.id },
    {
      propertyId: morningtonTyabb.id,
      direction: InvoiceDirection.OUTGOING,
      invoiceType: InvoiceType.UTILITIES,
      invoiceNumber: '32847539',
      issuerName: 'South East Water Corporation',
      issuerAbn: '89066902547',
      issueDate: '2026-06-22',
      dueDate: '2026-07-08',
      periodStart: '2026-04-01',
      periodEnd: '2026-06-30',
      subtotal: 276.0,
      gstAmount: 0,
      totalAmount: 276.0,
      currency: 'AUD',
      status: InvoiceStatus.CLASSIFIED,
      notes:
        'Addressed to Whitehaven Global Securities c/o Nichols Crowder. Usage $44.69 + service charges $141.21 + ' +
        'other authorities $90.13 (parks/waterways/drainage). No GST charged (South East Water is GST-free).',
    },
    'invoice: South East Water (Tyabb)',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: morningtonTyabb.id, sourceInvoiceId: seWaterInvoice.id },
    {
      propertyId: morningtonTyabb.id,
      expenseDate: '2026-06-22',
      periodStart: '2026-04-01',
      periodEnd: '2026-06-30',
      category: PropertyExpenseCategory.UTILITIES,
      description: 'South East Water - usage + service charges',
      amount: 276.0,
      gstAmount: 0,
      currency: 'AUD',
      recoverableFromTenant: true,
      sourceInvoiceId: seWaterInvoice.id,
    },
    'expense: South East Water (Tyabb)',
  );

  await findOrCreate(
    valuationRepo,
    { propertyId: morningtonTyabb.id, valuationDate: '2026-06-30' },
    {
      propertyId: morningtonTyabb.id,
      valuationDate: '2026-06-30', // DERIVED: approximated as "current" per the profile doc, undated
      valuationAmount: 1500000,
      valuationType: ValuationType.OWNER_ESTIMATE,
      purpose: 'Portfolio / Jarvis Development reporting',
      notes: 'Property profile "Official Recorded Market Value", sourced from Carr Group financial records. No independent valuer named.',
    },
    'valuation: 5/177-179 Mornington Tyabb Road',
  );

  // =========================================================================
  // Carbine Way — 2 recent agent statements + FY EOY statements (both agents)
  // =========================================================================
  console.log('\nCarbine Way: statements, income, expenses');

  const carbineJlbStmt1 = await findOrCreate(
    statementRepo,
    { propertyId: carbineWay.id, statementDate: '2026-05-29', periodStart: '2026-06-01' },
    {
      propertyId: carbineWay.id,
      managingAgentId: jacobsLowe.id,
      statementDate: '2026-05-29',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      grossIncome: 6917.27,
      totalExpenses: 858.92,
      netToOwner: 6058.35,
      openingBalance: 0,
      closingBalance: 0,
      notes: 'Jacobs & Lowe Bennetts Statement No.7, ref 100866D. Figures GST-inclusive as presented. Water Rates line separately covers 01/04-30/06/2026 (mixed billing period on this statement).',
    },
    'property statement (Carbine Way): JLB Statement No.7',
  );
  await findOrCreate(
    rentalIncomeRepo,
    { propertyId: carbineWay.id, periodStart: '2026-06-01', periodEnd: '2026-06-30', sourceStatementId: carbineJlbStmt1.id },
    {
      propertyId: carbineWay.id,
      leaseId: carbineLease.id,
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      grossAmount: 6066.67,
      gstAmount: 606.67,
      netAmount: 6066.67,
      amountReceived: 6673.34,
      receivedDate: '2026-05-29',
      status: RentalIncomeStatus.RECEIVED,
      sourceStatementId: carbineJlbStmt1.id,
      notes: 'Rent from Raw Travel Pty Ltd, JLB Statement No.7.',
    },
    'rental income (Carbine Way): JLB Statement No.7',
  );

  const carbineJlbStmt2 = await findOrCreate(
    statementRepo,
    { propertyId: carbineWay.id, statementDate: '2026-06-29', periodStart: '2026-07-01' },
    {
      propertyId: carbineWay.id,
      managingAgentId: jacobsLowe.id,
      statementDate: '2026-06-29',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      grossIncome: 9091.98,
      totalExpenses: 2669.3,
      netToOwner: 6422.68,
      openingBalance: 0,
      closingBalance: 0,
      notes: 'Jacobs & Lowe Bennetts Statement No.8, ref 101428D. Owners Corporation Fees line covers 01/07-30/09/2026 (mixed billing period).',
    },
    'property statement (Carbine Way): JLB Statement No.8',
  );
  await findOrCreate(
    rentalIncomeRepo,
    { propertyId: carbineWay.id, periodStart: '2026-07-01', periodEnd: '2026-07-31', sourceStatementId: carbineJlbStmt2.id },
    {
      propertyId: carbineWay.id,
      leaseId: carbineLease.id,
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      grossAmount: 6066.67,
      gstAmount: 606.67,
      netAmount: 6066.67,
      amountReceived: 6673.34,
      receivedDate: '2026-06-29',
      status: RentalIncomeStatus.RECEIVED,
      sourceStatementId: carbineJlbStmt2.id,
      notes: 'Rent from Raw Travel Pty Ltd, JLB Statement No.8.',
    },
    'rental income (Carbine Way): JLB Statement No.8',
  );

  const carbineNcEoy = await findOrCreate(
    statementRepo,
    { propertyId: carbineWay.id, statementDate: '2026-07-03', periodStart: '2025-07-01' },
    {
      propertyId: carbineWay.id,
      managingAgentId: nicholsCrowder.id,
      statementDate: '2026-07-03',
      periodStart: '2025-07-01',
      periodEnd: '2026-06-30',
      grossIncome: 40607.51,
      totalExpenses: 10213.33,
      netToOwner: 34228.61,
      openingBalance: 0,
      closingBalance: 0,
      notes: 'Nichols Crowder End of Year statement, ex-GST. Only Jul-Oct 2025 columns are non-zero (agency changed to Jacobs & Lowe Bennetts mid-year).',
    },
    'property statement (Carbine Way): Nichols Crowder FY25-26 EOY',
  );
  const carbineJlbEoy = await findOrCreate(
    statementRepo,
    { propertyId: carbineWay.id, statementDate: '2026-07-02', periodStart: '2025-07-01' },
    {
      propertyId: carbineWay.id,
      managingAgentId: jacobsLowe.id,
      statementDate: '2026-07-02',
      periodStart: '2025-07-01',
      periodEnd: '2026-06-30',
      grossIncome: 57433.34,
      totalExpenses: 12772.41,
      netToOwner: 49411.98,
      openingBalance: 0,
      closingBalance: 0,
      notes: 'Jacobs & Lowe Bennetts End of Year statement, ex-GST. Nov 2025 column is $0 (handover gap between agents).',
    },
    'property statement (Carbine Way): JLB FY25-26 EOY',
  );
  void carbineNcEoy;
  void carbineJlbEoy;

  await findOrCreate(
    valuationRepo,
    { propertyId: carbineWay.id, valuationDate: '2026-06-30', valuationType: ValuationType.OWNER_ESTIMATE },
    {
      propertyId: carbineWay.id,
      valuationDate: '2026-06-30', // DERIVED: approximated, undated in source
      valuationAmount: 1100000,
      valuationType: ValuationType.OWNER_ESTIMATE,
      purpose: 'Portfolio / Jarvis Development reporting',
      notes:
        'Property profile "Current Valuation" — internally consistent with the profile\'s own stated 6.62% gross yield ($72,800/$1,100,000). ' +
        'CONFLICT: a master dashboard document instead states $1,330,000 for this property — the more detailed per-property profile was used per instructions.',
    },
    'valuation: Carbine Way (property profile estimate)',
  );
  await findOrCreate(
    valuationRepo,
    { propertyId: carbineWay.id, valuationDate: '2026-05-18', valuationType: ValuationType.INDEPENDENT },
    {
      propertyId: carbineWay.id,
      valuationDate: '2026-05-18', // real: date the Exclusive Sale Authority was signed
      valuationAmount: 1250000,
      valuationType: ValuationType.INDEPENDENT,
      valuer: 'Jacobs & Lowe-Bennetts Pty Ltd (selling agent)',
      purpose: 'Agent\'s statutory estimate of selling price (s47A Estate Agents Act 1980) / Vendor\'s price on Exclusive Sale Authority',
      notes:
        'From the signed Exclusive Sale Authority (18-05-2026): Vendor\'s price and agent\'s statutory estimate of selling price, both $1,250,000. ' +
        'Property is currently being marketed for sale subject to the existing Raw Travel Pty Ltd tenancy (commission 2.2% = $27,500 incl GST; ' +
        'marketing expenses $4,321 incl GST; exclusive authority period 90 days plus ongoing 60 days).',
    },
    'valuation: Carbine Way (sale authority estimate)',
  );

  // =========================================================================
  // Elite Way — FY EOY statement + latest monthly statement
  // =========================================================================
  console.log('\nElite Way: statements, income, expenses');

  const eliteEoy = await findOrCreate(
    statementRepo,
    { propertyId: eliteWay.id, statementDate: '2026-07-03', periodStart: '2025-07-01' },
    {
      propertyId: eliteWay.id,
      managingAgentId: nicholsCrowder.id,
      statementDate: '2026-07-03',
      periodStart: '2025-07-01',
      periodEnd: '2026-06-30',
      grossIncome: 154339.7,
      totalExpenses: 30323.46,
      netToOwner: 137272.94,
      openingBalance: 0,
      closingBalance: 0,
      notes: 'Nichols Crowder End of Year Receipts & Expenditure Statement. Figures ex-GST; netToOwner is the GST-inclusive Distribution to Owner total, which reconciles exactly.',
    },
    'property statement (Elite Way): FY25-26 EOY',
  );
  await findOrCreate(
    rentalIncomeRepo,
    { propertyId: eliteWay.id, periodStart: '2025-07-01', periodEnd: '2026-06-30', sourceStatementId: eliteEoy.id },
    {
      propertyId: eliteWay.id,
      leaseId: eliteLease.id,
      periodStart: '2025-07-01',
      periodEnd: '2026-06-30',
      grossAmount: 133751.6,
      outgoingsReimbursed: 20588.1,
      gstAmount: 15433.97,
      agentCommission: 5942.12,
      otherDeductions: 24381.34,
      netAmount: 137272.94,
      amountReceived: 137272.94,
      status: RentalIncomeStatus.RECEIVED,
      sourceStatementId: eliteEoy.id,
      notes: 'FY2025-26 total. Rent $133,729.99 + Rent Adjustment $21.61, ex GST, from Octagon Removals and Storage.',
    },
    'rental income (Elite Way): FY25-26',
  );
  const eliteEoyExpenses: { category: PropertyExpenseCategory; description: string; amount: number; recoverable: boolean; recovered?: number }[] = [
    { category: PropertyExpenseCategory.OTHER, description: 'End of Year Statement Fee', amount: 5.0, recoverable: false },
    { category: PropertyExpenseCategory.MAINTENANCE, description: 'Fire Protection', amount: 825.0, recoverable: true, recovered: 825.0 },
    { category: PropertyExpenseCategory.REPAIRS, description: 'Repairs & Maintenance', amount: 8233.41, recoverable: true, recovered: 5145.25 },
    { category: PropertyExpenseCategory.RATES, description: 'Council Rates', amount: 7321.0, recoverable: true, recovered: 7321.0 },
    { category: PropertyExpenseCategory.UTILITIES, description: 'Water Rates', amount: 1229.65, recoverable: true, recovered: 1229.65 },
    { category: PropertyExpenseCategory.MANAGEMENT_FEE, description: 'Management Fee', amount: 5942.12, recoverable: false },
    { category: PropertyExpenseCategory.OWNERS_CORP, description: 'OC Fees', amount: 6767.28, recoverable: true, recovered: 6067.2 },
  ];
  for (const e of eliteEoyExpenses) {
    await findOrCreate(
      expenseRepo,
      { propertyId: eliteWay.id, periodStart: '2025-07-01', periodEnd: '2026-06-30', category: e.category, description: e.description },
      {
        propertyId: eliteWay.id,
        expenseDate: '2026-06-30', // DERIVED: FY end used as a proxy; source only gives an annual total, no per-expense date
        periodStart: '2025-07-01',
        periodEnd: '2026-06-30',
        category: e.category,
        description: e.description,
        amount: e.amount,
        recoverableFromTenant: e.recoverable,
        recoveredAmount: e.recovered ?? 0,
        currency: 'AUD',
        notes: 'FY2025-26 total, Nichols Crowder EOY statement.',
      },
      `expense (Elite Way): ${e.description}`,
    );
  }

  const eliteJulyStmt = await findOrCreate(
    statementRepo,
    { propertyId: eliteWay.id, statementDate: '2026-07-02', periodStart: '2026-07-01' },
    {
      propertyId: eliteWay.id,
      managingAgentId: nicholsCrowder.id,
      statementDate: '2026-07-02',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      grossIncome: 13516.93,
      totalExpenses: 2770.28,
      netToOwner: 10746.65,
      openingBalance: 0,
      closingBalance: 0,
      notes: 'Nichols Crowder Statement No.50, ref 89974D. Figures GST-inclusive as presented.',
    },
    'property statement (Elite Way): Statement No.50, Jul 2026',
  );
  await findOrCreate(
    rentalIncomeRepo,
    { propertyId: eliteWay.id, periodStart: '2026-07-01', periodEnd: '2026-07-31', sourceStatementId: eliteJulyStmt.id },
    {
      propertyId: eliteWay.id,
      leaseId: eliteLease.id,
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      grossAmount: 11281.07,
      outgoingsReimbursed: 1007.05,
      gstAmount: 1228.81,
      agentCommission: 520.4,
      otherDeductions: 2249.88,
      netAmount: 10746.65,
      amountReceived: 10746.65,
      receivedDate: '2026-07-02',
      status: RentalIncomeStatus.RECEIVED,
      sourceStatementId: eliteJulyStmt.id,
      notes: 'July 2026 rent, Statement No.50.',
    },
    'rental income (Elite Way): Jul 2026',
  );
  const pilotOcInvoice = await findOrCreate(
    invoiceRepo,
    { invoiceNumber: '700071Y' },
    {
      propertyId: eliteWay.id,
      direction: InvoiceDirection.OUTGOING,
      invoiceType: InvoiceType.OWNERS_CORP,
      invoiceNumber: '700071Y',
      issuerName: 'Pilot Real Estate',
      issueDate: '2026-07-02',
      periodStart: '2026-08-01',
      periodEnd: '2026-10-31',
      subtotal: 1836.36,
      gstAmount: 183.64,
      totalAmount: 2020.0,
      currency: 'AUD',
      status: InvoiceStatus.CLASSIFIED,
      notes: 'OC 700071Y Lot 46. Deducted in Statement No.50.',
    },
    'invoice: Pilot Real Estate OC fees (Elite Way)',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: eliteWay.id, sourceInvoiceId: pilotOcInvoice.id },
    {
      propertyId: eliteWay.id,
      expenseDate: '2026-07-02',
      periodStart: '2026-08-01',
      periodEnd: '2026-10-31',
      category: PropertyExpenseCategory.OWNERS_CORP,
      description: 'OC Fees - Lot 46 (700071Y), Pilot Real Estate',
      amount: 1836.36,
      gstAmount: 183.64,
      currency: 'AUD',
      sourceInvoiceId: pilotOcInvoice.id,
    },
    'expense (Elite Way): OC fees Jul-Oct 2026',
  );
  const phase1Invoice = await findOrCreate(
    invoiceRepo,
    { invoiceNumber: '1467' },
    {
      propertyId: eliteWay.id,
      direction: InvoiceDirection.OUTGOING,
      invoiceType: InvoiceType.OTHER,
      invoiceNumber: '1467',
      issuerName: 'Phase 1 Fire Safety',
      issueDate: '2026-07-02',
      subtotal: 208.98,
      gstAmount: 20.9,
      totalAmount: 229.88,
      currency: 'AUD',
      status: InvoiceStatus.CLASSIFIED,
      notes: 'Extinguishers/Lights/Egress. Deducted in Statement No.50. No COMPLIANCE option exists on the invoice-type enum.',
    },
    'invoice: Phase 1 Fire Safety (Elite Way)',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: eliteWay.id, sourceInvoiceId: phase1Invoice.id },
    {
      propertyId: eliteWay.id,
      expenseDate: '2026-07-02',
      category: PropertyExpenseCategory.MAINTENANCE,
      description: 'Extinguishers/Lights/Egress - Phase 1 Fire Safety',
      amount: 208.98,
      gstAmount: 20.9,
      currency: 'AUD',
      sourceInvoiceId: phase1Invoice.id,
    },
    'expense (Elite Way): fire safety compliance',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: eliteWay.id, expenseDate: '2026-07-02', category: PropertyExpenseCategory.MANAGEMENT_FEE, periodStart: '2026-07-01' },
    {
      propertyId: eliteWay.id,
      expenseDate: '2026-07-02',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      category: PropertyExpenseCategory.MANAGEMENT_FEE,
      description: 'Commercial Management Fees',
      amount: 520.4,
      gstAmount: 47.31,
      currency: 'AUD',
      notes: 'Statement No.50.',
    },
    'expense (Elite Way): management fee Jul 2026',
  );

  await findOrCreate(
    valuationRepo,
    { propertyId: eliteWay.id, valuationDate: '2026-06-30' },
    {
      propertyId: eliteWay.id,
      valuationDate: '2026-06-30', // DERIVED: approximated, undated in source
      valuationAmount: 1950000,
      valuationType: ValuationType.OWNER_ESTIMATE,
      purpose: 'Portfolio / Jarvis Development reporting',
      notes: 'Property profile "Book Value (Carr Group Financial Reports)". No valuer or valuation date given.',
    },
    'valuation: Elite Way',
  );

  // =========================================================================
  // Wangara Road — FY EOY statement + 2 recent monthly statements
  // =========================================================================
  console.log('\nWangara Road: statements, income, expenses, maintenance');

  const wangaraEoy = await findOrCreate(
    statementRepo,
    { propertyId: wangaraRoad.id, statementDate: '2026-07-03', periodStart: '2025-07-01' },
    {
      propertyId: wangaraRoad.id,
      managingAgentId: nicholsCrowder.id,
      statementDate: '2026-07-03',
      periodStart: '2025-07-01',
      periodEnd: '2026-06-30',
      grossIncome: 222699.17,
      totalExpenses: 26313.64,
      netToOwner: 217596.99, // real cash distributed incl. GST retained + $4,000 heldover, per agent reconciliation
      openingBalance: 0,
      closingBalance: 0,
      notes: 'Nichols Crowder End of Year statement, ex-GST figures. Reconciles to $217,596.99 cash distributed (incl. GST retained + $4,000 heldover pending a new split-system install).',
    },
    'property statement (Wangara Road): FY25-26 EOY',
  );
  await findOrCreate(
    rentalIncomeRepo,
    { propertyId: wangaraRoad.id, periodStart: '2025-07-01', periodEnd: '2026-06-30', sourceStatementId: wangaraEoy.id },
    {
      propertyId: wangaraRoad.id,
      leaseId: wangaraLease.id,
      periodStart: '2025-07-01',
      periodEnd: '2026-06-30',
      grossAmount: 196189.33,
      outgoingsReimbursed: 26509.84,
      gstAmount: 22269.9,
      netAmount: 196385.53, // DERIVED: 222699.17 - 26313.64
      amountReceived: 217596.99,
      status: RentalIncomeStatus.RECEIVED,
      sourceStatementId: wangaraEoy.id,
      notes: 'FY2025-26 total from Thread Group Australia. Blended: 11 months at $16,308.34/mo + 1 month (June 2026) at the new post-review $16,797.59/mo.',
    },
    'rental income (Wangara Road): FY25-26',
  );
  const wangaraEoyExpenses: { category: PropertyExpenseCategory; description: string; amount: number; recoverable: boolean; recovered?: number }[] = [
    { category: PropertyExpenseCategory.RATES, description: 'Council Rates', amount: 11877.4, recoverable: true, recovered: 11877.4 },
    { category: PropertyExpenseCategory.UTILITIES, description: 'Water Rates', amount: 2064.85, recoverable: true, recovered: 2064.85 },
    { category: PropertyExpenseCategory.OTHER, description: 'Essential Safety Measures compliance cost', amount: 300.0, recoverable: true, recovered: 300.0 },
    { category: PropertyExpenseCategory.REPAIRS, description: 'Fire Protection', amount: 950.0, recoverable: true, recovered: 950.0 },
    { category: PropertyExpenseCategory.MAINTENANCE, description: 'Repairs & Maintenance', amount: 755.0, recoverable: true, recovered: 220.0 },
    { category: PropertyExpenseCategory.MANAGEMENT_FEE, description: 'Management Fee', amount: 8573.89, recoverable: false },
    { category: PropertyExpenseCategory.OWNERS_CORP, description: 'OC Fees', amount: 1787.5, recoverable: true, recovered: 1787.5 },
    { category: PropertyExpenseCategory.OTHER, description: 'End of Year Statement Fee', amount: 5.0, recoverable: false },
  ];
  for (const e of wangaraEoyExpenses) {
    await findOrCreate(
      expenseRepo,
      { propertyId: wangaraRoad.id, periodStart: '2025-07-01', periodEnd: '2026-06-30', category: e.category, description: e.description },
      {
        propertyId: wangaraRoad.id,
        expenseDate: '2026-06-30', // DERIVED: FY end used as a proxy; source only gives an annual total, no per-expense date
        periodStart: '2025-07-01',
        periodEnd: '2026-06-30',
        category: e.category,
        description: e.description,
        amount: e.amount,
        recoverableFromTenant: e.recoverable,
        recoveredAmount: e.recovered ?? 0,
        currency: 'AUD',
        notes: 'FY2025-26 total, Nichols Crowder EOY statement. Exact month-by-month timing within the FY could not be reliably reconstructed (a PDF text-extraction ordering issue) — only the annual total is seeded.',
      },
      `expense (Wangara Road): ${e.description}`,
    );
  }
  await findOrCreate(
    maintenanceRepo,
    { propertyId: wangaraRoad.id, description: 'New split system (CG)' },
    {
      propertyId: wangaraRoad.id,
      serviceDate: PLACEHOLDER_DATE,
      category: MaintenanceCategory.HVAC,
      vendor: 'UNKNOWN', // PLACEHOLDER: vendor not named anywhere
      description: 'New split system (CG)',
      cost: 4000.0,
      currency: 'AUD',
      notes:
        'PLACEHOLDER: serviceDate/vendor not stated — this appears only as a "Heldover" (withheld, not yet paid) ' +
        'line of $4,000.00 in the June 2026 statement, with no completion date or vendor name given.',
    },
    'maintenance (Wangara Road): new split system install ($4,000 heldover)',
  );

  const wangaraJunStmt = await findOrCreate(
    statementRepo,
    { propertyId: wangaraRoad.id, statementDate: '2026-06-18', periodStart: '2026-06-01' },
    {
      propertyId: wangaraRoad.id,
      managingAgentId: nicholsCrowder.id,
      statementDate: '2026-06-18',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      grossIncome: 18946.83,
      totalExpenses: 1251.97,
      netToOwner: 13694.86, // net of the $4,000 heldover
      openingBalance: 0,
      closingBalance: 0,
      notes: 'Nichols Crowder Statement No.44. $4,000.00 additionally held over pending the new split-system install (not distributed).',
    },
    'property statement (Wangara Road): Statement No.44, Jun 2026',
  );
  await findOrCreate(
    rentalIncomeRepo,
    { propertyId: wangaraRoad.id, periodStart: '2026-06-01', periodEnd: '2026-06-30', sourceStatementId: wangaraJunStmt.id },
    {
      propertyId: wangaraRoad.id,
      leaseId: wangaraLease.id,
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      grossAmount: 16797.59,
      outgoingsReimbursed: 426.8,
      netAmount: 17224.39,
      amountReceived: 13694.86,
      receivedDate: '2026-06-18',
      status: RentalIncomeStatus.RECEIVED,
      sourceStatementId: wangaraJunStmt.id,
      notes: 'June 2026 rent + water rates reimbursement, Statement No.44.',
    },
    'rental income (Wangara Road): Jun 2026',
  );
  const allAngleInvoice = await findOrCreate(
    invoiceRepo,
    { invoiceNumber: '2811' },
    {
      propertyId: wangaraRoad.id,
      direction: InvoiceDirection.OUTGOING,
      invoiceType: InvoiceType.MAINTENANCE,
      invoiceNumber: '2811',
      issuerName: 'All Angle Electrical',
      issueDate: '2026-05-13',
      subtotal: 475.0,
      gstAmount: 47.5,
      totalAmount: 522.5,
      currency: 'AUD',
      status: InvoiceStatus.PAID,
      notes: 'Exit Light Test. Deducted from owner in the June 2026 statement, then shown recovered/reimbursed in the July 2026 statement.',
    },
    'invoice: All Angle Electrical (Wangara Road)',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: wangaraRoad.id, sourceInvoiceId: allAngleInvoice.id },
    {
      propertyId: wangaraRoad.id,
      expenseDate: '2026-06-18',
      category: PropertyExpenseCategory.REPAIRS,
      description: 'Exit Light Test - All Angle Electrical (invoice #2811)',
      amount: 475.0,
      gstAmount: 47.5,
      currency: 'AUD',
      recoverableFromTenant: true,
      recoveredAmount: 475.0,
      sourceInvoiceId: allAngleInvoice.id,
    },
    'expense (Wangara Road): exit light test',
  );
  await findOrCreate(
    maintenanceRepo,
    { propertyId: wangaraRoad.id, serviceDate: '2026-05-13', vendor: 'All Angle Electrical' },
    {
      propertyId: wangaraRoad.id,
      serviceDate: '2026-05-13',
      category: MaintenanceCategory.ELECTRICAL,
      vendor: 'All Angle Electrical',
      description: 'Exit Light Test',
      cost: 475.0,
      gstAmount: 47.5,
      currency: 'AUD',
      sourceInvoiceId: allAngleInvoice.id,
    },
    'maintenance (Wangara Road): exit light test',
  );

  const wangaraJulStmt = await findOrCreate(
    statementRepo,
    { propertyId: wangaraRoad.id, statementDate: '2026-07-09', periodStart: '2026-07-01' },
    {
      propertyId: wangaraRoad.id,
      managingAgentId: nicholsCrowder.id,
      statementDate: '2026-07-09',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      grossIncome: 18999.85,
      totalExpenses: 731.5,
      netToOwner: 18268.35,
      openingBalance: 0,
      closingBalance: 0,
      notes: 'Nichols Crowder Statement No.46.',
    },
    'property statement (Wangara Road): Statement No.46, Jul 2026',
  );
  await findOrCreate(
    rentalIncomeRepo,
    { propertyId: wangaraRoad.id, periodStart: '2026-07-01', periodEnd: '2026-07-31', sourceStatementId: wangaraJulStmt.id },
    {
      propertyId: wangaraRoad.id,
      leaseId: wangaraLease.id,
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      grossAmount: 16797.59,
      outgoingsReimbursed: 475.0,
      netAmount: 17272.59,
      amountReceived: 18268.35,
      receivedDate: '2026-07-09',
      status: RentalIncomeStatus.RECEIVED,
      sourceStatementId: wangaraJulStmt.id,
      notes: 'July 2026 rent + exit-light-test reimbursement, Statement No.46.',
    },
    'rental income (Wangara Road): Jul 2026',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: wangaraRoad.id, expenseDate: '2026-07-09', category: PropertyExpenseCategory.MANAGEMENT_FEE, periodStart: '2026-07-01' },
    {
      propertyId: wangaraRoad.id,
      expenseDate: '2026-07-09',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      category: PropertyExpenseCategory.MANAGEMENT_FEE,
      description: 'Commercial Management Fees',
      amount: 665.0,
      gstAmount: 66.5,
      currency: 'AUD',
      notes: 'Statement No.46.',
    },
    'expense (Wangara Road): management fee Jul 2026',
  );

  await findOrCreate(
    valuationRepo,
    { propertyId: wangaraRoad.id, valuationDate: '2026-06-30' },
    {
      propertyId: wangaraRoad.id,
      valuationDate: '2026-06-30', // DERIVED: approximated, undated in source
      valuationAmount: 3480000,
      valuationType: ValuationType.OWNER_ESTIMATE,
      purpose: 'Portfolio / Jarvis Development reporting',
      notes: 'Property profile "Current Market Value". No valuer or valuation date given. Matches master dashboard exactly.',
    },
    'valuation: Wangara Road',
  );

  // =========================================================================
  // Raylee Place — FY EOY + 2 recent statements + management authority
  // =========================================================================
  console.log('\nRaylee Place: statements, income, expenses');

  const rayleeEoy = await findOrCreate(
    statementRepo,
    { propertyId: rayleePlace.id, statementDate: '2026-07-03', periodStart: '2025-07-01' },
    {
      propertyId: rayleePlace.id,
      managingAgentId: nicholsCrowder.id,
      statementDate: '2026-07-03',
      periodStart: '2025-07-01',
      periodEnd: '2026-06-30',
      grossIncome: 258629.48,
      totalExpenses: 51291.01,
      netToOwner: 232175.18,
      openingBalance: 0,
      closingBalance: 0,
      notes: 'Nichols Crowder End of Year statement, ex-GST. GST Summary shows net GST $24,836.71 for the year.',
    },
    'property statement (Raylee Place): FY25-26 EOY',
  );
  await findOrCreate(
    rentalIncomeRepo,
    { propertyId: rayleePlace.id, periodStart: '2025-07-01', periodEnd: '2026-06-30', sourceStatementId: rayleeEoy.id },
    {
      propertyId: rayleePlace.id,
      leaseId: rayleeLease.id,
      periodStart: '2025-07-01',
      periodEnd: '2026-06-30',
      grossAmount: 218631.25, // FY total ex GST: 11 months @ $18,162.50 + 1 month (Jun 2026) @ $18,843.75
      netAmount: 218631.25,
      amountReceived: 232175.18,
      status: RentalIncomeStatus.RECEIVED,
      sourceStatementId: rayleeEoy.id,
      notes: 'FY2025-26 total rent from AMX Superstores, ex GST. Blended: 11 months at $18,162.50/mo + June 2026 at the new post-review $18,843.75/mo.',
    },
    'rental income (Raylee Place): FY25-26',
  );
  const rayleeEoyExpenses: { category: PropertyExpenseCategory; description: string; amount: number; recoverable: boolean; recovered?: number }[] = [
    { category: PropertyExpenseCategory.RATES, description: 'Council Rates', amount: 13980.05, recoverable: true, recovered: 13980.05 },
    { category: PropertyExpenseCategory.UTILITIES, description: 'Water Rates', amount: 2599.88, recoverable: true, recovered: 2599.88 },
    { category: PropertyExpenseCategory.OTHER, description: 'Essential Safety Measures', amount: 300.0, recoverable: true, recovered: 300.0 },
    { category: PropertyExpenseCategory.MANAGEMENT_FEE, description: 'Management Fee', amount: 9957.28, recoverable: false },
    { category: PropertyExpenseCategory.OWNERS_CORP, description: 'OC Fees', amount: 24448.8, recoverable: true, recovered: 23118.3 },
    { category: PropertyExpenseCategory.OTHER, description: 'End of Year Statement Fee', amount: 5.0, recoverable: false },
  ];
  for (const e of rayleeEoyExpenses) {
    await findOrCreate(
      expenseRepo,
      { propertyId: rayleePlace.id, periodStart: '2025-07-01', periodEnd: '2026-06-30', category: e.category, description: e.description },
      {
        propertyId: rayleePlace.id,
        expenseDate: '2026-06-30', // DERIVED: FY end used as a proxy; source only gives an annual total, no per-expense date
        periodStart: '2025-07-01',
        periodEnd: '2026-06-30',
        category: e.category,
        description: e.description,
        amount: e.amount,
        recoverableFromTenant: e.recoverable,
        recoveredAmount: e.recovered ?? 0,
        currency: 'AUD',
        notes: e.description === 'OC Fees' ? 'FY total paid $24,448.80 exceeds FY total recovered $23,118.30 by $1,330.50 - unexplained shortfall in the source document.' : 'FY2025-26 total, Nichols Crowder EOY statement.',
      },
      `expense (Raylee Place): ${e.description}`,
    );
  }

  const rayleeJunStmt = await findOrCreate(
    statementRepo,
    { propertyId: rayleePlace.id, statementDate: '2026-06-02', periodStart: '2026-06-01' },
    {
      propertyId: rayleePlace.id,
      managingAgentId: nicholsCrowder.id,
      statementDate: '2026-06-02',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      grossIncome: 20728.13,
      totalExpenses: 4360.98,
      netToOwner: 16367.15,
      openingBalance: 0,
      closingBalance: 0,
      notes: 'Nichols Crowder Statement No.49, ref 88421D. Figures GST-inclusive.',
    },
    'property statement (Raylee Place): Statement No.49, Jun 2026',
  );
  await findOrCreate(
    rentalIncomeRepo,
    { propertyId: rayleePlace.id, periodStart: '2026-06-01', periodEnd: '2026-06-30', sourceStatementId: rayleeJunStmt.id },
    {
      propertyId: rayleePlace.id,
      leaseId: rayleeLease.id,
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      grossAmount: 18843.75,
      gstAmount: 1884.38,
      netAmount: 18843.75,
      otherDeductions: 3562.95,
      agentCommission: 798.03,
      amountReceived: 16367.15,
      receivedDate: '2026-06-02',
      status: RentalIncomeStatus.RECEIVED,
      sourceStatementId: rayleeJunStmt.id,
      notes: 'June 2026 rent, Statement No.49 (last Nichols Crowder statement before the agency change).',
    },
    'rental income (Raylee Place): Jun 2026',
  );
  const rayleeOcInvoice = await findOrCreate(
    invoiceRepo,
    { invoiceNumber: '614691V Lot 1' },
    {
      propertyId: rayleePlace.id,
      direction: InvoiceDirection.OUTGOING,
      invoiceType: InvoiceType.OWNERS_CORP,
      invoiceNumber: '614691V Lot 1',
      issuerName: 'Richardson French Owners Corporation (OC 614691V)',
      issueDate: '2026-06-02',
      subtotal: 3562.95,
      gstAmount: 0,
      totalAmount: 3562.95,
      currency: 'AUD',
      status: InvoiceStatus.PAID,
      notes: 'Remitted via Nichols Crowder, deducted from June 2026 owner distribution.',
    },
    'invoice: Richardson French OC (Raylee Place)',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: rayleePlace.id, sourceInvoiceId: rayleeOcInvoice.id },
    {
      propertyId: rayleePlace.id,
      expenseDate: '2026-06-02',
      category: PropertyExpenseCategory.OWNERS_CORP,
      description: 'OC Fees - Lot 1, OC 614691V (Richardson French)',
      amount: 3562.95,
      currency: 'AUD',
      sourceInvoiceId: rayleeOcInvoice.id,
    },
    'expense (Raylee Place): OC fees Jun 2026',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: rayleePlace.id, expenseDate: '2026-06-02', category: PropertyExpenseCategory.MANAGEMENT_FEE, periodStart: '2026-06-01' },
    {
      propertyId: rayleePlace.id,
      expenseDate: '2026-06-02',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      category: PropertyExpenseCategory.MANAGEMENT_FEE,
      description: 'Commercial Management Fees',
      amount: 725.48,
      gstAmount: 72.55,
      currency: 'AUD',
      notes: 'Statement No.49.',
    },
    'expense (Raylee Place): management fee Jun 2026',
  );

  const rayleeJulStmt = await findOrCreate(
    statementRepo,
    { propertyId: rayleePlace.id, statementDate: '2026-07-03', periodStart: '2026-07-01' },
    {
      propertyId: rayleePlace.id,
      managingAgentId: jacobsLowe.id,
      statementDate: '2026-07-03',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      grossIncome: 24647.38,
      totalExpenses: 810.47,
      netToOwner: 23836.91,
      openingBalance: 0,
      closingBalance: 0,
      notes: 'Jacobs & Lowe Bennetts Statement No.1, ref 101656D — first statement after the agency changed from Nichols Crowder. Figures GST-inclusive.',
    },
    'property statement (Raylee Place): JLB Statement No.1, Jul 2026',
  );
  await findOrCreate(
    rentalIncomeRepo,
    { propertyId: rayleePlace.id, periodStart: '2026-07-01', periodEnd: '2026-07-31', sourceStatementId: rayleeJulStmt.id },
    {
      propertyId: rayleePlace.id,
      leaseId: rayleeLease.id,
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      grossAmount: 20728.13,
      outgoingsReimbursed: 3919.25,
      gstAmount: 1884.38,
      agentCommission: 810.47,
      netAmount: 18843.75,
      amountReceived: 23836.91,
      receivedDate: '2026-07-03',
      status: RentalIncomeStatus.RECEIVED,
      sourceStatementId: rayleeJulStmt.id,
      notes: 'July 2026 rent + OC fee income, JLB Statement No.1.',
    },
    'rental income (Raylee Place): Jul 2026',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: rayleePlace.id, expenseDate: '2026-07-03', category: PropertyExpenseCategory.MANAGEMENT_FEE, periodStart: '2026-07-01' },
    {
      propertyId: rayleePlace.id,
      expenseDate: '2026-07-03',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      category: PropertyExpenseCategory.MANAGEMENT_FEE,
      description: 'Management Fees on Rental',
      amount: 736.79,
      gstAmount: 73.68,
      currency: 'AUD',
      notes: 'JLB Statement No.1, ref 101656D.',
    },
    'expense (Raylee Place): management fee Jul 2026',
  );

  await findOrCreate(
    valuationRepo,
    { propertyId: rayleePlace.id, valuationDate: '2026-06-30', valuationType: ValuationType.OWNER_ESTIMATE },
    {
      propertyId: rayleePlace.id,
      valuationDate: '2026-06-30', // DERIVED: approximated "current", undated in source
      valuationAmount: 3488000,
      valuationType: ValuationType.OWNER_ESTIMATE,
      purpose: 'Portfolio / Jarvis Development reporting - current',
      notes: 'Property profile "Current Market Value". Yield 6.48% ($226,125/$3,488,000) internally consistent. No valuer or exact date given.',
    },
    'valuation: Raylee Place (current)',
  );
  await findOrCreate(
    valuationRepo,
    { propertyId: rayleePlace.id, valuationDate: '2026-01-01', valuationType: ValuationType.OWNER_ESTIMATE },
    {
      propertyId: rayleePlace.id,
      valuationDate: '2026-01-01', // PLACEHOLDER: property profile gives no date for the "previous" valuation; set to start-of-year as an obviously-approximate marker
      valuationAmount: 3172197,
      valuationType: ValuationType.OWNER_ESTIMATE,
      purpose: 'Portfolio / Jarvis Development reporting - previous',
      notes: 'PLACEHOLDER date: property profile states a "Previous Valuation" of $3,172,197 with no date given at all - 1 Jan 2026 used as an obviously-approximate placeholder marker, not a real valuation date.',
    },
    'valuation: Raylee Place (previous)',
  );

  // =========================================================================
  // Vale Road — capital-works payment only (no tenant/lease, see property notes)
  // =========================================================================
  console.log('\nVale Road: capital works invoices/expenses (no lease/tenant - see notes)');

  const oxleyInvoice1 = await findOrCreate(
    invoiceRepo,
    { invoiceNumber: 'INV-0201' },
    {
      propertyId: valeRoad.id,
      direction: InvoiceDirection.OUTGOING,
      invoiceType: InvoiceType.CAPITAL_WORKS,
      invoiceNumber: 'INV-0201',
      issuerName: 'Oxley Frame & Truss Pty Ltd',
      issueDate: '2026-07-01',
      subtotal: 61496.24,
      gstAmount: 0,
      totalAmount: 61496.24,
      currency: 'AUD',
      status: InvoiceStatus.PAID,
      paidDate: '2026-07-30',
      paidAmount: 61496.24,
      notes:
        'CONFLICT/UNCERTAIN CLASSIFICATION: remittance advice shows A & H Carr Holdings (letterhead/payer position) ' +
        'paying Oxley Frame & Truss Pty Ltd (addressee/payee position, PO Box 786, Bowral NSW 2576). Classified as ' +
        'OUTGOING capital works given the "Frame & Truss" (structural building materials) trade name, but this is ' +
        'an inference, not explicitly labelled on the document. No GST breakdown shown on the remittance (single ' +
        '"Invoice Total" column only). This is the SAME dollar figure ($61,496.24) that the property profile calls ' +
        'the tenant\'s "monthly rent" — see the property\'s own notes for the full tenant-identity conflict.',
    },
    'invoice: Oxley Frame & Truss INV-0201 (Vale Road)',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: valeRoad.id, sourceInvoiceId: oxleyInvoice1.id },
    {
      propertyId: valeRoad.id,
      expenseDate: '2026-07-30',
      category: PropertyExpenseCategory.CAPITAL_WORKS,
      description: 'Payment to Oxley Frame & Truss Pty Ltd, invoice INV-0201 (dated 1 Jul 2026)',
      amount: 61496.24,
      currency: 'AUD',
      paidDate: '2026-07-30',
      sourceInvoiceId: oxleyInvoice1.id,
      notes: 'Category is an inference (trade name suggests structural building materials) - not explicitly labelled on the source document.',
    },
    'expense (Vale Road): Oxley Frame & Truss INV-0201',
  );

  const oxleyInvoice2 = await findOrCreate(
    invoiceRepo,
    { invoiceNumber: 'INV-203' },
    {
      propertyId: valeRoad.id,
      direction: InvoiceDirection.OUTGOING,
      invoiceType: InvoiceType.CAPITAL_WORKS,
      invoiceNumber: 'INV-203',
      issuerName: 'Oxley Frame & Truss Pty Ltd',
      issueDate: '2026-07-15',
      subtotal: 6382.2,
      gstAmount: 0,
      totalAmount: 6382.2,
      currency: 'AUD',
      status: InvoiceStatus.PAID,
      paidDate: '2026-07-30',
      paidAmount: 6382.2,
      notes: 'Same remittance advice as INV-0201 (combined total paid $67,878.44). Same classification caveats apply.',
    },
    'invoice: Oxley Frame & Truss INV-203 (Vale Road)',
  );
  await findOrCreate(
    expenseRepo,
    { propertyId: valeRoad.id, sourceInvoiceId: oxleyInvoice2.id },
    {
      propertyId: valeRoad.id,
      expenseDate: '2026-07-30',
      category: PropertyExpenseCategory.CAPITAL_WORKS,
      description: 'Payment to Oxley Frame & Truss Pty Ltd, invoice INV-203 (dated 15 Jul 2026)',
      amount: 6382.2,
      currency: 'AUD',
      paidDate: '2026-07-30',
      sourceInvoiceId: oxleyInvoice2.id,
    },
    'expense (Vale Road): Oxley Frame & Truss INV-203',
  );

  await findOrCreate(
    valuationRepo,
    { propertyId: valeRoad.id, valuationDate: '2026-06-30' },
    {
      propertyId: valeRoad.id,
      valuationDate: '2026-06-30', // DERIVED: approximated, undated in source
      valuationAmount: 18000000,
      valuationType: ValuationType.OWNER_ESTIMATE,
      purpose: 'Portfolio / Jarvis Development reporting',
      notes:
        'Property profile "Current Market Value". Largest asset in the portfolio by value. Docx-derived annualised ' +
        'rent of $737,954.88 ($61,496.24/mo x 12) does not exactly match a master dashboard document\'s $747,456 ' +
        'figure for this property (~$9,501 unexplained gap) — neither figure was used for a RentalIncome/Lease ' +
        'record given the unresolved tenant-identity conflict; see property notes.',
    },
    'valuation: Vale Road',
  );

  // =========================================================================
  // Personal-use properties — valuations only
  // =========================================================================
  console.log('\nPersonal properties: valuations');

  await findOrCreate(
    valuationRepo,
    { propertyId: homeWattsParade.id, valuationDate: '2026-06-30' },
    {
      propertyId: homeWattsParade.id,
      valuationDate: '2026-06-30', // DERIVED: approximated "current", undated in source
      valuationAmount: 12000000,
      valuationType: ValuationType.OWNER_ESTIMATE,
      purpose: 'Carr Group Asset Register',
      notes: 'Property profile "Current Estimated Market Value". No valuer or exact date given. Personal-use lifestyle asset, not income-producing.',
    },
    'valuation: 27 Watts',
  );

  await findOrCreate(
    valuationRepo,
    { propertyId: kilparra.id, valuationDate: '2026-06-30' },
    {
      propertyId: kilparra.id,
      valuationDate: '2026-06-30', // DERIVED: approximated "current", undated in source
      valuationAmount: 1000000,
      valuationType: ValuationType.OWNER_ESTIMATE,
      purpose: 'Carr Group Asset Register',
      notes: 'Property profile "Current Working Valuation". No valuer or exact date given. Personal-use asset, not income-producing.',
    },
    'valuation: Kilparra',
  );

  await findOrCreate(
    valuationRepo,
    { propertyId: springSt.id, valuationDate: '2026-06-30' },
    {
      propertyId: springSt.id,
      valuationDate: '2026-06-30', // DERIVED: approximated "current", undated in source
      valuationAmount: 5000000,
      valuationType: ValuationType.OWNER_ESTIMATE,
      purpose: 'Carr Group Asset Register',
      notes: 'Property profile "Current Estimated Market Value". No valuer or exact date given. Personal-use lifestyle asset, not income-producing.',
    },
    'valuation: 17 Spring St',
  );

  // =========================================================================
  // Documents (metadata only — no file storage configured, see gap report)
  // =========================================================================
  console.log('\nDocument metadata (no file storage configured)');

  type DocSpec = { propertyId: string; documentType: DocumentType; title: string; description?: string; documentDate: string };
  const FILE_DATE = '2026-07-31'; // DERIVED: real filesystem modified-date proxy for documents with no in-document date
  const docs: DocSpec[] = [
    // 996 Nepean Highway
    { propertyId: nepeanHwy.id, documentType: DocumentType.OTHER, title: '996 Nepean Highway Property Profile', documentDate: FILE_DATE },
    { propertyId: nepeanHwy.id, documentType: DocumentType.LEASE, title: 'Agreement for Lease - 996 Nepean Highway (Execution Version, 12.05.26)', documentDate: '2026-05-25', description: 'Underlying AFL is dated 25 May 2026 per the executed Lease\'s own recitals.' },
    { propertyId: nepeanHwy.id, documentType: DocumentType.LEASE, title: 'Lease - 996 Nepean Highway (Execution Version, 29.06.26)', documentDate: '2026-06-29' },
    { propertyId: nepeanHwy.id, documentType: DocumentType.OTHER, title: 'BMT Tax Depreciation Schedule', documentDate: '2025-07-22' },
    { propertyId: nepeanHwy.id, documentType: DocumentType.INVOICE, title: 'Cleanline Property Services Tax Invoice #240', documentDate: '2026-08-01' },
    { propertyId: nepeanHwy.id, documentType: DocumentType.OTHER, title: 'Record Automatic Doors Jobcard #87690', documentDate: '2026-06-01' },
    { propertyId: nepeanHwy.id, documentType: DocumentType.INVOICE, title: 'EnergyAustralia Electricity Tax Invoice 091902218918', documentDate: '2026-03-23' },
    { propertyId: nepeanHwy.id, documentType: DocumentType.COMMISSION_INVOICE, title: 'Jacobs & Lowe Bennetts Leasing Commission Invoice 39519573', documentDate: '2026-06-01' },
    { propertyId: nepeanHwy.id, documentType: DocumentType.COMMISSION_INVOICE, title: 'CBRE Leasing Commission Invoice 41AT10013788', documentDate: '2026-06-02' },
    { propertyId: nepeanHwy.id, documentType: DocumentType.INVOICE, title: 'Becon Constructions Tax Invoice 8198 (Fit-Out Progress Claim 2)', documentDate: '2026-05-31' },
    { propertyId: nepeanHwy.id, documentType: DocumentType.OTHER, title: 'Record Automatic Doors Preventative Maintenance Proposal PM7231 (unsigned)', documentDate: '2025-04-24' },

    // 177 Mornington Tyabb Road
    { propertyId: morningtonTyabb.id, documentType: DocumentType.OTHER, title: '5/177-179 Mornington Tyabb Road Property Profile', documentDate: FILE_DATE },
    { propertyId: morningtonTyabb.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'End of Year Statement FY25-26 (Nichols Crowder)', documentDate: '2026-07-03' },
    { propertyId: morningtonTyabb.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Commercial Statement #171', documentDate: '2026-05-26' },
    { propertyId: morningtonTyabb.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Commercial Statement #172', documentDate: '2026-06-01' },
    { propertyId: morningtonTyabb.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Commercial Statement #173', documentDate: '2026-06-09' },
    { propertyId: morningtonTyabb.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Commercial Statement #174', documentDate: '2026-06-16' },
    { propertyId: morningtonTyabb.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Commercial Statement #175', documentDate: '2026-06-23' },
    { propertyId: morningtonTyabb.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Commercial Statement #176', documentDate: '2026-07-01' },
    { propertyId: morningtonTyabb.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Commercial Statement #178', documentDate: '2026-07-14' },
    { propertyId: morningtonTyabb.id, documentType: DocumentType.INVOICE, title: 'South East Water account statement', documentDate: '2026-06-22' },

    // Carbine Way
    { propertyId: carbineWay.id, documentType: DocumentType.OTHER, title: 'Carbine Way Property Profile', documentDate: FILE_DATE },
    { propertyId: carbineWay.id, documentType: DocumentType.RENT_REVIEW_NOTICE, title: 'Rent Review Notice - Nichols Crowder', documentDate: '2025-08-12' },
    { propertyId: carbineWay.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Jacobs & Lowe Bennetts Statement No.7', documentDate: '2026-05-29' },
    { propertyId: carbineWay.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Jacobs & Lowe Bennetts Statement No.8', documentDate: '2026-06-29' },
    { propertyId: carbineWay.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'End of Year Statement FY25-26 (Nichols Crowder)', documentDate: '2026-07-03' },
    { propertyId: carbineWay.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'End of Year Statement FY25-26 (Jacobs & Lowe Bennetts)', documentDate: '2026-07-02' },
    { propertyId: carbineWay.id, documentType: DocumentType.OTHER, title: 'Exclusive Sale Authority (REIV Code 002)', documentDate: '2026-05-18' },

    // Elite Way
    { propertyId: eliteWay.id, documentType: DocumentType.OTHER, title: '6 Elite Way Mornington Profile', documentDate: FILE_DATE },
    { propertyId: eliteWay.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'End of Year Statement FY25-26 (Nichols Crowder)', documentDate: '2026-07-03' },
    { propertyId: eliteWay.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Commercial Statement No.50', documentDate: '2026-07-02' },

    // Wangara Road
    { propertyId: wangaraRoad.id, documentType: DocumentType.OTHER, title: 'Wangara Road Cheltenham Property Profile', documentDate: FILE_DATE },
    { propertyId: wangaraRoad.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Commercial Statement No.44', documentDate: '2026-06-18' },
    { propertyId: wangaraRoad.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Commercial Statement No.46', documentDate: '2026-07-09' },
    { propertyId: wangaraRoad.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'End of Year Statement FY25-26 (Nichols Crowder)', documentDate: '2026-07-03' },

    // Raylee Place
    { propertyId: rayleePlace.id, documentType: DocumentType.OTHER, title: '1 Raylee Place Lynbrook Property Profile', documentDate: FILE_DATE },
    { propertyId: rayleePlace.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Jacobs & Lowe Bennetts Statement No.1', documentDate: '2026-07-03' },
    { propertyId: rayleePlace.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'End of Year Statement FY25-26 (Nichols Crowder)', documentDate: '2026-07-03' },
    { propertyId: rayleePlace.id, documentType: DocumentType.PROPERTY_STATEMENT, title: 'Commercial Statement No.49', documentDate: '2026-06-02' },
    { propertyId: rayleePlace.id, documentType: DocumentType.OTHER, title: 'Exclusive Commercial Property Management Authority (RAYL1)', documentDate: '2026-06-23' },

    // Vale Road
    { propertyId: valeRoad.id, documentType: DocumentType.OTHER, title: 'Vale Road Moss Vale Property Profile (Updated)', documentDate: FILE_DATE },
    { propertyId: valeRoad.id, documentType: DocumentType.INVOICE, title: 'Remittance Advice - Oxley Frame & Truss Pty Ltd', documentDate: '2026-07-30' },

    // Personal properties
    { propertyId: homeWattsParade.id, documentType: DocumentType.OTHER, title: '27 Watts Property Profile', documentDate: FILE_DATE },
    { propertyId: kilparra.id, documentType: DocumentType.OTHER, title: 'Kilparra Property Profile', documentDate: FILE_DATE },
    { propertyId: springSt.id, documentType: DocumentType.OTHER, title: '17 Spring St Property Profile', documentDate: FILE_DATE },
  ];

  for (const d of docs) {
    await findOrCreate(
      documentRepo,
      { propertyId: d.propertyId, title: d.title },
      {
        propertyId: d.propertyId,
        documentType: d.documentType,
        title: d.title,
        description: d.description ?? null,
        documentDate: d.documentDate,
      },
      `document: ${d.title}`,
    );
  }

  console.log('\nDone.');
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
