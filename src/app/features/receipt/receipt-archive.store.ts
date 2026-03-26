import { Injectable, signal } from '@angular/core';

export type ReceiptDispatchChannel = 'email' | 'paper';
export type ReceiptDocumentKind = 'fiscal_receipt' | 'payment_certificate';

export interface ReceiptArchiveRecord {
  id: string;
  sentAt: number;
  contactId: string;
  contactName: string;
  channel: ReceiptDispatchChannel;
  documentKind: ReceiptDocumentKind;
  templateTitle: string;
}

@Injectable({ providedIn: 'root' })
export class ReceiptArchiveStore {
  private readonly storageKey = 'kalon.receipt.archives.v1';
  private readonly recordsWrite = signal<ReceiptArchiveRecord[]>(this.readStored());
  readonly records = this.recordsWrite.asReadonly();

  appendBatch(
    contacts: Array<{ id: string; name: string }>,
    channel: ReceiptDispatchChannel,
    documentKind: ReceiptDocumentKind,
    templateTitle: string
  ): void {
    if (!contacts.length) return;
    const now = Date.now();
    const created: ReceiptArchiveRecord[] = contacts.map((c) => ({
      id: this.newId(),
      sentAt: now,
      contactId: c.id,
      contactName: c.name,
      channel,
      documentKind,
      templateTitle
    }));
    this.recordsWrite.set([...(created ?? []), ...this.recordsWrite()]);
    this.persist();
  }

  lastSentAt(contactId: string, documentKind: ReceiptDocumentKind): number | null {
    const record = this.recordsWrite().find((r) => r.contactId === contactId && r.documentKind === documentKind);
    return record ? record.sentAt : null;
  }

  hasSentInPeriod(
    contactId: string,
    documentKind: ReceiptDocumentKind,
    periodStartMs: number,
    periodEndMs: number
  ): boolean {
    return this.recordsWrite().some(
      (r) =>
        r.contactId === contactId &&
        r.documentKind === documentKind &&
        r.sentAt >= periodStartMs &&
        r.sentAt <= periodEndMs
    );
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.recordsWrite()));
    } catch {
      return;
    }
  }

  private readStored(): ReceiptArchiveRecord[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      const normalized: ReceiptArchiveRecord[] = parsed
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x): ReceiptArchiveRecord => ({
          id: String(x['id'] ?? this.newId()),
          sentAt: Number(x['sentAt'] ?? Date.now()),
          contactId: String(x['contactId'] ?? ''),
          contactName: String(x['contactName'] ?? ''),
          channel: x['channel'] === 'paper' ? 'paper' : 'email',
          documentKind: x['documentKind'] === 'payment_certificate' ? 'payment_certificate' : 'fiscal_receipt',
          templateTitle: String(x['templateTitle'] ?? '')
        }))
        .filter((x) => !!x.contactId)
        .sort((a, b) => b.sentAt - a.sentAt);
      return normalized;
    } catch {
      return [];
    }
  }

  private newId(): string {
    return `rcp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
