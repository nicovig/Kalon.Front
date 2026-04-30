import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { PopupShellComponent } from '../../layout/popup/popup-shell.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { InlineLoaderComponent } from '../../layout/inline-loader/inline-loader.component';
import { ToastService } from '../../layout/toast/toast.service';
import { TableColumn, TableComponent } from '../../layout/table/table.component';
import { FormSelectComponent, FormSelectOption } from '../../layout/forms/select/form-select.component';
import { FormDateComponent } from '../../layout/forms/date/form-date.component';
import { FormTextComponent } from '../../layout/forms/text/form-text.component';
import { OrganizationDocumentsStore } from './organization-documents.store';
import { MailLogDetailsResponseApiModel, MailLogListResponseApiModel } from '../../core/api/backend-api.model';
import { DashboardNotificationStore } from '../../core/notification/dashboard-notification.store';

type SendType =
  | 'tax_receipt'
  | 'payment_attestation'
  | 'membership_certificate'
  | 'message';

type ArchiveTableRow = {
  id: string;
  entryType: 'mail';
  typeLabel: string;
  dateLabel: string;
  dateKey: string;
  channelLabel: string;
  channelKey: 'email' | 'print';
  recipientName: string;
  statusLabel: string;
  statusNorm: string;
};

@Component({
  selector: 'archives-page',
  standalone: true,
  templateUrl: './archives.page.html',
  styleUrls: ['./archives.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TopbarComponent,
    TableComponent,
    PopupShellComponent,
    ButtonLabelComponent,
    InlineLoaderComponent,
    FormSelectComponent,
    FormDateComponent,
    FormTextComponent
  ]
})
export class ArchivesPageComponent {
  private readonly documentsStore = inject(OrganizationDocumentsStore);
  private readonly dashboardNotificationStore = inject(DashboardNotificationStore);
  private readonly toast = inject(ToastService);
  protected readonly selectedMailLogId = signal<string | null>(null);
  protected readonly selectedMailLogDetails = signal<MailLogDetailsResponseApiModel | null>(null);
  protected readonly detailsLoading = signal(false);
  protected readonly detailsError = signal<string | null>(null);
  protected readonly confirmLoading = signal(false);
  protected readonly regenerateLoading = signal(false);
  protected readonly regenerateConfirmOpen = signal(false);
  protected readonly filterType = signal<string>('all');
  protected readonly filterDateFrom = signal<string>('');
  protected readonly filterDateTo = signal<string>('');
  protected readonly filterChannel = signal<string>('all');
  protected readonly filterRecipient = signal<string>('');
  protected readonly filterStatus = signal<string>('all');

  protected readonly mailLogs = computed(() =>
    this.documentsStore
      .mailLogs()
      .slice()
      .sort((a, b) => this.tsOf(b.date) - this.tsOf(a.date))
  );

  protected readonly hasAny = computed(() => this.mailLogs().length > 0);

  protected readonly archiveRows = computed(() => {
    return this.mailLogs().map((log) => {
      const statusNorm = String(log.status ?? '').trim().toLowerCase() || '_none';
      return {
        id: String(log.id ?? '').trim(),
        entryType: 'mail' as const,
        typeLabel: this.sendTypeLabelFr(log.type),
        dateLabel: this.formatDateReadable(log.date),
        dateKey: this.dateKeyFromIso(log.date),
        channelLabel: log.isEmail === true ? 'Email' : 'Courrier',
        channelKey: (log.isEmail === true ? 'email' : 'print') as 'email' | 'print',
        recipientName: this.recipientNameFromMailLog(log),
        statusLabel: this.archiveStatusLabelFr(log.status),
        statusNorm
      };
    });
  });

  protected readonly maxForDateFrom = computed(() => this.filterDateTo().trim() || null);
  protected readonly minForDateTo = computed(() => this.filterDateFrom().trim() || null);

