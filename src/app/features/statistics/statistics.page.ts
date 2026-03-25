import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { CardComponent } from '../../layout/card/card.component';
import { TableColumn, TableComponent } from '../../layout/table/table.component';
import { FormTextComponent } from '../../layout/forms/text/form-text.component';
import { FormSelectComponent, FormSelectOption } from '../../layout/forms/select/form-select.component';
import { FormDateComponent } from '../../layout/forms/date/form-date.component';
import { FormNumberComponent } from '../../layout/forms/number/form-number.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { ContactStoreService } from '../contact/contact.store';
import { DonationStoreService } from '../donation/donation.store';
import { ContactSettingsStore } from '../contact/settings/contact-settings.store';
import { ContactKind, ContactStatus, contactDisplayName, IContact } from '../../core/models/contact.model';
import { DonationPaymentMethod } from '../../core/models/donation.model';

type PeriodPreset = 'all' | 'thisMonth' | 'last3Months' | 'last6Months' | 'last12Months' | 'civilYear' | 'custom';

type DonationTableRow = {
  id: string;
  contactId: string;
  contactDisplayName: string;
  contactEmail: string;
  contactKind: ContactKind;
  contactStatus: ContactStatus;
  date: Date;
  paymentMethodLabel: string;
  amount: number;
};

