import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { FormTextareaComponent } from '../../layout/forms/textarea/form-textarea.component';
import { FormSelectComponent, FormSelectOption } from '../../layout/forms/select/form-select.component';
import { DonorStoreService } from '../donor/donor.store';
import { donorDisplayName, DonorStatus, IDonor } from '../../core/models/donor.model';
import {
  ReminderAdvancedFilters,
  RecipientSelectorItem,
  ReminderQuickFilter,
  ReminderRecipientSelectorComponent
} from '../reminder/reminder-recipient-selector/reminder-recipient-selector.component';
import { DonorSettingsStore } from '../donor/settings/donor-settings.store';

@Component({
  selector: 'receipt-page',
  standalone: true,
  templateUrl: './receipt.page.html',
  styleUrls: ['./receipt.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TopbarComponent,
    ButtonLabelComponent,
    FormTextareaComponent,
    FormSelectComponent,
    ReminderRecipientSelectorComponent
  ]
})
export class ReceiptPageComponent {
  private readonly donorStore = inject(DonorStoreService);
  private readonly donorSettings = inject(DonorSettingsStore);

  protected readonly donorsCount = computed(() => this.donorStore.donors().length);
  protected readonly itemsPerPage = 15;

  protected readonly quickFilter = signal<ReminderQuickFilter>('all');
  protected readonly searchQuery = signal('');
  protected readonly appliedMonthsMin = signal(0);
  protected readonly appliedTotalDonationMin = signal<number | null>(null);
  protected readonly appliedTotalDonationMax = signal<number | null>(null);
  protected readonly appliedDonationCountMin = signal<number | null>(null);
  protected readonly pageIndex = signal(0);

  protected readonly selectedDonorIds = signal<Set<string>>(new Set());
  protected readonly selectedCount = computed(() => this.selectedDonorIds().size);
  protected readonly previewDonorId = signal<string | null>(null);

  protected activeStep: 1 | 2 | 3 = 1;
  protected selectedTemplateId = signal<'standard' | 'impact' | 'legacy'>('standard');
  protected receiptBody = signal(
    'Nous vous remercions chaleureusement pour votre don. Ce reçu fiscal certifie votre contribution et vous permet de bénéficier des avantages fiscaux en vigueur.'
  );
  protected receiptFooter = signal("L'équipe Kalon");

  protected readonly templateOptions = [
    {
      id: 'standard' as const,
      emoji: '🧾',
      title: 'Modèle standard',
      description: 'Format sobre pour un envoi classique.'
    },
    {
      id: 'impact' as const,
      emoji: '🌱',
      title: 'Modèle impact',
      description: "Met en avant l'utilité du don et la mission."
    },
    {
      id: 'legacy' as const,
      emoji: '🏛️',
      title: 'Modèle institution',
      description: 'Ton plus formel pour mécènes et partenaires.'
    }
  ];

  protected readonly filteredDonors = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const quick = this.quickFilter();
    const monthsMin = this.appliedMonthsMin();
    const totalMin = this.appliedTotalDonationMin();
    const totalMax = this.appliedTotalDonationMax();
    const donationCountMin = this.appliedDonationCountMin();
    const all = this.donorStore.donors();

