import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InvoiceService } from './invoice.service';
import { InvoiceEntity, InvoiceDirection, InvoiceType } from '../../entities/invoice.entity';
import { InvoiceLineItemEntity } from '../../entities/invoice-line-item.entity';

function createFakeManager() {
  return {
    create: jest.fn((_entity, data) => ({ ...data })),
    save: jest.fn((data) =>
      Array.isArray(data)
        ? Promise.resolve(data.map((item, index) => ({ id: `generated-${index}`, ...item })))
        : Promise.resolve({ id: data.id ?? 'invoice-1', ...data }),
    ),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
  };
}

describe('InvoiceService', () => {
  let service: InvoiceService;
  const ownerId = 'owner-1';

  const invoiceRepo = {
    manager: { transaction: jest.fn() },
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };
  const invoiceLineItemRepo = {};

  beforeEach(async () => {
    jest.clearAllMocks();
    invoiceRepo.manager.transaction.mockImplementation((cb) => cb(createFakeManager()));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: getRepositoryToken(InvoiceEntity), useValue: invoiceRepo },
        { provide: getRepositoryToken(InvoiceLineItemEntity), useValue: invoiceLineItemRepo },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  it('should create an invoice with nested line items in a transaction', async () => {
    const result = await service.create(
      {
        direction: InvoiceDirection.INCOMING,
        invoiceType: InvoiceType.RATES,
        issuerName: 'Council',
        issueDate: '2026-01-15',
        subtotal: 1000,
        gstAmount: 100,
        totalAmount: 1100,
        lineItems: [
          {
            lineNumber: 1,
            description: 'Q1 rates',
            category: 'RATES' as any,
            unitAmount: 1000,
            amount: 1000,
            gstAmount: 100,
          },
        ],
      },
      ownerId,
    );

    expect(result.issuerName).toBe('Council');
    expect(result.lineItems).toHaveLength(1);
  });

  it('should generate property expense postings for a classified expense invoice', async () => {
    invoiceRepo.findOne.mockResolvedValue({
      id: 'invoice-1',
      ownerId,
      propertyId: 'property-1',
      invoiceType: InvoiceType.RATES,
      issueDate: '2026-01-15',
      subtotal: 1000,
      gstAmount: 100,
      currency: 'AUD',
      lineItems: [],
    });

    const result = await service.generatePostings('invoice-1', ownerId);

    expect(result.propertyExpenses).toBe(1);
    expect(result.rentalIncomes).toBe(0);
  });
});
