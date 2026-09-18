import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '../entities/document.entity';
import { InvoiceDirection, InvoiceType } from '../entities/invoice.entity';
import { LeaseStatus, RentFrequency, OutgoingsRecoveryType, BondType } from '../entities/lease.entity';
import { RentReviewMechanism } from '../entities/enums/rent-review-mechanism.enum';
import { DepreciationMethod } from '../entities/depreciation-schedule.entity';
import { PropertyExpenseCategory } from '../entities/enums/property-expense-category.enum';

/** Which app form a scanned document should open. */
export enum SmartScanKind {
  INVOICE = 'INVOICE',
  LEASE = 'LEASE',
  RENT_REVIEW = 'RENT_REVIEW',
  RENTAL_STATEMENT = 'RENTAL_STATEMENT',
  DEPRECIATION_SCHEDULE = 'DEPRECIATION_SCHEDULE',
  OTHER = 'OTHER',
}

/** How the document reached the model — useful for judging accuracy and cost. */
export enum SmartScanSource {
  PDF_TEXT = 'PDF_TEXT',
  DOCUMENT_IMAGE = 'DOCUMENT_IMAGE',
}

export class SmartScanInvoiceLineItem {
  @ApiProperty() lineNumber: number;
  @ApiProperty() description: string;
  @ApiPropertyOptional({ enum: PropertyExpenseCategory }) category?: PropertyExpenseCategory;
  @ApiPropertyOptional() quantity?: number;
  @ApiPropertyOptional() unitAmount?: number;
  @ApiPropertyOptional() amount?: number;
  @ApiPropertyOptional() gstAmount?: number;
}

export class SmartScanInvoiceForm {
  @ApiPropertyOptional({ enum: InvoiceDirection }) direction?: InvoiceDirection;
  @ApiPropertyOptional({ enum: InvoiceType }) invoiceType?: InvoiceType;
  @ApiPropertyOptional() invoiceNumber?: string;
  @ApiPropertyOptional() issuerName?: string;
  @ApiPropertyOptional() issuerAbn?: string;
  @ApiPropertyOptional() issueDate?: string;
  @ApiPropertyOptional() dueDate?: string;
  @ApiPropertyOptional() periodStart?: string;
  @ApiPropertyOptional() periodEnd?: string;
  @ApiPropertyOptional() subtotal?: number;
  @ApiPropertyOptional() gstAmount?: number;
  @ApiPropertyOptional() totalAmount?: number;
  @ApiPropertyOptional() currency?: string;
  @ApiPropertyOptional({ type: [SmartScanInvoiceLineItem] }) lineItems?: SmartScanInvoiceLineItem[];
}

export class SmartScanLeaseOptionTerm {
  @ApiProperty() termMonths: number;
  @ApiPropertyOptional() exerciseByDate?: string;
}

export class SmartScanLeaseForm {
  @ApiPropertyOptional({ description: 'Tenant name as written on the lease — not yet resolved to a tenant record' })
  tenantName?: string;
  @ApiPropertyOptional({ enum: LeaseStatus }) status?: LeaseStatus;
  @ApiPropertyOptional() commencementDate?: string;
  @ApiPropertyOptional() expiryDate?: string;
  @ApiPropertyOptional() initialTermMonths?: number;
  @ApiPropertyOptional() baseRentAnnual?: number;
  @ApiPropertyOptional({ enum: RentFrequency }) rentFrequency?: RentFrequency;
  @ApiPropertyOptional({ enum: OutgoingsRecoveryType }) outgoingsRecoveryType?: OutgoingsRecoveryType;
  @ApiPropertyOptional({ enum: RentReviewMechanism }) rentReviewMechanism?: RentReviewMechanism;
  @ApiPropertyOptional() rentReviewValue?: number;
  @ApiPropertyOptional() nextReviewDate?: string;
  @ApiPropertyOptional() rentFreePeriodMonths?: number;
  @ApiPropertyOptional() bondAmount?: number;
  @ApiPropertyOptional({ enum: BondType }) bondType?: BondType;
  @ApiPropertyOptional({ type: [SmartScanLeaseOptionTerm] }) optionTerms?: SmartScanLeaseOptionTerm[];
}

