import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { PopupShellComponent } from '../../layout/popup/popup-shell.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { ToastService } from '../../layout/toast/toast.service';
import { TableColumn, TableComponent } from '../../layout/table/table.component';
import { OrganizationDocumentsStore } from './organization-documents.store';
import { MailLogDetailsResponseApiModel, MailLogListResponseApiModel } from '../../core/api/backend-api.model';

type SendType =
  | 'cerfa_11580'
  | 'cerfa_16216'
  | 'payment_attestation'
  | 'membership_certificate'
  | 'message';

type ArchiveTableRow = {
  id: string;
  entryType: 'mail';
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
  imports: [CommonModule, TopbarComponent, TableComponent, PopupShellComponent, ButtonLabelComponent]
})
export class ArchivesPageComponent {
  private readonly documentsStore = inject(OrganizationDocumentsStore);
  private readonly toast = inject(ToastService);
  protected readonly selectedMailLogId = signal<string | null>(null);
  protected readonly selectedMailLogDetails = signal<MailLogDetailsResponseApiModel | null>(null);
  protected readonly detailsLoading = signal(false);
  protected readonly detailsError = signal<string | null>(null);
  protected readonly confirmLoading = signal(false);
  protected readonly regenerateConfirmOpen = signal(false);
  protected readonly mailLogs = computed(() =>
    this.documentsStore
      .mailLogs()
      .slice()
      .sort((a, b) => this.tsOf(b.date) - this.tsOf(a.date))
  );

  protected readonly hasAny = computed(() => this.mailLogs().length > 0);

  protected readonly archiveRows = computed(() => {
    return this.mailLogs().map((log) => ({
      id: String(log.id ?? '').trim(),
      entryType: 'mail',
      typeLabel: this.sendTypeLabelFr(log.type),
      dateLabel: this.formatDateReadable(log.date),
      channelLabel: log.isEmail === true ? 'Email' : 'Courrier',
      recipientName: this.recipientNameFromMailLog(log),
      statusLabel: this.archiveStatusLabelFr(log.status)
    }));
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

  protected onArchiveRowClick(row: unknown): void {
    if (!row || typeof row !== 'object') return;
    const typed = row as ArchiveTableRow;
    if (typed.entryType !== 'mail') return;
    const id = String(typed.id ?? '').trim();
    if (!id) {
      this.toast.show('Détail indisponible pour ce log (identifiant manquant).', 'alert');
      return;
    }
    this.openMailLogDetails(id);
  }

  protected closeMailLogDetails(): void {
    this.selectedMailLogId.set(null);
    this.selectedMailLogDetails.set(null);
    this.detailsLoading.set(false);
    this.detailsError.set(null);
    this.confirmLoading.set(false);
    this.regenerateConfirmOpen.set(false);
  }

  protected canConfirmSelectedMailLog(): boolean {
    const details = this.selectedMailLogDetails();
    if (!details?.id) return false;
    if (details.isEmail !== false) return false;
    return String(details.status ?? '').trim().toLowerCase() === 'printed';
  }

  protected canRegenerateSelectedMailLog(): boolean {
    const details = this.selectedMailLogDetails();
    if (!details?.id) return false;
    if (details.isEmail === false) return false;
    return true;
  }

  protected detailContactCoordinateLabel(detail: MailLogDetailsResponseApiModel): string {
    if (detail.isEmail !== false) {
      return detail.contactEmail || 'Non renseigné';
    }
    const street = String((detail as any)?.contactStreet ?? '').trim();
    const postalCode = String((detail as any)?.contactPostalCode ?? '').trim();
    const city = String((detail as any)?.contactCity ?? '').trim();
    const address = [street, postalCode, city].filter(Boolean).join(', ');
    return address || 'Adresse postale non renseignée';
  }

  protected detailDocumentTypeLabel(raw: string | null | undefined): string {
    return this.sendTypeLabelFr(raw);
  }

  protected confirmSelectedMailLog(): void {
    const details = this.selectedMailLogDetails();
    const id = String(details?.id ?? '').trim();
    if (!id || this.confirmLoading()) return;
    this.confirmLoading.set(true);
    this.documentsStore.confirmMailed(id).subscribe((ok) => {
      this.confirmLoading.set(false);
      if (!ok) {
        this.toast.show("La confirmation d'envoi papier a échoué.", 'alert');
        return;
      }
      this.selectedMailLogDetails.set({
        ...(details ?? {}),
        id,
        status: 'mailed',
        mailedAt: new Date().toISOString()
      });
      this.toast.show('Courrier marqué comme expédié.', 'success');
    });
  }

  protected openRegenerateConfirm(): void {
    if (!this.canRegenerateSelectedMailLog()) return;
    this.regenerateConfirmOpen.set(true);
  }

  protected closeRegenerateConfirm(): void {
    this.regenerateConfirmOpen.set(false);
  }

  protected confirmRegenerateFromLog(): void {
    const details = this.selectedMailLogDetails();
    if (!details?.id) {
      this.regenerateConfirmOpen.set(false);
      return;
    }
    this.toast.show("La régénération sera branchée sur l'endpoint backend dédié.", 'info');
    this.regenerateConfirmOpen.set(false);
  }

  protected getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      sent: 'Envoyé',
      error: 'Erreur',
      printed: 'À confirmer',
      mailed: 'Expédié',
    };
    return map[status] ?? 'Non renseigné';
  }

  private openMailLogDetails(mailLogId: string): void {
    this.selectedMailLogId.set(mailLogId);
    this.selectedMailLogDetails.set(null);
    this.detailsError.set(null);
    this.detailsLoading.set(true);
    this.documentsStore.getMailLogById(mailLogId).subscribe({
      next: (details) => {
        this.selectedMailLogDetails.set(details ?? null);
        this.detailsLoading.set(false);
      },
      error: () => {
        this.detailsError.set('Impossible de charger le détail du log.');
        this.detailsLoading.set(false);
      }
    });
  }

  private recipientNameFromMailLog(log: MailLogListResponseApiModel): string {
    const fromApi = String(log.sendAt ?? '').trim();
    if (fromApi) {
      return fromApi;
    }
    const fn = String(log.firstname ?? log.firstName ?? '').trim();
    const ln = String(log.lastname ?? log.lastName ?? '').trim();
    const combined = `${fn} ${ln}`.trim();
    return combined || 'Non renseigné';
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
    return t || 'Type inconnu';
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
    return 'Type inconnu';
  }

  private formatDateReadable(value?: string): string {
    if (!value) {
      return 'Date non renseignée';
    }
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) {
      return 'Date invalide';
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
      return 'Non renseigné';
    }
    const map: Record<string, string> = {
      sent: 'Envoyé',
      error: 'Erreur',
      
      printed: 'À confirmer',
      mailed: 'Expédié',
      delivered: 'Livré',
      failed: 'Échec',
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
