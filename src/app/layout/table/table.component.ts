import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonLabelComponent } from '../button/button-label/button-label.component';
import { FormTextComponent } from '../forms/text/form-text.component';
import { ContactKindLabelPipe } from './contact-kind-label.pipe';
import { ContactStatusLabelPipe } from './contact-status-label.pipe';

export interface TableColumn {
  key: string;
  header: string;
  type?: 'text' | 'number' | 'date' | 'badge' | 'contactKind';
  searchable?: boolean;
  align?: 'left' | 'right' | 'center';
}

@Component({
  selector: 'table-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonLabelComponent,
    FormTextComponent,
    DatePipe,
    DecimalPipe,
    ContactStatusLabelPipe,
    ContactKindLabelPipe,
  ],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent implements OnChanges {
  @Input() rows: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() pageSizeOptions: number[] = [5, 10, 25, 50, 100];
  @Input() initialPageSize: number = 5;
  @Input() showSearch = true;
  @Input() searchWidth: string = '260px';
  @Input() clickableRows = false;
  @Input() showRowActions = false;
  @Input() rowActionEditLabel = '✏️';
  @Input() rowActionDonationsLabel = '💰';

  @Output() rowClick = new EventEmitter<unknown>();
  @Output() rowEdit = new EventEmitter<unknown>();
  @Output() rowViewDonations = new EventEmitter<unknown>();

  searchTerm = '';
  currentPage = 1;
  pageSize = 5;
  private pageSizeInitialized = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialPageSize'] || changes['pageSizeOptions']) {
      this.applyInitialPageSize();
    }
  }

  private get searchableColumns(): TableColumn[] {
    return this.columns.filter((c) => c.searchable);
  }

  getCellValue(row: any, col: TableColumn): any {
    return col.key
      .split('.')
      .reduce((acc: any, part: string) => (acc ? acc[part] : undefined), row);
  }

  get filteredRows(): any[] {
    if (!this.searchTerm || !this.searchableColumns.length) {
      return this.rows;
    }
    const term = this.searchTerm.toLowerCase();

    return this.rows.filter((row) =>
      this.searchableColumns.some((col) => {
        const value = this.getCellValue(row, col);
        if (value === undefined || value === null) {
          return false;
        }
        const text =
          col.type === 'contactKind'
            ? value === 'company'
              ? 'entreprise'
              : value === 'donor'
                ? 'donateur'
                : value === 'member'
                  ? 'membre'
                  : value === 'helper'
                    ? 'aidant'
                    : 'profil'
            : String(value);
        return text.toLowerCase().includes(term);
      }),
    );
  }

  get totalRows(): number {
    return this.filteredRows.length;
  }

  get pageCount(): number {
    return this.totalRows === 0 ? 1 : Math.ceil(this.totalRows / this.pageSize);
  }

  get pagedRows(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get startIndexLabel(): number {
    if (this.totalRows === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndexLabel(): number {
    if (this.totalRows === 0) {
      return 0;
    }
    return Math.min(this.currentPage * this.pageSize, this.totalRows);
  }

  get pages(): number[] {
    return Array.from({ length: this.pageCount }, (_, index) => index + 1);
  }

  onSearchChange(value: string): void {
    this.searchTerm = value ?? '';
    this.currentPage = 1;
  }

  onPageSizeChange(value: string): void {
    const next = Number(value);
    if (!this.pageSizeOptions.includes(next)) {
      return;
    }
    this.pageSize = next;
    this.currentPage = 1;
    this.pageSizeInitialized = true;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pageCount) {
      return;
    }
    this.currentPage = page;
  }

  goToPrevious(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  goToNext(): void {
    if (this.currentPage < this.pageCount) {
      this.currentPage += 1;
    }
  }

  onDataRowClick(row: unknown): void {
    if (!this.clickableRows) {
      return;
    }
    this.rowClick.emit(row);
  }

  onEditClick(row: unknown, event: Event): void {
    event.stopPropagation();
    this.rowEdit.emit(row);
  }

  onViewDonationsClick(row: unknown, event: Event): void {
    event.stopPropagation();
    this.rowViewDonations.emit(row);
  }

  get columnCount(): number {
    return this.columns.length + (this.showRowActions ? 1 : 0);
  }

  private applyInitialPageSize(): void {
    if (this.pageSizeInitialized) {
      return;
    }
    const hasOptions = Array.isArray(this.pageSizeOptions) && this.pageSizeOptions.length > 0;
    const requested = Number(this.initialPageSize);
    if (hasOptions && this.pageSizeOptions.includes(requested)) {
      this.pageSize = requested;
      return;
    }
    this.pageSize = hasOptions ? this.pageSizeOptions[0] : 5;
  }
}
