/**
 * One-off seed of real depreciation figures for 996 Nepean Highway, sourced from
 * "BMT Tax Depreciation Schedule - 933527 100.00_.pdf" (found in Downloads\properties\
 * 996 Nepean Hwy Mornington\ during the original document extraction). Both the
 * Diminishing Value and Prime Cost methods are seeded side by side - there's no
 * record of which method Andrew's trust has actually elected (flagged in the
 * original gap report), so the FY report surfaces both rather than picking one.
 *
 * Division 40/43 split is not given in the schedule's own summary for the first
 * partial year's Prime Cost figure, so those two columns are left null there -
 * only the total is known.
 *
 * Run with:
 *   SEED_OWNER_ID=<supabase-user-uuid> npm run seed:depreciation-996-nepean
 */
import dataSource from '../core/database/data-source';
import { DepreciationScheduleEntity, DepreciationMethod } from '../entities/depreciation-schedule.entity';
import { PropertyEntity } from '../entities/property.entity';

const ownerId = process.env.SEED_OWNER_ID || process.argv[2] || 'b7b741b8-ddf0-4e36-a442-e72571bf14b8';

interface Row {
  financialYearStart: string;
  financialYearEnd: string;
  method: DepreciationMethod;
  division40Amount: number | null;
  division43Amount: number | null;
  totalAmount: number;
  notes: string;
}

const rows: Row[] = [
  {
    financialYearStart: '2024-10-09', // settlement/construction-completion date, not 1 July - a genuine partial first year
    financialYearEnd: '2025-06-30',
    method: DepreciationMethod.DIMINISHING_VALUE,
    division40Amount: 47797,
    division43Amount: 51833,
    totalAmount: 99630,
    notes: 'First (part) financial year, 9 Oct 2024 - 30 Jun 2025. Source: BMT Tax Depreciation Schedule, 996 Nepean Highway.',
  },
  {
    financialYearStart: '2024-10-09',
    financialYearEnd: '2025-06-30',
    method: DepreciationMethod.PRIME_COST,
    division40Amount: null,
    division43Amount: null,
    totalAmount: 79928,
    notes:
      'First (part) financial year, 9 Oct 2024 - 30 Jun 2025. Division 40/43 split not given in the schedule\'s summary ' +
      'for this method/period - only the total. Source: BMT Tax Depreciation Schedule, 996 Nepean Highway.',
  },
  {
    financialYearStart: '2025-07-01',
    financialYearEnd: '2026-06-30',
    method: DepreciationMethod.DIMINISHING_VALUE,
    division40Amount: 49037,
    division43Amount: 71392,
    totalAmount: 120429,
    notes: 'FY2025-26. Source: BMT Tax Depreciation Schedule, 996 Nepean Highway.',
  },
  {
    financialYearStart: '2025-07-01',
    financialYearEnd: '2026-06-30',
    method: DepreciationMethod.PRIME_COST,
    division40Amount: 23991,
    division43Amount: 71392,
    totalAmount: 95383,
    notes: 'FY2025-26. Source: BMT Tax Depreciation Schedule, 996 Nepean Highway.',
  },
];

async function main() {
  await dataSource.initialize();
  console.log(`Seeding depreciation schedule for 996 Nepean Highway, owner ${ownerId}...\n`);

  const propertyRepo = dataSource.getRepository(PropertyEntity);
  const depreciationRepo = dataSource.getRepository(DepreciationScheduleEntity);

  const property = await propertyRepo.findOne({ where: { addressLine1: '996 Nepean Highway', ownerId } });
  if (!property) {
    console.error('Could not find 996 Nepean Highway property for this owner - aborting.');
    process.exit(1);
  }

  for (const row of rows) {
    const existing = await depreciationRepo.findOne({
      where: {
        ownerId,
        propertyId: property.id,
        financialYearStart: row.financialYearStart,
        financialYearEnd: row.financialYearEnd,
        method: row.method,
      },
    });
    if (existing) {
      console.log(`  = ${row.method} ${row.financialYearStart}->${row.financialYearEnd} already exists, skipping`);
      continue;
    }

    const entity = depreciationRepo.create({
      ownerId,
      propertyId: property.id,
      financialYearStart: row.financialYearStart,
      financialYearEnd: row.financialYearEnd,
      method: row.method,
      division40Amount: row.division40Amount ?? undefined,
      division43Amount: row.division43Amount ?? undefined,
      totalAmount: row.totalAmount,
      notes: row.notes,
    });
    await depreciationRepo.save(entity);
    console.log(`  + created ${row.method} ${row.financialYearStart} -> ${row.financialYearEnd}: $${row.totalAmount}`);
  }

  console.log('\nDone.');
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
