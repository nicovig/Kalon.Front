import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckboxComponent } from '../../button/checkbox/checkbox.component';
import { ButtonLabelComponent } from '../../button/button-label/button-label.component';

export type ReminderQuickFilter = 'all' | 'to_remind' | 'new' | 'active' | 'inactive';
export type RecipientSelectorItem = {
  id: string;
  title: string;
  subtitle?: string;
  avatarText?: string;
  avatarClass?: string;
  badgeText?: string;
  badgeClass?: string;
};

export type ReminderAdvancedFilters = {
  monthsMin: number;
  totalDonationMin: number | null;
  totalDonationMax: number | null;
  donationCountMin: number | null;
};

@Component({
  selector: 'reminder-recipient-selector',
  standalone: true,
  templateUrl: './reminder-recipient-selector.component.html',
  styleUrls: ['./reminder-recipient-selector.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonLabelComponent, CheckboxComponent]
})
export class ReminderRecipientSelectorComponent implements OnChanges, AfterViewInit {
  @Input() pagedItems: RecipientSelectorItem[] = [];
  @Input() filteredDonorsLength = 0;
  @Input() donorsCount = 0;
  @Input() selectedCount = 0;

  @Input() selectedDonorIds: Set<string> = new Set();
  @Input() quickFilter: ReminderQuickFilter = 'all';
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

  @Output() quickFilterChange = new EventEmitter<ReminderQuickFilter>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() toggleDonor = new EventEmitter<string>();

  @Output() selectAllFiltered = new EventEmitter<void>();
  @Output() deselectAll = new EventEmitter<void>();

  @Output() prevPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();

  @Output() applyAdvancedFilters = new EventEmitter<ReminderAdvancedFilters>();

  advancedOpen = false;

  monthsVal = 12;
  totalMinInput = '';
  totalMaxInput = '';
  donationCountSel: 'any' | '1' | '2' | '5' = 'any';

  @ViewChild('monthsSlider', { read: ElementRef }) monthsSlider?: ElementRef<HTMLInputElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appliedMonthsMin']) {
      this.monthsVal = this.appliedMonthsMin > 0 ? this.appliedMonthsMin : 12;
      queueMicrotask(() => this.syncSliderBackground());
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
  }

  ngAfterViewInit(): void {
    this.syncSliderBackground();
  }

  setQuickFilter(v: ReminderQuickFilter): void {
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

  onMonthsNumberInput(raw: string): void {
    const n = Number(raw);
    this.monthsVal = Number.isFinite(n) && n > 0 ? Math.max(1, Math.min(60, n)) : 12;
    this.syncSliderBackground();
  }

  onMonthsSliderInput(value: string): void {
    const n = Number(value);
    this.monthsVal = Number.isFinite(n) ? Math.max(1, Math.min(60, n)) : 12;
    this.syncSliderBackground();
  }

  private syncSliderBackground(): void {
    const slider = this.monthsSlider?.nativeElement;
    if (!slider) return;
    const num = this.monthsVal;
    const pct = ((num - 1) / 59) * 100;
    slider.style.background = `linear-gradient(to right, var(--violet) 0%, var(--violet) ${pct}%, var(--ink-30) ${pct}%)`;
  }

  applyFilters(): void {
    const totalMin = this.totalMinInput ? Number(this.totalMinInput) : NaN;
    const totalMax = this.totalMaxInput ? Number(this.totalMaxInput) : NaN;

    this.applyAdvancedFilters.emit({
      monthsMin: this.monthsVal,
      totalDonationMin: Number.isFinite(totalMin) ? totalMin : null,
      totalDonationMax: Number.isFinite(totalMax) ? totalMax : null,
      donationCountMin:
        this.donationCountSel === 'any' ? null : this.donationCountSel === '5' ? 5 : this.donationCountSel === '2' ? 2 : 1
    });
  }
}

