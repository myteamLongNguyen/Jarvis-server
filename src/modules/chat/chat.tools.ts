import { PropertyService } from '../property/property.service';
import { PropertyAnalyticsService } from '../property/property-analytics.service';
import { LeaseService } from '../lease/lease.service';
import { RentReviewService } from '../rent-review/rent-review.service';
import { RentalIncomeService } from '../rental-income/rental-income.service';
import { InvoiceService } from '../invoice/invoice.service';
import { TenantService } from '../tenant/tenant.service';
import { ReminderService } from '../reminder/reminder.service';
import { PortfolioAnalyticsService } from '../portfolio/portfolio-analytics.service';
import { parseFinancialYearParam } from '../../core/utils';
import { ChatTool } from './chat.types';

const DEFAULT_LIST_LIMIT = 20;

/** Drops ownerId from a response object/array before it goes into the model's context —
 * it's always the same value (the caller), so repeating it on every row only burns tokens. */
function trim<T>(value: T): T {
  if (Array.isArray(value)) return value.map(trim) as unknown as T;
  if (value && typeof value === 'object') {
    const { ownerId: _ownerId, ...rest } = value as Record<string, unknown>;
    return rest as T;
  }
  return value;
}

export interface ChatToolServices {
  propertyService: PropertyService;
  propertyAnalyticsService: PropertyAnalyticsService;
  leaseService: LeaseService;
  rentReviewService: RentReviewService;
  rentalIncomeService: RentalIncomeService;
  invoiceService: InvoiceService;
  tenantService: TenantService;
  reminderService: ReminderService;
  portfolioAnalyticsService: PortfolioAnalyticsService;
}

/**
 * Builds the tool set the chat assistant can call, scoped to one authenticated owner.
 *
 * Every tool is a thin, read-only wrapper around an existing service method — the same
 * ones the REST API and the mobile app already use. That's deliberate: those methods are
 * already efficient (indexed, paginated, aggregate SQL via TypeORM query builders), so the
 * chat feature adds no new query surface and no way to read another owner's data — ownerId
 * is a closure variable here, never a model-supplied argument.
 */