export class SmartScanRentReviewForm {
  @ApiPropertyOptional() reviewDate?: string;
  @ApiPropertyOptional({ enum: RentReviewMechanism }) reviewType?: RentReviewMechanism;
  @ApiPropertyOptional() oldRentAnnual?: number;
  @ApiPropertyOptional() newRentAnnual?: number;
  @ApiPropertyOptional() percentChange?: number;
}

export class SmartScanRentalIncomeForm {
  @ApiPropertyOptional() periodStart?: string;
  @ApiPropertyOptional() periodEnd?: string;
  @ApiPropertyOptional() grossAmount?: number;
  @ApiPropertyOptional() outgoingsReimbursed?: number;
  @ApiPropertyOptional() gstAmount?: number;
  @ApiPropertyOptional() agentCommission?: number;
  @ApiPropertyOptional() otherDeductions?: number;
  @ApiPropertyOptional() amountReceived?: number;
  @ApiPropertyOptional() receivedDate?: string;
}

export class SmartScanDepreciationForm {
  @ApiPropertyOptional() financialYearStart?: string;
  @ApiPropertyOptional() financialYearEnd?: string;
  @ApiPropertyOptional({ enum: DepreciationMethod }) method?: DepreciationMethod;
  @ApiPropertyOptional() division40Amount?: number;
  @ApiPropertyOptional() division43Amount?: number;
  @ApiPropertyOptional() totalAmount?: number;
}

export class SmartScanForms {
  @ApiPropertyOptional({ type: SmartScanInvoiceForm }) invoice?: SmartScanInvoiceForm;
  @ApiPropertyOptional({ type: SmartScanLeaseForm }) lease?: SmartScanLeaseForm;
  @ApiPropertyOptional({ type: SmartScanRentReviewForm }) rentReview?: SmartScanRentReviewForm;
  @ApiPropertyOptional({ type: SmartScanRentalIncomeForm }) rentalIncome?: SmartScanRentalIncomeForm;
  @ApiPropertyOptional({ type: SmartScanDepreciationForm }) depreciationSchedule?: SmartScanDepreciationForm;
}

export class SmartScanMatch {
  @ApiPropertyOptional() propertyId?: string;
  @ApiPropertyOptional() propertyName?: string;
  @ApiPropertyOptional({ enum: ['HIGH', 'LOW'] }) propertyMatchConfidence?: 'HIGH' | 'LOW';

  @ApiPropertyOptional({ description: 'Active lease on the matched property — needed to file a rent review against it' })
  leaseId?: string;

  @ApiPropertyOptional() leaseLabel?: string;
}

export class SmartScanUsage {
  @ApiProperty() inputTokens: number;
  @ApiProperty() outputTokens: number;
  @ApiProperty({ description: 'Input tokens served from the prompt cache at a tenth of the price' })
  cacheReadTokens: number;
}

export class SmartScanResponse {
  @ApiProperty({ enum: SmartScanKind, description: 'Which app form the client should open' })
  documentKind: SmartScanKind;

  @ApiProperty({ enum: DocumentType, description: 'How to file the document itself in the document library' })
  documentType: DocumentType;

  @ApiProperty({ enum: ['HIGH', 'MEDIUM', 'LOW'] })
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';

  @ApiProperty({ description: 'Suggested document title' })
  title: string;

  @ApiProperty({ description: 'One sentence describing the document' })
  summary: string;

  @ApiPropertyOptional() documentDate?: string;

  @ApiPropertyOptional({ description: 'Renewal/expiry date, for policies and certificates' })
  expiryDate?: string;

  @ApiProperty({ type: SmartScanMatch })
  match: SmartScanMatch;

  @ApiProperty({ type: [String], description: 'Things the user should check before saving' })
  warnings: string[];

  @ApiProperty({ type: SmartScanForms, description: 'Only the section matching documentKind is populated' })
  forms: SmartScanForms;

  @ApiProperty({ enum: SmartScanSource, description: 'PDF_TEXT is the cheap path; DOCUMENT_IMAGE sends page pixels' })
  source: SmartScanSource;

  @ApiProperty({ type: SmartScanUsage })
  usage: SmartScanUsage;
}
