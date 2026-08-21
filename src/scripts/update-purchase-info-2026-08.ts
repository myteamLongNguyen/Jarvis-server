/**
 * One-off UPDATE (not a re-seed) applying real purchase/valuation data supplied by
 * Andrew Carr, forwarded from his accountant Nathan Vellucci (ABA Partners), email
 * "Carr Property Information" dated 10 August 2026. This fills the single biggest
 * gap flagged after the initial seed: purchase date, cost base (purchase price),
 * and confirmed current monthly rent for all 7 investment properties.
 *
 * Deliberately does NOT wipe/reseed — the DB now also holds real user-entered
 * lease/tenant/rent-review/rental-income data created via the app's renting-
 * management UI, which a wipe would destroy. This script only UPDATEs existing
 * rows, matched by their known addressLine1 (set by seed-carr-group-real.ts).
 *
 * "Cost Base" in the accountant's table is the fully-capitalised acquisition cost
 * (purchase price + incidental acquisition costs, e.g. stamp duty/legal fees,
 * already bundled per standard CGT cost-base accounting) — so it is used directly
 * as purchasePrice, with purchaseCosts set to 0 (not left as a $1 placeholder)
 * since there is no further breakdown to add on top of it.
 *
 * Run with:
 *   SEED_OWNER_ID=<supabase-user-uuid> npm run update:purchase-info
 */
import dataSource from '../core/database/data-source';
import { PropertyEntity } from '../entities/property.entity';
import { LeaseEntity } from '../entities/lease.entity';
import { ValuationEntity, ValuationType } from '../entities/valuation.entity';

const ownerId = process.env.SEED_OWNER_ID || process.argv[2] || 'b7b741b8-ddf0-4e36-a442-e72571bf14b8';

const SOURCE_NOTE =
  'Purchase date and cost base (used as purchasePrice; purchaseCosts set to 0 as the cost base ' +
  'already includes acquisition costs) confirmed by Andrew Carr, forwarding an email from Nathan ' +
  'Vellucci (ABA Partners) dated 10 August 2026 ("Carr Property Information").';

interface Update {
  addressLine1: string;
  purchaseDate: string;
  costBase: number;
  monthlyRent?: number; // only set where it differs from what's already seeded on the lease
  marketValue?: number; // only set where it differs from what's already seeded as a valuation
}

const updates: Update[] = [
  { addressLine1: '996 Nepean Highway', purchaseDate: '2023-01-06', costBase: 6849986.39 },
  { addressLine1: '5/177-179 Mornington Tyabb Road', purchaseDate: '2024-03-01', costBase: 1415717.78, monthlyRent: 5363.27 },
  { addressLine1: '6 & 9, 26-28 Carbine Way', purchaseDate: '2017-06-28', costBase: 1097075.59, marketValue: 1330000 },
  { addressLine1: '6 Elite Way', purchaseDate: '2020-04-24', costBase: 1987114.07 },
  { addressLine1: '2 & 3, 47 Wangara Road', purchaseDate: '2019-05-09', costBase: 2641226.03 },
  { addressLine1: '1 Raylee Place', purchaseDate: '2019-10-03', costBase: 3172197.28 },
  { addressLine1: 'Vale Road', purchaseDate: '2019-03-19', costBase: 9453420.2, monthlyRent: 55905.67 },
];

async function main() {
  await dataSource.initialize();
  console.log(`Applying accountant-confirmed purchase info for owner ${ownerId}...\n`);

  const propertyRepo = dataSource.getRepository(PropertyEntity);
  const leaseRepo = dataSource.getRepository(LeaseEntity);
  const valuationRepo = dataSource.getRepository(ValuationEntity);

  for (const u of updates) {
    const property = await propertyRepo.findOne({ where: { addressLine1: u.addressLine1, ownerId } });
    if (!property) {
      console.warn(`  ! No property found for addressLine1="${u.addressLine1}" - skipped`);
      continue;
    }

    property.purchaseDate = u.purchaseDate;
    property.purchasePrice = u.costBase;
    property.purchaseCosts = 0;
    property.notes = `${property.notes ?? ''}\n\n${SOURCE_NOTE}`.trim();
    await propertyRepo.save(property);
    console.log(`  + updated property "${property.name}": purchaseDate=${u.purchaseDate}, purchasePrice=${u.costBase}`);

    if (u.monthlyRent !== undefined) {
      const lease = await leaseRepo.findOne({ where: { propertyId: property.id, ownerId } });
      if (lease) {
        const oldAnnual = lease.baseRentAnnual;
        const newAnnual = Math.round(u.monthlyRent * 12 * 100) / 100;
        lease.baseRentAnnual = newAnnual;
        lease.notes =
          `${lease.notes ?? ''}\n\nUPDATE 2026-08-10: baseRentAnnual corrected from $${oldAnnual} (derived from raw agent-` +
          `statement totals) to $${newAnnual} ($${u.monthlyRent}/month x 12) per Andrew Carr / ABA Partners (Nathan ` +
          `Vellucci) email, which reports this as the official current monthly rental amount.`.trim();
        await leaseRepo.save(lease);
        console.log(`    + updated lease baseRentAnnual: ${oldAnnual} -> ${newAnnual}`);
      } else {
        console.log(`    (no lease exists for "${property.name}" - confirmed rent of $${u.monthlyRent}/month noted on property only)`);
        property.notes = `${property.notes}\n\nConfirmed current monthly rent: $${u.monthlyRent} ($${Math.round(u.monthlyRent * 12 * 100) / 100}/year) - no lease/tenant record exists yet, see earlier notes on the unresolved tenant identity for this property.`;
        await propertyRepo.save(property);
      }
    }

    if (u.marketValue !== undefined) {
      const existingMatch = await valuationRepo.findOne({ where: { propertyId: property.id, ownerId, valuationAmount: u.marketValue } });
      if (!existingMatch) {
        const valuation = valuationRepo.create({
          ownerId,
          propertyId: property.id,
          valuationDate: '2026-08-10',
          valuationAmount: u.marketValue,
          valuationType: ValuationType.INDEPENDENT,
          valuer: 'Nathan Vellucci, ABA Partners (accountant-reported current market value)',
          purpose: 'Owner portfolio reporting',
          notes: SOURCE_NOTE,
        });
        await valuationRepo.save(valuation);
        console.log(`    + added valuation: $${u.marketValue} (2026-08-10, accountant-confirmed)`);
      }
    }
  }

  console.log('\nDone.');
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Update failed:', err);
  process.exit(1);
});
