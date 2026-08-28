/**
 * Adds a small, self-contained set of demo records purely to exercise every category of the
 * /reminders feed with an OVERDUE example: a lease expiry, a rent review, an insurance renewal,
 * and unpaid rental (both "invoiced but not confirmed received" and "never recorded" variants).
 *
 * Everything here lives under one new property ("88 Demo Street, Demoville") so it's obvious
 * what's demo data and trivial to remove later (see the DELETE block commented at the bottom).
 * Idempotent: re-running finds the existing demo property/tenant/lease by name and skips them.
 *
 * Run with:
 *   SEED_OWNER_ID=<supabase-user-uuid> npm run seed:reminder-demo
 */
import dataSource from '../core/database/data-source';
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
import { RentalIncomeEntity, RentalIncomeStatus } from '../entities/rental-income.entity';
import { DocumentEntity, DocumentType, DocumentIngestionStatus, DocumentClassificationStatus } from '../entities/document.entity';
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

async function main() {
  await dataSource.initialize();
  console.log(`Seeding reminder demo data for owner ${ownerId}...\n`);

  const propertyRepo = dataSource.getRepository(PropertyEntity);
  const tenantRepo = dataSource.getRepository(TenantEntity);
  const leaseRepo = dataSource.getRepository(LeaseEntity);
  const rentalIncomeRepo = dataSource.getRepository(RentalIncomeEntity);
  const documentRepo = dataSource.getRepository(DocumentEntity);

  const property = await findOrCreate(
    propertyRepo,
    { name: 'Demo Reminder Property' },
    {
      name: 'Demo Reminder Property',
      addressLine1: '88 Demo Street',
      suburb: 'Demoville',
      state: 'VIC',
      postcode: '3000',
      country: 'AU',
      propertyType: PropertyType.COMMERCIAL,
      status: PropertyStatus.ACTIVE,
      category: PropertyCategory.INVESTMENT,
      purchaseDate: '2019-06-01',
      purchasePrice: 1200000,
      purchaseCosts: 45000,
      purchaseCurrency: 'AUD',
      notes: 'DEMO DATA — seeded purely to exercise the reminders feature. Safe to delete.',
    },
    'property: Demo Reminder Property',
  );

  const tenant = await findOrCreate(
    tenantRepo,
    { name: 'Demo Tenant Pty Ltd' },
    {
      name: 'Demo Tenant Pty Ltd',
      entityType: TenantEntityType.COMPANY,
      contactName: 'Jamie Demo',
      email: 'jamie@demotenant.example',
      notes: 'DEMO DATA — safe to delete.',
    },
    'tenant: Demo Tenant Pty Ltd',
  );

  // Lease expired last month, and its rent review lapsed a few weeks ago too — both surface as
  // OVERDUE under LEASE_EXPIRY and RENT_REVIEW.
  const lease = await findOrCreate(
    leaseRepo,
    { propertyId: property.id, tenantId: tenant.id },
    {
      propertyId: property.id,
      tenantId: tenant.id,
      status: LeaseStatus.ACTIVE,
      commencementDate: '2020-01-01',
      expiryDate: '2026-07-15',
      initialTermMonths: 60,
      baseRentAnnual: 96000,
      rentFrequency: RentFrequency.MONTHLY,
      outgoingsRecoveryType: OutgoingsRecoveryType.NET,
      rentReviewMechanism: RentReviewMechanism.FIXED_PERCENT,
      rentReviewValue: 3,
      nextReviewDate: '2026-08-01',
      bondAmount: 8000,
      bondType: BondType.BANK_GUARANTEE,
      notes: 'DEMO DATA — safe to delete.',
    },
    'lease: Demo Reminder Property <> Demo Tenant Pty Ltd',
  );

  // July's rent was invoiced but never confirmed received -> UNPAID_RENTAL overdue.
  // Earlier months (June, May, ...) deliberately have NO rental income row at all, so the
  // reminders feed's "never recorded" check picks them up too, for the same lease.
  await findOrCreate(
    rentalIncomeRepo,
    { leaseId: lease.id, periodStart: '2026-07-01' },
    {
      propertyId: property.id,
      leaseId: lease.id,
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      grossAmount: 8000,
      outgoingsReimbursed: 0,
      gstAmount: 800,
      agentCommission: 400,
      otherDeductions: 0,
      netAmount: 7600,
      status: RentalIncomeStatus.INVOICED,
      notes: 'DEMO DATA — safe to delete.',
    },
    'rental income: Demo Reminder Property, Jul 2026 (invoiced, unconfirmed)',
  );

  // Public liability policy lapsed at the end of June -> COMPLIANCE_RENEWAL overdue.
  await findOrCreate(
    documentRepo,
    { propertyId: property.id, documentType: DocumentType.INSURANCE_POLICY },
    {
      propertyId: property.id,
      documentType: DocumentType.INSURANCE_POLICY,
      title: 'Public liability insurance policy',
      description: 'DEMO DATA — safe to delete.',
      documentDate: '2025-06-30',
      expiryDate: '2026-06-30',
      ingestionStatus: DocumentIngestionStatus.SKIPPED,
      classificationStatus: DocumentClassificationStatus.USER_CONFIRMED,
    },
    'document: Public liability insurance policy',
  );

  console.log('\nDone. GET /api/v1/reminders should now show one OVERDUE item in each category.');
  console.log('To remove this demo data later:');
  console.log("  DELETE FROM documents WHERE property_id = (SELECT id FROM properties WHERE name = 'Demo Reminder Property');");
  console.log("  DELETE FROM rental_incomes WHERE property_id = (SELECT id FROM properties WHERE name = 'Demo Reminder Property');");
  console.log("  DELETE FROM leases WHERE property_id = (SELECT id FROM properties WHERE name = 'Demo Reminder Property');");
  console.log("  DELETE FROM properties WHERE name = 'Demo Reminder Property';");
  console.log("  DELETE FROM tenants WHERE name = 'Demo Tenant Pty Ltd';");

  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