  protected readonly filteredArchiveRows = computed(() => {
    const ft = this.filterType();
    let from = this.filterDateFrom().trim();
    let to = this.filterDateTo().trim();
    if (from && to && from > to) {
      const s = from;
      from = to;
      to = s;
    }
    const fc = this.filterChannel();
    const fr = this.filterRecipient().trim().toLowerCase();
    const fs = this.filterStatus();
    return this.archiveRows().filter((row) => {
      if (ft !== 'all' && row.typeLabel !== ft) return false;
      if (from || to) {
        if (!row.dateKey) return false;
        if (from && row.dateKey < from) return false;
        if (to && row.dateKey > to) return false;
      }
      if (fc !== 'all' && row.channelKey !== fc) return false;
      if (fr && !row.recipientName.toLowerCase().includes(fr)) return false;
      if (fs !== 'all' && row.statusNorm !== fs) return false;
      return true;
    });
  });

  protected readonly filterTypeOptions = computed<FormSelectOption[]>(() => {
    const labels = [...new Set(this.archiveRows().map((r) => r.typeLabel))].sort((a, b) =>
      a.localeCompare(b, 'fr')
    );
    return [{ value: 'all', label: 'Tous' }, ...labels.map((label) => ({ value: label, label }))];
  });

  protected readonly filterChannelOptions: FormSelectOption[] = [
    { value: 'all', label: 'Tous' },
    { value: 'email', label: 'Email' },
    { value: 'print', label: 'Courrier' }
  ];

  protected readonly filterStatusOptions = computed<FormSelectOption[]>(() => {
    const map = new Map<string, string>();
    for (const row of this.archiveRows()) {
      if (!map.has(row.statusNorm)) {
        map.set(row.statusNorm, row.statusLabel);
      }
    }
    const entries = [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
    return [{ value: 'all', label: 'Tous' }, ...entries.map(([value, label]) => ({ value, label }))];
  });

  protected readonly archiveColumns: TableColumn[] = [
    { key: 'typeLabel', header: 'Type' },
    { key: 'dateLabel', header: 'Date' },
    { key: 'channelLabel', header: 'Envoyé en' },
    { key: 'recipientName', header: 'Envoyé à' },
    { key: 'statusLabel', header: 'Statut' }
  ];

  constructor() {
    this.documentsStore.load();
  }

  protected onFilterTypeChange(value: string): void {
    this.filterType.set(value ?? 'all');
  }

  protected onFilterDateFromChange(value: string): void {
    this.filterDateFrom.set(String(value ?? '').trim());
  }

  protected onFilterDateToChange(value: string): void {
    this.filterDateTo.set(String(value ?? '').trim());
  }

  protected onFilterChannelChange(value: string): void {
    this.filterChannel.set(value ?? 'all');
  }

  protected onFilterRecipientChange(value: string): void {
    this.filterRecipient.set(String(value ?? ''));
  }

  protected onFilterStatusChange(value: string): void {
    this.filterStatus.set(value ?? 'all');
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
    this.regenerateLoading.set(false);
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
      this.dashboardNotificationStore.refresh();
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
    const generatedDocumentId = String(details?.generatedDocumentId ?? '').trim();
    if (!generatedDocumentId) {
      this.toast.show('Document source introuvable pour la régénération.', 'alert');
      this.regenerateConfirmOpen.set(false);
      return;
    }
    if (this.regenerateLoading()) return;
    this.regenerateLoading.set(true);
    this.documentsStore.regenerateGeneratedDocument(generatedDocumentId).subscribe((blob) => {
      this.regenerateLoading.set(false);
      this.regenerateConfirmOpen.set(false);
      if (!blob || blob.size === 0) {
        this.toast.show('La régénération du document a échoué.', 'alert');
        return;
      }
      const order = String(details?.generatedDocumentOrderNumber ?? '').trim();
      const filename = order
        ? `document-regenerated-${order}.pdf`
        : `document-regenerated-${generatedDocumentId}.pdf`;
      this.downloadBlob(blob, filename);
      this.dashboardNotificationStore.refresh();
      this.toast.show('Document régénéré avec succès.', 'success');
    });
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
      return this.labelForSendType('tax_receipt');
    }
    if (normalized.includes('16216')) {
      return this.labelForSendType('tax_receipt');
    }
    const t = String(raw ?? '').trim();
    return t || 'Type inconnu';
  }

  private parseSendTypeKey(value: string): SendType | null {
    if (
      value === 'tax_receipt' ||
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
    if (value === 'tax_receipt') {
      return 'Reçu fiscal';
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

  private dateKeyFromIso(iso?: string): string {
    if (!iso) {
      return '';
    }
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) {
      return '';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
