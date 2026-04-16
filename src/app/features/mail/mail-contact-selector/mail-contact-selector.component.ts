import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonCheckboxComponent } from '../../../layout/button/checkbox/button-checkbox.component';
import { ButtonLabelComponent } from '../../../layout/button/button-label/button-label.component';
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

@Component({
  selector: 'mail-contact-selector',
  standalone: true,
  templateUrl: './mail-contact-selector.component.html',
  styleUrls: ['./mail-contact-selector.component.css'],
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
export class MailContactSelectorComponent {
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
  @Input() includeWithChannel = true;
  @Input() includeWithoutChannel = true;
  @Input() availabilityWithLabel = 'Avec email';
  @Input() availabilityWithoutLabel = 'Sans email';
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
  @Output() includeWithChannelChange = new EventEmitter<boolean>();
  @Output() includeWithoutChannelChange = new EventEmitter<boolean>();
  @Output() monthsSinceLastDonationMinChange = new EventEmitter<number>();
  @Output() totalDonationMinChange = new EventEmitter<string>();
  @Output() totalDonationMaxChange = new EventEmitter<string>();
  @Output() donationCountMinChange = new EventEmitter<string>();
  @Output() toggleItem = new EventEmitter<string>();
  @Output() selectAllFiltered = new EventEmitter<void>();
  @Output() deselectAll = new EventEmitter<void>();
  @Output() prevPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();

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

  onIncludeWithChannelToggle(): void {
    this.includeWithChannelChange.emit(!this.includeWithChannel);
  }

  onIncludeWithoutChannelToggle(): void {
    this.includeWithoutChannelChange.emit(!this.includeWithoutChannel);
  }
}

