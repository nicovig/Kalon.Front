import { Injectable, signal } from '@angular/core';

export type ReceiptDispatchChannel = 'email' | 'paper';
export type ReceiptDocumentKind = 'fiscal_receipt' | 'payment_certificate' | 'reminder';

export interface ReceiptArchiveRecord {
  id: string;
  sentAt: number;
  contactId: string;
  contactName: string;
  channel: ReceiptDispatchChannel;
  documentKind: ReceiptDocumentKind;
  templateTitle: string;
  paperPostedAt?: number | null;
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
      templateTitle,
      paperPostedAt: channel === 'paper' ? null : undefined
    }));
    this.recordsWrite.set([...(created ?? []), ...this.recordsWrite()]);
    this.persist();
  }

  confirmPaperPosted(recordId: string, postedAtMs: number): void {
    if (!Number.isFinite(postedAtMs)) return;
    this.recordsWrite.set(
      this.recordsWrite().map((r) =>
        r.id === recordId && r.channel === 'paper' ? { ...r, paperPostedAt: postedAtMs } : r
      )
    );
    this.persist();
  }

  pendingPaperConfirmationsCount(): number {
    return this.recordsWrite().filter((r) => r.channel === 'paper' && (r.paperPostedAt == null || r.paperPostedAt === undefined)).length;
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
        .map((x): ReceiptArchiveRecord => {
          const channel: ReceiptDispatchChannel = x['channel'] === 'paper' ? 'paper' : 'email';
          const dk = x['documentKind'];
          const documentKind: ReceiptDocumentKind =
            dk === 'payment_certificate'
              ? 'payment_certificate'
              : dk === 'reminder'
                ? 'reminder'
                : 'fiscal_receipt';
          let paperPostedAt: number | null | undefined = undefined;
          if (channel === 'paper') {
            const p = x['paperPostedAt'];
            paperPostedAt = typeof p === 'number' && Number.isFinite(p) ? p : null;
          }
          return {
            id: String(x['id'] ?? this.newId()),
            sentAt: Number(x['sentAt'] ?? Date.now()),
            contactId: String(x['contactId'] ?? ''),
            contactName: String(x['contactName'] ?? ''),
            channel,
            documentKind,
            templateTitle: String(x['templateTitle'] ?? ''),
            paperPostedAt
          };
        })
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
