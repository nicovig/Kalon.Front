import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { FormTextareaComponent } from '../../layout/forms/textarea/form-textarea.component';
import { FormSelectComponent, FormSelectOption } from '../../layout/forms/select/form-select.component';
import { ContactStoreService } from '../contact/contact.store';
import { contactDisplayName, ContactStatus, IContact } from '../../core/models/contact.model';
import {
  AdvancedFilters,
  RecipientSelectorItem,
  QuickFilter,
  RecipientSelectorComponent
} from '../../layout/recipient-selector/recipient-selector.component';
import { ContactSettingsStore } from '../contact/settings/contact-settings.store';

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
    RecipientSelectorComponent
  ]
})
export class ReceiptPageComponent {
  private readonly contactStore = inject(ContactStoreService);
  private readonly contactSettings = inject(ContactSettingsStore);

  protected readonly contactsCount = computed(() => this.contactStore.contacts().length);
  protected readonly itemsPerPage = 15;

  protected readonly quickFilter = signal<QuickFilter>('all');
  protected readonly searchQuery = signal('');
  protected readonly appliedMonthsMin = signal(0);
  protected readonly appliedTotalDonationMin = signal<number | null>(null);
  protected readonly appliedTotalDonationMax = signal<number | null>(null);
  protected readonly appliedDonationCountMin = signal<number | null>(null);
  protected readonly appliedDepartmentCodes = signal<string[] | null>(null);
  protected readonly appliedHorsFrance = signal(false);
  protected readonly pageIndex = signal(0);

  protected readonly selectedcontactIds = signal<Set<string>>(new Set());
  protected readonly selectedCount = computed(() => this.selectedcontactIds().size);
  protected readonly previewcontactId = signal<string | null>(null);

  protected activeStep: 1 | 2 | 3 = 1;
  protected selectedTemplateId = signal<'standard' | 'impact' | 'legacy'>('standard');
  protected receiptBody = signal(
    'Nous vous remercions chaleureusement pour votre don. Ce reçu fiscal certifie votre contribution et vous permet de bénéficier des avantages fiscaux en vigueur.'
  );
  protected receiptFooter = signal("L'équipe de {{nom_association}}");
  protected readonly associationLogoUrl = signal('');
  protected readonly selectedReceiptSignatureId = signal('team');

  protected readonly signaturePresets = [
    {
      id: 'team',
      label: "L'équipe de l'association",
      value: "L'équipe de {{nom_association}}"
    },
    {
      id: 'president',
      label: 'Le président / la présidente',
      value: 'Le président / la présidente de {{nom_association}}'
    },
    {
      id: 'treasurer',
      label: 'Le trésorier / la trésorière',
      value: 'Le trésorier / la trésorière de {{nom_association}}'
    }
  ] as const;

  protected readonly signatureOptions = computed<FormSelectOption[]>(() =>
    this.signaturePresets.map((s) => ({ value: s.id, label: s.label }))
  );

  protected onReceiptSignatureChange(id: string): void {
    this.selectedReceiptSignatureId.set(id);
    const preset = this.signaturePresets.find((s) => s.id === id);
    if (preset) {
      this.receiptFooter.set(preset.value);
    }
  }

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

  protected readonly filteredcontacts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const quick = this.quickFilter();
    const monthsMin = this.appliedMonthsMin();
    const totalMin = this.appliedTotalDonationMin();
    const totalMax = this.appliedTotalDonationMax();
    const donationCountMin = this.appliedDonationCountMin();
    const departmentCodes = this.appliedDepartmentCodes();
    const horsFrance = this.appliedHorsFrance();
    const all = this.contactStore.contacts();

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

      if (!horsFrance && this.isOutsideFrance(d)) return false;

      if (departmentCodes?.length) {
        const dept = this.departmentOf(d);
        if (!dept || !departmentCodes.includes(dept)) return false;
      }

