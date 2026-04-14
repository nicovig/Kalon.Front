import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { ReceiptArchiveRecord, ReceiptArchiveStore } from '../receipt/receipt-archive.store';

@Component({
  selector: 'archives-page',
  standalone: true,
  templateUrl: './archives.page.html',
  styleUrls: ['./archives.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TopbarComponent, ButtonLabelComponent]
})
export class ArchivesPageComponent {
  private readonly receiptArchiveStore = inject(ReceiptArchiveStore);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly receiptArchives = computed(() =>
    this.receiptArchiveStore
      .records()
      .slice()
      .sort((a, b) => b.sentAt - a.sentAt)
  );

  protected formatDate(ts: number): string {
    return new Date(ts).toLocaleString('fr-FR');
  }

  protected formatShortDate(ts: number): string {
    return new Date(ts).toLocaleDateString('fr-FR');
  }

  protected kindLabel(kind: ReceiptArchiveRecord['documentKind']): string {
    if (kind === 'fiscal_receipt') return 'Reçu fiscal';
    if (kind === 'payment_certificate') return 'Attestation de paiement';
    return 'Relance';
  }

  protected channelLabel(channel: 'email' | 'paper'): string {
    return channel === 'email' ? 'Email' : 'Courrier papier';
  }

  protected isPaperPending(item: ReceiptArchiveRecord): boolean {
    return item.channel === 'paper' && (item.paperPostedAt == null || item.paperPostedAt === undefined);
  }

  protected confirmPaperDateDraft: Record<string, string> = {};

  protected draftDateFor(item: ReceiptArchiveRecord): string {
    if (this.confirmPaperDateDraft[item.id] !== undefined) {
      return this.confirmPaperDateDraft[item.id];
    }
    return new Date().toISOString().slice(0, 10);
  }

  protected onDraftDateChange(itemId: string, value: string): void {
    this.confirmPaperDateDraft = { ...this.confirmPaperDateDraft, [itemId]: value };
    this.cdr.markForCheck();
  }

  protected confirmPaperPosted(item: ReceiptArchiveRecord): void {
    const raw = this.confirmPaperDateDraft[item.id] ?? new Date().toISOString().slice(0, 10);
    if (!raw) return;
    const ms = new Date(raw + 'T12:00:00').getTime();
    this.receiptArchiveStore.confirmPaperPosted(item.id, ms);
    const next = { ...this.confirmPaperDateDraft };
    delete next[item.id];
    this.confirmPaperDateDraft = next;
    this.cdr.markForCheck();
  }
}