@Component({
  selector: 'statistics-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TopbarComponent,
    CardComponent,
    TableComponent,
    FormTextComponent,
    FormSelectComponent,
    FormDateComponent,
    FormNumberComponent,
    ButtonLabelComponent
  ],
  templateUrl: './statistics.page.html',
  styleUrls: ['./statistics.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatisticsPageComponent {
  private readonly contactStore = inject(ContactStoreService);
  private readonly donationStore = inject(DonationStoreService);
  private readonly contactSettings = inject(ContactSettingsStore);

  protected readonly periodPreset = signal<PeriodPreset>('civilYear');
  protected readonly customFromDate = signal('');
  protected readonly customToDate = signal('');
  protected readonly contactKindFilter = signal<'all' | ContactKind>('all');
  protected readonly contactStatusFilter = signal<'all' | ContactStatus>('all');
  protected readonly minAmountInput = signal('');
  protected readonly maxAmountInput = signal('');
  protected readonly searchTerm = signal('');

  protected readonly todayDateString = new Date().toISOString().split('T')[0];

  protected readonly periodOptions: FormSelectOption[] = [
    { value: 'all', label: 'Toute la période' },
    { value: 'thisMonth', label: 'Ce mois-ci' },
    { value: 'last3Months', label: '3 derniers mois' },
    { value: 'last6Months', label: '6 derniers mois' },
    { value: 'last12Months', label: '12 derniers mois' },
    { value: 'civilYear', label: 'Année civile' },
    { value: 'custom', label: 'Période personnalisée' }
  ];

  protected readonly contactKindOptions: FormSelectOption[] = [
    { value: 'all', label: 'Tous les types' },
    { value: 'donor', label: 'Donateurs' },
    { value: 'member', label: 'Membres' },
    { value: 'helper', label: 'Aidants' },
    { value: 'company', label: 'Entreprises / mécènes' }
  ];

  protected readonly contactStatusOptions: FormSelectOption[] = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'active', label: 'Actifs' },
    { value: 'to_remind', label: 'À relancer' },
    { value: 'new', label: 'Nouveaux' },
    { value: 'inactive', label: 'Inactifs' },
    { value: 'out', label: 'Sortis' }
  ];

  protected readonly donationColumns: TableColumn[] = [
    { key: 'date', header: 'Date', type: 'date' },
    { key: 'contactDisplayName', header: 'Profil', type: 'text', searchable: true },
    { key: 'contactEmail', header: 'Email', type: 'text', searchable: true },
    { key: 'contactKind', header: 'Type', type: 'contactKind' },
    { key: 'contactStatus', header: 'Statut', type: 'badge' },
    { key: 'paymentMethodLabel', header: 'Moyen de paiement', type: 'text', searchable: true },
    { key: 'amount', header: 'Montant (€)', type: 'number', align: 'right' }
  ];

  private readonly contactById = computed(() => {
    const map = new Map<string, IContact>();
    for (const contact of this.contactStore.contacts()) {
      map.set(contact.id, contact);
    }
    return map;
  });

  private readonly allDonationRows = computed<DonationTableRow[]>(() => {
    const contactMap = this.contactById();
    return this.donationStore
      .donations()
      .map((donation) => {
        const contact = contactMap.get(donation.contactId);
        const fallbackName = donation.contactDisplayName?.trim() || 'Profil inconnu';
        const contactName = contact ? contactDisplayName(contact) : fallbackName;
        const contactEmail = contact?.email ?? '—';
        const contactKind: ContactKind = contact?.kind ?? 'donor';
        const contactStatus = contact ? this.contactSettings.statusOf(contact) : 'inactive';
        return {
          id: donation.id,
          contactId: donation.contactId,
          contactDisplayName: contactName,
          contactEmail,
          contactKind,
          contactStatus,
          date: donation.date,
          paymentMethodLabel: this.paymentMethodLabel(donation.paymentMethod),
          amount: donation.amount
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  protected readonly filteredDonationRows = computed(() => {
    const rows = this.allDonationRows();
    const period = this.resolveDateWindow(this.periodPreset(), this.customFromDate(), this.customToDate());
    const contactKind = this.contactKindFilter();
    const contactStatus = this.contactStatusFilter();
    const minAmount = this.parseOptionalNumber(this.minAmountInput());
    const maxAmount = this.parseOptionalNumber(this.maxAmountInput());
    const term = this.searchTerm().trim().toLowerCase();

    return rows.filter((row) => {
      if (period.from && row.date < period.from) {
        return false;
      }
      if (period.to && row.date > period.to) {
        return false;
      }
      if (contactKind !== 'all' && row.contactKind !== contactKind) {
        return false;
      }
      if (contactStatus !== 'all' && row.contactStatus !== contactStatus) {
        return false;
      }
      if (minAmount !== null && row.amount < minAmount) {
        return false;
      }
      if (maxAmount !== null && row.amount > maxAmount) {
        return false;
      }
      if (term) {
        const haystack = `${row.contactDisplayName} ${row.contactEmail}`.toLowerCase();
        if (!haystack.includes(term)) {
          return false;
        }
      }
      return true;
    });
  });

  protected readonly totalDonationsCount = computed(() => this.filteredDonationRows().length);

  protected readonly totalAmount = computed(() =>
    this.filteredDonationRows().reduce((sum, row) => sum + row.amount, 0)
  );

  protected readonly uniquecontactsCount = computed(
    () => new Set(this.filteredDonationRows().map((row) => row.contactId)).size
  );

  protected readonly averageDonation = computed(() => {
    const count = this.totalDonationsCount();
    return count > 0 ? Math.round(this.totalAmount() / count) : 0;
  });

  protected readonly companyAmountShare = computed(() => {
    const total = this.totalAmount();
    if (total <= 0) {
      return 0;
    }
    const companyAmount = this.filteredDonationRows()
      .filter((row) => row.contactKind === 'company')
      .reduce((sum, row) => sum + row.amount, 0);
    return Math.round((companyAmount / total) * 100);
  });

  protected readonly canExportCsv = computed(() => this.filteredDonationRows().length > 0);

  protected onPeriodPresetChange(value: string): void {
    const v = value as PeriodPreset;
    this.periodPreset.set(v);
    if (v !== 'custom') {
      this.customFromDate.set('');
      this.customToDate.set('');
    }
  }

  protected clearFilters(): void {
    this.periodPreset.set('civilYear');
    this.customFromDate.set('');
    this.customToDate.set('');
    this.contactKindFilter.set('all');
    this.contactStatusFilter.set('all');
    this.minAmountInput.set('');
    this.maxAmountInput.set('');
    this.searchTerm.set('');
  }

  protected exportFilteredDonationsCsv(): void {
    const rows = this.filteredDonationRows();
    if (!rows.length) {
      return;
    }
    const headers = ['Date', 'Profil', 'Email', 'Type', 'Statut', 'Moyen de paiement', 'Montant (€)'];
    const lines = [headers.join(';')];
    for (const row of rows) {
      const line = [
        this.formatDateFr(row.date),
        row.contactDisplayName,
        row.contactEmail,
        row.contactKind === 'company' ? 'Entreprise' : 'Particulier',
        this.statusLabelFr(row.contactStatus),
        row.paymentMethodLabel,
        this.formatAmountFr(row.amount)
      ].map((cell) => this.escapeCsvCell(cell));
      lines.push(line.join(';'));
    }
    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `statistiques-dons-${this.fileDateStamp()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private parseOptionalNumber(raw: string): number | null {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  private formatDateFr(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR').format(date);
  }

  private formatAmountFr(value: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  private statusLabelFr(status: ContactStatus): string {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'to_remind':
        return 'À relancer';
      case 'new':
        return 'Nouveau';
      case 'inactive':
        return 'Inactif';
      case 'out':
        return 'Sorti';
      default:
        return status;
    }
  }

  private escapeCsvCell(value: string): string {
    const normalized = String(value ?? '');
    if (/[;"\r\n]/.test(normalized)) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  }

  private fileDateStamp(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private resolveDateWindow(
    preset: PeriodPreset,
    customFrom: string,
    customTo: string
  ): { from: Date | null; to: Date | null } {
    const now = new Date();
    if (preset === 'all') {
      return { from: null, to: null };
    }
    if (preset === 'custom') {
      const from = customFrom ? this.startOfDay(new Date(customFrom)) : null;
      const to = customTo ? this.endOfDay(new Date(customTo)) : null;
      return { from, to };
    }
    if (preset === 'thisMonth') {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: this.endOfDay(now)
      };
    }
    if (preset === 'last3Months') {
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        to: this.endOfDay(now)
      };
    }
    if (preset === 'last6Months') {
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        to: this.endOfDay(now)
      };
    }
    if (preset === 'last12Months') {
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 11, 1),
        to: this.endOfDay(now)
      };
    }
    if (preset === 'civilYear') {
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: this.endOfDay(now)
      };
    }
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: this.endOfDay(now)
    };
  }

  private startOfDay(d: Date): Date {
    const out = new Date(d);
    out.setHours(0, 0, 0, 0);
    return out;
  }

  private endOfDay(d: Date): Date {
    const out = new Date(d);
    out.setHours(23, 59, 59, 999);
    return out;
  }

  private paymentMethodLabel(paymentMethod: DonationPaymentMethod): string {
    switch (paymentMethod) {
      case 'bank_transfer':
        return 'Virement';
      case 'cash':
        return 'Espèces';
      case 'check':
        return 'Chèques';
      case 'other':
        return 'Autre';
      default: {
        const _exhaustive: never = paymentMethod;
        return _exhaustive;
      }
    }
  }
}