      if (!q) return true;
      const name = contactDisplayName(d).toLowerCase();
      const email = (d.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  });

  protected readonly filteredcontactsLength = computed(() => this.filteredcontacts().length);
  protected readonly pagedcontacts = computed(() => {
    const start = this.pageIndex() * this.itemsPerPage;
    return this.filteredcontacts().slice(start, start + this.itemsPerPage);
  });

  protected readonly pagedRecipientItems = computed<RecipientSelectorItem[]>(() =>
    this.pagedcontacts().map((d) => {
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
        title: contactDisplayName(d),
        subtitle: this.contactMetaLine(d),
        avatarText: this.initials(d),
        badgeText,
        badgeClass
      };
    })
  );

  protected readonly totalPages = computed(() => {
    const len = this.filteredcontacts().length;
    return Math.max(1, Math.ceil(len / this.itemsPerPage));
  });

  protected readonly selectedcontactsForPreview = computed(() => {
    const selected = this.selectedcontactIds();
    return this.filteredcontacts().filter((d) => selected.has(d.id));
  });

  protected readonly previewcontactOptions = computed<FormSelectOption[]>(() =>
    this.selectedcontactsForPreview().map((d) => ({ value: d.id, label: contactDisplayName(d) }))
  );

  protected readonly selectedcontactsForStep3Count = computed(() => this.selectedcontactsForPreview().length);

  protected goToStep(step: 1 | 2 | 3): void {
    this.activeStep = step;
    if (step === 3) this.syncPreviewIfNeeded();
  }

  protected setTemplate(id: 'standard' | 'impact' | 'legacy'): void {
    this.selectedTemplateId.set(id);
  }

  protected setQuickFilter(v: QuickFilter): void {
    this.quickFilter.set(v);
    this.pageIndex.set(0);
    this.syncPreviewIfNeeded();
  }

  protected onSearchInput(v: string): void {
    this.searchQuery.set(v);
    this.pageIndex.set(0);
    this.syncPreviewIfNeeded();
  }

  protected togglecontact(id: string): void {
    const next = new Set(this.selectedcontactIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedcontactIds.set(next);
    this.syncPreviewIfNeeded();
  }

  protected selectAllFiltered(): void {
    this.selectedcontactIds.set(new Set(this.filteredcontacts().map((d) => d.id)));
    this.syncPreviewIfNeeded();
  }

  protected deselectAll(): void {
    this.selectedcontactIds.set(new Set());
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

  protected onAdvancedFiltersApplied(filters: AdvancedFilters): void {
    this.appliedMonthsMin.set(filters.monthsMin);
    this.appliedTotalDonationMin.set(filters.totalDonationMin);
    this.appliedTotalDonationMax.set(filters.totalDonationMax);
    this.appliedDonationCountMin.set(filters.donationCountMin);
    this.appliedDepartmentCodes.set(filters.departmentCodes);
    this.appliedHorsFrance.set(filters.horsFrance);
    this.pageIndex.set(0);
    this.syncPreviewIfNeeded();
  }

  private departmentOf(d: IContact): string | null {
    const raw = d.address?.postalCode?.trim();
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 2) return null;
    if ((digits.startsWith('97') || digits.startsWith('98')) && digits.length >= 3) {
      return digits.slice(0, 3);
    }
    if (digits.startsWith('20')) {
      const third = digits[2] ?? '';
      return third === '0' || third === '1' ? '2A' : '2B';
    }
    return digits.slice(0, 2);
  }

  private isOutsideFrance(d: IContact): boolean {
    const c = d.address?.country?.trim().toLowerCase();
    if (!c) return true;
    return c !== 'france';
  }

  protected onPreviewcontactChange(v: string): void {
    this.previewcontactId.set(v || null);
  }

  protected contactPreviewName(): string {
    const id = this.previewcontactId();
    if (!id) return '—';
    const d = this.contactStore.contacts().find((x) => x.id === id);
    return d ? contactDisplayName(d) : '—';
  }

  protected contactPreviewAmount(): string {
    const id = this.previewcontactId();
    if (!id) return '—';
    const d = this.contactStore.contacts().find((x) => x.id === id);
    return d ? `${d.totalDonation.toLocaleString('fr-FR')} €` : '—';
  }

  protected currentTemplateTitle(): string {
    return this.templateOptions.find((x) => x.id === this.selectedTemplateId())?.title ?? 'Modèle';
  }

  private syncPreviewIfNeeded(): void {
    const options = this.selectedcontactsForPreview();
    const first = options[0];
    if (!first) {
      this.previewcontactId.set(null);
      return;
    }
    const current = this.previewcontactId();
    if (!current || !options.some((d) => d.id === current)) {
      this.previewcontactId.set(first.id);
    }
  }

  private statusOf(d: IContact): ContactStatus {
    return this.contactSettings.statusOf(d);
  }

  private contactMetaLine(d: IContact): string {
    if (!d.lastDonation) {
      return `Aucun don enregistré · ${d.totalDonation} € au total`;
    }
    const when = d.lastDonation.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    return `Dernier don : ${when} · ${d.totalDonation} €`;
  }

  private monthsSinceLast(d: IContact): number {
    if (!d.lastDonation) return 0;
    const now = new Date();
    const from = d.lastDonation;
    let m = (now.getFullYear() - from.getFullYear()) * 12;
    m += now.getMonth() - from.getMonth();
    return Math.max(0, m);
  }

  private initials(d: IContact): string {
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

