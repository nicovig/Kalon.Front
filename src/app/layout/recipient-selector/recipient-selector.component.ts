import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonCheckboxComponent } from '../button/checkbox/button-checkbox.component';
import { ButtonLabelComponent } from '../button/button-label/button-label.component';
import { FormTextComponent } from '../forms/text/form-text.component';
import { FormSelectComponent, FormSelectOption } from '../forms/select/form-select.component';
import { FormSliderComponent } from '../forms/slider/form-slider.component';
import { FormNumberComponent } from '../forms/number/form-number.component';

export type QuickFilter = 'all' | 'to_remind' | 'new' | 'active' | 'inactive';
export type RecipientSelectorItem = {
  id: string;
  title: string;
  subtitle?: string;
  avatarText?: string;
  avatarClass?: string;
  badgeText?: string;
  badgeClass?: string;
};

export type AdvancedFilters = {
  monthsMin: number;
  totalDonationMin: number | null;
  totalDonationMax: number | null;
  donationCountMin: number | null;
  departmentCodes: string[] | null;
  horsFrance: boolean;
};

@Component({
  selector: 'recipient-selector',
  standalone: true,
  templateUrl: './recipient-selector.component.html',
  styleUrls: ['./recipient-selector.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonLabelComponent,
    ButtonCheckboxComponent,
    FormTextComponent,
    FormSelectComponent,
    FormSliderComponent,
    FormNumberComponent
  ]
})
export class RecipientSelectorComponent implements OnChanges {
  @Input() pagedItems: RecipientSelectorItem[] = [];
  @Input() filteredcontactsLength = 0;
  @Input() contactsCount = 0;
  @Input() selectedCount = 0;

  @Input() selectedcontactIds: Set<string> = new Set();
  @Input() quickFilter: QuickFilter = 'all';
  @Input() searchQuery = '';
  @Input() title = 'Sélectionner les destinataires';
  @Input() searchPlaceholder = 'Rechercher un élément…';
  @Input() emptyMessage = 'Aucun élément pour le moment.';
  @Input() selectedLabel = 'éléments';

  @Input() pageIndex = 0;
  @Input() totalPages = 1;

  @Input() appliedMonthsMin = 0;
  @Input() appliedTotalDonationMin: number | null = null;
  @Input() appliedTotalDonationMax: number | null = null;
  @Input() appliedDonationCountMin: number | null = null;
  @Input() appliedDepartmentCodes: string[] | null = null;
  @Input() appliedHorsFrance = false;

  @Output() quickFilterChange = new EventEmitter<QuickFilter>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() toggleContact = new EventEmitter<string>();

  @Output() selectAllFiltered = new EventEmitter<void>();
  @Output() deselectAll = new EventEmitter<void>();

  @Output() prevPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();

  @Output() applyAdvancedFilters = new EventEmitter<AdvancedFilters>();

  advancedOpen = false;

  monthsVal = 12;
  totalMinInput = '';
  totalMaxInput = '';
  donationCountSel: 'any' | '1' | '2' | '5' = 'any';
  campaignSel = 'all';
  horsFranceSel = false;

  readonly donationCountOptions: FormSelectOption[] = [
    { value: 'any', label: 'Peu importe' },
    { value: '1', label: 'Au moins 1 don' },
    { value: '2', label: 'Au moins 2 dons' },
    { value: '5', label: 'Au moins 5 dons (fidèles)' }
  ];

  readonly campaignOptions: FormSelectOption[] = [
    { value: 'all', label: 'Toutes les campagnes' },
    { value: 'summer-2024', label: 'Campagne été 2024' },
    { value: 'fundraising-2023', label: 'Appel de fonds 2023' },
    { value: 'christmas-2023', label: 'Collecte de Noël 2023' }
  ];

  protected readonly metropoleDepartmentCodes: string[] = [
    ...Array.from({ length: 95 }, (_, i) => {
      const n = i + 1;
      if (n === 20) return null;
      return String(n).padStart(2, '0');
    }).filter((x): x is string => Boolean(x)),
    '2A',
    '2B'
  ];

  protected readonly domDepartmentCodes: string[] = ['971', '972', '973', '974', '976'];

  protected readonly tomDepartmentCodes: string[] = ['975', '977', '978', '984', '986', '987', '988'];

