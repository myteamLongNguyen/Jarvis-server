import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { DocumentEntity } from '../../entities/document.entity';
import { DuplicateCandidate, DuplicateMatch, matchDuplicates, normaliseIssuer } from './duplicate-match';

/**
 * Finds invoices already on file that look like the one about to be saved.
 *
 * It only reports; saving is never blocked. Two identical bills on one day are
 * unusual but real, and the person filing knows which it is. What they cannot
 * do is notice, which is the part this takes care of.
 */
@Injectable()
export class DuplicateCheckService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepo: Repository<InvoiceEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
  ) {}

  async find(candidate: DuplicateCandidate, ownerId: string, excludeInvoiceId?: string): Promise<DuplicateMatch[]> {
    const fileTwinInvoiceIds = await this.invoicesSharingTheFile(candidate.checksum, ownerId);

    // The rules only ever fire on the same supplier or the same file, so the
    // search narrows to those two sets rather than the whole history.
    const existing = await this.invoiceRepo.find({
      where: {
        ownerId,
        ...(excludeInvoiceId ? { id: Not(excludeInvoiceId) } : {}),
      },
      order: { issueDate: 'DESC' },
      take: 500,
    });

    const wantedIssuer = normaliseIssuer(candidate.issuerName);
    const worthChecking = existing.filter(
      (invoice) => fileTwinInvoiceIds.has(invoice.id) || normaliseIssuer(invoice.issuerName) === wantedIssuer,
    );

    return matchDuplicates(candidate, worthChecking, fileTwinInvoiceIds);
  }

  /**
   * Invoices whose source file is byte-for-byte the one being filed. Older
   * documents were stored before checksums were recorded, so an absent
   * checksum on either side simply means this rule has nothing to say.
   */
  private async invoicesSharingTheFile(checksum: string | undefined, ownerId: string): Promise<Set<string>> {
    if (!checksum) return new Set();

    const twins = await this.documentRepo.find({ where: { ownerId, checksumSha256: checksum } });
    if (twins.length === 0) return new Set();

    const invoices = await this.invoiceRepo.find({
      where: { ownerId, sourceDocumentId: In(twins.map((document) => document.id)) },
    });
    return new Set(invoices.map((invoice) => invoice.id));
  }
}
