import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { TableColumn, TableComponent } from '../../layout/table/table.component';
import { OrganizationDocumentsStore } from './organization-documents.store';
import { MailLogListResponseApiModel } from '../../core/api/backend-api.model';

type SendType =
  | 'cerfa_11580'
  | 'cerfa_16216'
  | 'payment_attestation'
  | 'membership_certificate'
  | 'message';

type ArchiveTableRow = {
  id: string;
  typeLabel: string;
  dateLabel: string;
  channelLabel: string;
  recipientName: string;
  statusLabel: string;
};

@Component({
  selector: 'archives-page',
  standalone: true,
  templateUrl: './archives.page.html',
  styleUrls: ['./archives.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TopbarComponent, TableComponent]
})
export class ArchivesPageComponent {
  private readonly documentsStore = inject(OrganizationDocumentsStore);

  protected readonly generatedDocuments = computed(() =>
    this.documentsStore
      .generatedDocuments()
      .slice()
      .sort((a, b) => this.tsOf(b.createdAt) - this.tsOf(a.createdAt))
  );
  protected readonly mailLogs = computed(() =>
    this.documentsStore
      .mailLogs()
      .slice()
      .sort((a, b) => this.tsOf(b.date) - this.tsOf(a.date))
  );

  protected readonly hasAny = computed(
    () => this.generatedDocuments().length > 0 || this.mailLogs().length > 0
  );

  protected readonly archiveRows = computed(() => {
    const merged: { ts: number; row: ArchiveTableRow }[] = [];
    let genFallback = 0;
    for (const doc of this.generatedDocuments()) {
      const id = doc.id ? `gen-${doc.id}` : `gen-${genFallback++}`;
      merged.push({
        ts: this.tsOf(doc.createdAt),
        row: {
          id,
          typeLabel: this.sendTypeLabelFr(doc.documentType),
          dateLabel: this.formatDateReadable(doc.createdAt),
          channelLabel: '—',
          recipientName: '—',
          statusLabel: this.archiveStatusLabelFr(doc.status)
        }
      });
    }
    let mailFallback = 0;
    for (const log of this.mailLogs()) {
      const id = this.mailLogRowId(log, mailFallback++);
      merged.push({
        ts: this.tsOf(log.date),
        row: {
          id,
          typeLabel: this.sendTypeLabelFr(log.type),
          dateLabel: this.formatDateReadable(log.date),
          channelLabel:
            log.isEmail === true ? 'Email' : log.isEmail === false ? 'Courrier' : '—',
          recipientName: this.recipientNameFromMailLog(log),
          statusLabel: this.archiveStatusLabelFr(log.status)
        }
      });
    }
    merged.sort((a, b) => b.ts - a.ts);
    return merged.map((m) => m.row);
  });

  protected readonly archiveColumns: TableColumn[] = [
    { key: 'typeLabel', header: 'Type', searchable: true },
    { key: 'dateLabel', header: 'Date', searchable: true },
    { key: 'channelLabel', header: 'Envoyé en', searchable: true },
    { key: 'recipientName', header: 'Envoyé à', searchable: true },
    { key: 'statusLabel', header: 'Statut', searchable: true }
  ];

  constructor() {
    this.documentsStore.load();
  }

  private mailLogRowId(log: MailLogListResponseApiModel, fallbackIndex: number): string {
    if (log.id) {
      return `mail-${log.id}`;
    }
    const t = this.tsOf(log.date);
    return `mail-${fallbackIndex}-${t}`;
  }

  private recipientNameFromMailLog(log: MailLogListResponseApiModel): string {
    const fromApi = String(log.sendAt ?? '').trim();
    if (fromApi) {
      return fromApi;
    }
    const fn = String(log.firstname ?? log.firstName ?? '').trim();
    const ln = String(log.lastname ?? log.lastName ?? '').trim();
    const combined = `${fn} ${ln}`.trim();
    return combined || '—';
  }

  private sendTypeLabelFr(raw: string | null | undefined): string {
    const normalized = String(raw ?? '').trim().toLowerCase();
    const asSend = this.parseSendTypeKey(normalized);
    if (asSend) {
      return this.labelForSendType(asSend);
    }
    if (normalized.includes('11580')) {
      return this.labelForSendType('cerfa_11580');
    }
    if (normalized.includes('16216')) {
      return this.labelForSendType('cerfa_16216');
    }
    const t = String(raw ?? '').trim();
    return t || '—';
  }

  private parseSendTypeKey(value: string): SendType | null {
    if (
      value === 'cerfa_11580' ||
      value === 'cerfa_16216' ||
      value === 'payment_attestation' ||
      value === 'membership_certificate' ||
      value === 'message'
    ) {
      return value;
    }
    return null;
  }

  private labelForSendType(value: SendType): string {
    if (value === 'message') {
      return 'Relance / message personnalisé';
    }
    if (value === 'cerfa_11580') {
      return 'Reçu fiscal (Cerfa 11580)';
    }
    if (value === 'cerfa_16216') {
      return 'Reçu fiscal (Cerfa 16216)';
    }
    if (value === 'payment_attestation') {
      return 'Attestation de cotisation';
    }
    if (value === 'membership_certificate') {
      return "Certificat d'adhésion";
    }
    return '—';
  }

  private formatDateReadable(value?: string): string {
    if (!value) {
      return '—';
    }
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) {
      return '—';
    }
    return d.toLocaleString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private archiveStatusLabelFr(status?: string | null): string {
    const s = String(status ?? '').trim().toLowerCase();
    if (!s) {
      return '—';
    }
    const map: Record<string, string> = {
      printed: 'À confirmer',
      mailed: 'Expédié',
      sent: 'Envoyé',
      delivered: 'Livré',
      failed: 'Échec',
      error: 'Erreur',
      pending: 'En attente',
      processing: 'En cours',
      completed: 'Terminé',
      draft: 'Brouillon',
      cancelled: 'Annulé',
      generated: 'Généré',
      ready: 'Prêt'
    };
    return map[s] ?? String(status ?? '').trim();
  }

  private tsOf(value?: string): number {
    if (!value) {
      return 0;
    }
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : 0;
  }
}