  protected readonly metropoleSelected = new Set<string>();
  protected readonly domSelected = new Set<string>();
  protected readonly tomSelected = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appliedMonthsMin']) {
      this.monthsVal = this.appliedMonthsMin >= 0 ? this.appliedMonthsMin : 12;
    }
    if (changes['appliedTotalDonationMin']) {
      this.totalMinInput = this.appliedTotalDonationMin == null ? '' : String(this.appliedTotalDonationMin);
    }
    if (changes['appliedTotalDonationMax']) {
      this.totalMaxInput = this.appliedTotalDonationMax == null ? '' : String(this.appliedTotalDonationMax);
    }
    if (changes['appliedDonationCountMin']) {
      if (this.appliedDonationCountMin == null) this.donationCountSel = 'any';
      else this.donationCountSel = this.appliedDonationCountMin >= 5 ? '5' : this.appliedDonationCountMin === 2 ? '2' : '1';
    }
    if (changes['appliedDepartmentCodes']) {
      this.metropoleSelected.clear();
      this.domSelected.clear();
      this.tomSelected.clear();
      const codes = this.appliedDepartmentCodes;
      if (!codes?.length) return;
      for (const code of codes) {
        if (this.isMetropoleCode(code)) this.metropoleSelected.add(code);
        else if (this.domDepartmentCodes.includes(code)) this.domSelected.add(code);
        else this.tomSelected.add(code);
      }
    }
    if (changes['appliedHorsFrance']) {
      this.horsFranceSel = this.appliedHorsFrance;
    }
  }

  setQuickFilter(v: QuickFilter): void {
    this.quickFilterChange.emit(v);
  }

  onSearchInput(value: string): void {
    this.searchQueryChange.emit(value);
  }

  onSelectAllFilteredClick(): void {
    this.selectAllFiltered.emit();
  }

  onDeselectAllClick(): void {
    this.deselectAll.emit();
  }

  onPrevPageClick(): void {
    this.prevPage.emit();
  }

  onNextPageClick(): void {
    this.nextPage.emit();
  }

  toggleAdvanced(): void {
    this.advancedOpen = !this.advancedOpen;
  }

  resetAllFilters(): void {
    this.quickFilterChange.emit('all');
    this.searchQueryChange.emit('');

    this.monthsVal = 0;
    this.totalMinInput = '';
    this.totalMaxInput = '';
    this.donationCountSel = 'any';
    this.campaignSel = 'all';

    this.metropoleSelected.clear();
    this.domSelected.clear();
    this.tomSelected.clear();
    this.horsFranceSel = false;

    this.applyAdvancedFilters.emit({
      monthsMin: 0,
      totalDonationMin: null,
      totalDonationMax: null,
      donationCountMin: null,
      departmentCodes: null,
      horsFrance: false
    });
  }

  toggleDepartmentCode(code: string): void {
    if (this.isMetropoleCode(code)) {
      this.toggleSet(this.metropoleSelected, code);
      return;
    }
    if (this.domDepartmentCodes.includes(code)) {
      this.toggleSet(this.domSelected, code);
      return;
    }
    this.toggleSet(this.tomSelected, code);
  }

  private isMetropoleCode(code: string): boolean {
    if (code === '2A' || code === '2B') return true;
    if (!/^\d{2}$/.test(code)) return false;
    const n = Number(code);
    if (!Number.isFinite(n)) return false;
    if (n < 1 || n > 95) return false;
    if (n === 20) return false;
    return true;
  }

  private toggleSet(set: Set<string>, code: string): void {
    if (set.has(code)) set.delete(code);
    else set.add(code);
  }

  onMonthsNumberInput(raw: string): void {
    const n = Number(raw);
    this.monthsVal = Number.isFinite(n) && n > 0 ? Math.max(1, Math.min(60, n)) : 12;
  }

  onMonthsSliderInput(value: string): void {
    const n = Number(value);
    this.monthsVal = Number.isFinite(n) ? Math.max(1, Math.min(60, n)) : 12;
  }

  applyFilters(): void {
    const totalMin = this.totalMinInput ? Number(this.totalMinInput) : NaN;
    const totalMax = this.totalMaxInput ? Number(this.totalMaxInput) : NaN;

    const selectedDepartmentCodes = [
      ...this.metropoleDepartmentCodes.filter((c) => this.metropoleSelected.has(c)),
      ...this.domDepartmentCodes.filter((c) => this.domSelected.has(c)),
      ...this.tomDepartmentCodes.filter((c) => this.tomSelected.has(c))
    ];

    const departmentCodes = selectedDepartmentCodes.length ? selectedDepartmentCodes : null;

    this.applyAdvancedFilters.emit({
      monthsMin: this.monthsVal,
      totalDonationMin: Number.isFinite(totalMin) ? totalMin : null,
      totalDonationMax: Number.isFinite(totalMax) ? totalMax : null,
      donationCountMin:
        this.donationCountSel === 'any'
          ? null
          : this.donationCountSel === '5'
            ? 5
            : this.donationCountSel === '2'
              ? 2
              : 1,
      departmentCodes,
      horsFrance: this.horsFranceSel
    });
  }
}