    return all.filter((d) => {
      const status = this.statusOf(d);
      if (quick !== 'all') {
        const match =
          quick === 'to_remind'
            ? status === 'to_remind'
            : quick === 'new'
              ? status === 'new'
              : quick === 'active'
                ? status === 'active'
                : status === 'inactive';
        if (!match) return false;
      }

      if (monthsMin > 0 && this.monthsSinceLast(d) < monthsMin) return false;
      if (typeof totalMin === 'number' && !Number.isNaN(totalMin) && d.totalDonation < totalMin) return false;
      if (typeof totalMax === 'number' && !Number.isNaN(totalMax) && d.totalDonation > totalMax) return false;
      if (typeof donationCountMin === 'number' && !Number.isNaN(donationCountMin) && d.donationCount < donationCountMin) return false;

      if (!q) return true;
      const name = donorDisplayName(d).toLowerCase();
      const email = (d.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  });

  protected readonly filteredDonorsLength = computed(() => this.filteredDonors().length);
  protected readonly pagedDonors = computed(() => {
    const start = this.pageIndex() * this.itemsPerPage;
    return this.filteredDonors().slice(start, start + this.itemsPerPage);
  });

  protected readonly pagedRecipientItems = computed<RecipientSelectorItem[]>(() =>
    this.pagedDonors().map((d) => {
      const status = this.statusOf(d);
      const badgeText =
        status === 'to_remind' && d.lastDonation
          ? `${this.monthsSinceLast(d)} mois`
          : status === 'active'
            ? 'Actif'
            : status === 'new'
              ? 'Nouveau'
              : status === 'inactive'
                ? 'Inactif'
                : undefined;
      const badgeClass =
        status === 'active' || status === 'new'
          ? 'db-actif'
          : status === 'to_remind' || status === 'inactive'
            ? 'db-relance'
            : '';

      return {
        id: d.id,
        title: donorDisplayName(d),
        subtitle: this.donorMetaLine(d),
        avatarText: this.initials(d),
        badgeText,
        badgeClass
      };
    })
  );

  protected readonly totalPages = computed(() => {
    const len = this.filteredDonors().length;
    return Math.max(1, Math.ceil(len / this.itemsPerPage));
  });

  protected readonly selectedDonorsForPreview = computed(() => {
    const selected = this.selectedDonorIds();
    return this.filteredDonors().filter((d) => selected.has(d.id));
  });

  protected readonly previewDonorOptions = computed<FormSelectOption[]>(() =>
    this.selectedDonorsForPreview().map((d) => ({ value: d.id, label: donorDisplayName(d) }))
  );

  protected readonly selectedDonorsForStep3Count = computed(() => this.selectedDonorsForPreview().length);

  protected goToStep(step: 1 | 2 | 3): void {
    this.activeStep = step;
    if (step === 3) this.syncPreviewIfNeeded();
  }

  protected setTemplate(id: 'standard' | 'impact' | 'legacy'): void {
    this.selectedTemplateId.set(id);
  }

  protected setQuickFilter(v: ReminderQuickFilter): void {
    this.quickFilter.set(v);
    this.pageIndex.set(0);
    this.syncPreviewIfNeeded();
  }

  protected onSearchInput(v: string): void {
    this.searchQuery.set(v);
    this.pageIndex.set(0);
    this.syncPreviewIfNeeded();
  }

  protected toggleDonor(id: string): void {
    const next = new Set(this.selectedDonorIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedDonorIds.set(next);
    this.syncPreviewIfNeeded();
  }

  protected selectAllFiltered(): void {
    this.selectedDonorIds.set(new Set(this.filteredDonors().map((d) => d.id)));
    this.syncPreviewIfNeeded();
  }

  protected deselectAll(): void {
    this.selectedDonorIds.set(new Set());
    this.syncPreviewIfNeeded();
  }

  protected prevPage(): void {
    const p = this.pageIndex();
    if (p <= 0) return;
    this.pageIndex.set(p - 1);
  }

  protected nextPage(): void {
    const p = this.pageIndex();
    const max = this.totalPages() - 1;
    if (p >= max) return;
    this.pageIndex.set(p + 1);
  }

  protected onAdvancedFiltersApplied(filters: ReminderAdvancedFilters): void {
    this.appliedMonthsMin.set(filters.monthsMin);
    this.appliedTotalDonationMin.set(filters.totalDonationMin);
    this.appliedTotalDonationMax.set(filters.totalDonationMax);
    this.appliedDonationCountMin.set(filters.donationCountMin);
    this.pageIndex.set(0);
    this.syncPreviewIfNeeded();
  }

  protected onPreviewDonorChange(v: string): void {
    this.previewDonorId.set(v || null);
  }

  protected donorPreviewName(): string {
    const id = this.previewDonorId();
    if (!id) return '—';
    const d = this.donorStore.donors().find((x) => x.id === id);
    return d ? donorDisplayName(d) : '—';
  }

  protected donorPreviewAmount(): string {
    const id = this.previewDonorId();
    if (!id) return '—';
    const d = this.donorStore.donors().find((x) => x.id === id);
    return d ? `${d.totalDonation.toLocaleString('fr-FR')} €` : '—';
  }

  protected currentTemplateTitle(): string {
    return this.templateOptions.find((x) => x.id === this.selectedTemplateId())?.title ?? 'Modèle';
  }

  private syncPreviewIfNeeded(): void {
    const options = this.selectedDonorsForPreview();
    const first = options[0];
    if (!first) {
      this.previewDonorId.set(null);
      return;
    }
    const current = this.previewDonorId();
    if (!current || !options.some((d) => d.id === current)) {
      this.previewDonorId.set(first.id);
    }
  }

  private statusOf(d: IDonor): DonorStatus {
    return this.donorSettings.statusOf(d);
  }

  private donorMetaLine(d: IDonor): string {
    if (!d.lastDonation) {
      return `Aucun don enregistré · ${d.totalDonation} € au total`;
    }
    const when = d.lastDonation.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    return `Dernier don : ${when} · ${d.totalDonation} €`;
  }

  private monthsSinceLast(d: IDonor): number {
    if (!d.lastDonation) return 0;
    const now = new Date();
    const from = d.lastDonation;
    let m = (now.getFullYear() - from.getFullYear()) * 12;
    m += now.getMonth() - from.getMonth();
    return Math.max(0, m);
  }

  private initials(d: IDonor): string {
    if (d.kind === 'company' && d.enterprise?.name) {
      const parts = d.enterprise.name.trim().split(/\s+/).filter(Boolean);
      const a = parts[0]?.[0] ?? '';
      const b = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
      return `${a}${b}`.toUpperCase().slice(0, 2) || '?';
    }
    const a = d.firstname?.trim()?.[0] ?? '';
    const b = d.lastname?.trim()?.[0] ?? '';
    return `${a}${b}`.toUpperCase() || '?';
  }
}

