import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { OrganizationDocumentsStore } from './organization-documents.store';

@Component({
  selector: 'archives-page',
  standalone: true,
  templateUrl: './archives.page.html',
  styleUrls: ['./archives.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TopbarComponent]
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
      .sort((a, b) => this.tsOf(b.createdAt) - this.tsOf(a.createdAt))
  );

  protected readonly hasAny = computed(
    () => this.generatedDocuments().length > 0 || this.mailLogs().length > 0
  );

  constructor() {
    this.documentsStore.load();
  }

  protected formatDate(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('fr-FR');
  }

  protected logChannelLabel(isEmail?: boolean): string {
    return isEmail ? 'Email' : 'Courrier papier';
  }

  protected logStatusLabel(status?: string | null): string {
    const s = String(status ?? '').toLowerCase();
    if (s === 'printed') return 'À confirmer';
    if (!s) return '—';
    return status ?? '—';
  }

  protected documentTypeLabel(type?: string | null): string {
    const normalized = String(type ?? '').toLowerCase();
    if (normalized.includes('receipt') || normalized.includes('recu')) return 'Reçu fiscal';
    if (normalized.includes('attestation')) return 'Attestation';
    if (!normalized) return 'Document';
    return type ?? 'Document';
  }

  private tsOf(value?: string): number {
    if (!value) return 0;
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : 0;
  }
}
