import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { ReceiptArchiveStore } from '../receipt/receipt-archive.store';

@Component({
  selector: 'archives-page',
  standalone: true,
  templateUrl: './archives.page.html',
  styleUrls: ['./archives.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TopbarComponent]
})
export class ArchivesPageComponent {
  private readonly receiptArchiveStore = inject(ReceiptArchiveStore);

  protected readonly receiptArchives = computed(() =>
    this.receiptArchiveStore
      .records()
      .slice()
      .sort((a, b) => b.sentAt - a.sentAt)
  );

  protected formatDate(ts: number): string {
    return new Date(ts).toLocaleString('fr-FR');
  }

  protected kindLabel(kind: 'fiscal_receipt' | 'payment_certificate'): string {
    return kind === 'fiscal_receipt' ? 'Recu fiscal' : 'Attestation de paiement';
  }

  protected channelLabel(channel: 'email' | 'paper'): string {
    return channel === 'email' ? 'Email' : 'Courrier papier';
  }
}

