import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonCheckboxComponent } from '../../../layout/button/checkbox/button-checkbox.component';
import { ButtonLabelComponent } from '../../../layout/button/button-label/button-label.component';
import { ButtonRadioComponent } from '../../../layout/button/radio/button-radio.component';
import { FormTextComponent } from '../../../layout/forms/text/form-text.component';
import { FormSelectComponent, FormSelectOption } from '../../../layout/forms/select/form-select.component';
import { FormSliderComponent } from '../../../layout/forms/slider/form-slider.component';
import { FormNumberComponent } from '../../../layout/forms/number/form-number.component';

export type MailSelectorItem = {
  id: string;
  title: string;
  subtitle?: string;
  avatarText?: string;
  avatarClass?: string;
  badgeText?: string;
  badgeClass?: string;
  infoText?: string;
  detailText?: string;
  warningText?: string;
};

export type MailAvailabilityMode =
  | 'with_postal_address'
  | 'without_postal_address'
  | 'without_email'
  | 'with_email'
  | 'without_postal_address_and_email';

@Component({
  selector: 'mail-contact-selector',
  standalone: true,
  templateUrl: './mail-contact-selector.component.html',
  styleUrls: ['./mail-contact-selector.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonLabelComponent,
    ButtonCheckboxComponent,
    ButtonRadioComponent,
    FormTextComponent,
    FormSelectComponent,
    FormSliderComponent,
    FormNumberComponent
  ]
})
export class MailContactSelectorComponent implements OnChanges {
  @Input() items: MailSelectorItem[] = [];
  @Input() filteredCount = 0;
  @Input() totalCount = 0;
  @Input() selectedCount = 0;

  @Input() selectedIds: Set<string> = new Set();
  @Input() searchQuery = '';
  @Input() title = 'Sélectionner les destinataires';
  @Input() searchPlaceholder = 'Rechercher un élément…';
  @Input() emptyMessage = 'Aucun élément pour le moment.';
  @Input() selectedLabel = 'éléments';
  @Input() alertMessage: string | null = null;

  @Input() statusFilter = 'all';
  @Input() statusOptions: FormSelectOption[] = [];
  @Input() kindFilter = 'all';
  @Input() kindOptions: FormSelectOption[] = [];
  @Input() departmentFilter = 'all';
  @Input() departmentOptions: FormSelectOption[] = [];
  @Input() availabilityMode: MailAvailabilityMode = 'with_email';
  @Input() showAvailabilityHelp = false;
  @Input() monthsSinceLastDonationMin = 0;
  @Input() totalDonationMin = '';
  @Input() totalDonationMax = '';
  @Input() donationCountMin = '';

  @Input() pageIndex = 0;
  @Input() totalPages = 1;

  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() statusFilterChange = new EventEmitter<string>();
  @Output() kindFilterChange = new EventEmitter<string>();
  @Output() departmentFilterChange = new EventEmitter<string>();
  @Output() availabilityModeChange = new EventEmitter<MailAvailabilityMode>();
  @Output() monthsSinceLastDonationMinChange = new EventEmitter<number>();
  @Output() totalDonationMinChange = new EventEmitter<string>();
  @Output() totalDonationMaxChange = new EventEmitter<string>();
  @Output() donationCountMinChange = new EventEmitter<string>();
  @Output() toggleItem = new EventEmitter<string>();
  @Output() selectAllFiltered = new EventEmitter<void>();
  @Output() deselectAll = new EventEmitter<void>();
  @Output() prevPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  protected readonly availabilityModeControl = new FormControl<string>('with_email', { nonNullable: true });

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['availabilityMode']) return;
    if (this.availabilityModeControl.value === this.availabilityMode) return;
    this.availabilityModeControl.setValue(this.availabilityMode, { emitEvent: false });
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

  onMonthsSinceLastDonationMinInput(value: string): void {
    const n = Number(value);
    this.monthsSinceLastDonationMinChange.emit(Number.isFinite(n) ? Math.max(0, Math.min(60, n)) : 0);
  }

  onSelectAvailabilityMode(mode: MailAvailabilityMode): void {
    this.availabilityModeControl.setValue(mode, { emitEvent: false });
    this.availabilityModeChange.emit(mode);
  }
}