export function buildChatTools(ownerId: string, services: ChatToolServices): ChatTool[] {
  const {
    propertyService,
    propertyAnalyticsService,
    leaseService,
    rentReviewService,
    rentalIncomeService,
    invoiceService,
    tenantService,
    reminderService,
    portfolioAnalyticsService,
  } = services;

  return [
    {
      name: 'get_portfolio_summary',
      description:
        "Portfolio-wide totals: value, YTD income, blended yield, unpaid/overdue invoices. The best first call for any broad 'how am I doing' question.",
      input_schema: {
        type: 'object',
        properties: {
          includePersonal: { type: 'boolean', description: 'Include personal-use (non-investment) properties. Default false.' },
        },
      },
      run: async (input) => trim(await portfolioAnalyticsService.getPortfolioSummary(ownerId, Boolean(input.includePersonal))),
    },
    {
      name: 'get_financial_year_report',
      description:
        'Income, expenses, depreciation and valuation for one Australian financial year (1 Jul - 30 Jun), broken down per property with totals.',
      input_schema: {
        type: 'object',
        properties: {
          fy: { type: 'string', description: "e.g. '2025-2026' for FY2025-26. Defaults to the current financial year." },
          includePersonal: { type: 'boolean' },
        },
      },
      run: async (input) => {
        const { start, end } = parseFinancialYearParam(input.fy as string | undefined);
        return trim(await portfolioAnalyticsService.getFinancialYearReport(ownerId, start, end, Boolean(input.includePersonal)));
      },
    },
    {
      name: 'list_properties',
      description: 'List properties in the portfolio, optionally filtered by status, type, category, or name search.',
      input_schema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ACTIVE', 'UNDER_CONTRACT', 'SOLD', 'ARCHIVED'] },
          category: { type: 'string', enum: ['INVESTMENT', 'PERSONAL'] },
          search: { type: 'string', description: 'Search by property name' },
        },
      },
      run: async (input) =>
        trim(
          await propertyService.findAll(
            { limit: DEFAULT_LIST_LIMIT, offset: 0, ...(input as Record<string, unknown>) } as any,
            ownerId,
          ),
        ),
    },
    {
      name: 'get_property_summary',
      description:
        'Full financial summary for one property: active leases, current rent, YTD income/maintenance, last valuation, yield, unpaid invoices, next rent review, expiring leases.',
      input_schema: {
        type: 'object',
        properties: { propertyId: { type: 'string', description: 'Property UUID, from list_properties' } },
        required: ['propertyId'],
      },
      run: async (input) => trim(await propertyAnalyticsService.getSummary(input.propertyId as string, ownerId)),
    },
    {
      name: 'list_leases',
      description: 'List leases (tenant, rent, term, review mechanism, bond), optionally filtered by property or status.',
      input_schema: {
        type: 'object',
        properties: {
          propertyId: { type: 'string' },
          status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'HOLDOVER', 'EXPIRED', 'TERMINATED'] },
        },
      },
      run: async (input) =>
        trim(await leaseService.findAll({ limit: DEFAULT_LIST_LIMIT, offset: 0, ...(input as Record<string, unknown>) } as any, ownerId)),
    },
    {
      name: 'list_rent_reviews',
      description: 'List rent review history/schedule for a lease or across the portfolio.',
      input_schema: {
        type: 'object',
        properties: {
          leaseId: { type: 'string' },
          status: { type: 'string', enum: ['SCHEDULED', 'COMPLETED', 'DISPUTED', 'WAIVED'] },
        },
      },
      run: async (input) =>
        trim(await rentReviewService.findAll({ limit: DEFAULT_LIST_LIMIT, offset: 0, ...(input as Record<string, unknown>) } as any, ownerId)),
    },
    {
      name: 'list_rental_incomes',
      description: 'List rental income records (one row per rent period), optionally filtered by property, status, or date range.',
      input_schema: {
        type: 'object',
        properties: {
          propertyId: { type: 'string' },
          status: { type: 'string', enum: ['EXPECTED', 'INVOICED', 'RECEIVED', 'OVERDUE', 'WRITTEN_OFF'] },
          from: { type: 'string', description: 'ISO date, inclusive lower bound on period start' },
          to: { type: 'string', description: 'ISO date, inclusive upper bound on period end' },
        },
      },
      run: async (input) =>
        trim(
          await rentalIncomeService.findAll({ limit: DEFAULT_LIST_LIMIT, offset: 0, ...(input as Record<string, unknown>) } as any, ownerId),
        ),
    },
    {
      name: 'list_invoices',
      description: 'List invoices (rent invoices, agent statements, or expense invoices like maintenance/insurance/rates), with status and totals.',
      input_schema: {
        type: 'object',
        properties: {
          propertyId: { type: 'string' },
          status: { type: 'string', enum: ['UNSORTED', 'CLASSIFIED', 'APPROVED', 'PAID', 'OVERDUE', 'DISPUTED', 'WRITTEN_OFF'] },
          direction: { type: 'string', enum: ['INCOMING', 'OUTGOING'] },
          from: { type: 'string', description: 'ISO date, inclusive lower bound on issue date' },
          to: { type: 'string', description: 'ISO date, inclusive upper bound on issue date' },
        },
      },
      run: async (input) =>
        trim(await invoiceService.findAll({ limit: DEFAULT_LIST_LIMIT, offset: 0, ...(input as Record<string, unknown>) } as any, ownerId)),
    },
    {
      name: 'list_tenants',
      description: 'List tenants on file, optionally searched by name.',
      input_schema: {
        type: 'object',
        properties: { search: { type: 'string' } },
      },
      run: async (input) =>
        trim(await tenantService.findAll({ limit: DEFAULT_LIST_LIMIT, offset: 0, ...(input as Record<string, unknown>) } as any, ownerId)),
    },
    {
      name: 'get_reminders',
      description:
        'Upcoming/overdue lease expiries, rent reviews, insurance/compliance renewals, and unpaid or unrecorded rent — the same feed shown in the app bell.',
      input_schema: {
        type: 'object',
        properties: { windowDays: { type: 'number', description: 'How many days ahead to look. Default 60.' } },
      },
      run: async (input) => trim(await reminderService.getReminders(ownerId, input.windowDays as number | undefined)),
    },
  ];
}
