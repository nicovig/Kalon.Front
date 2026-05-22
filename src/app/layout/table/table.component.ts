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
  sortable?: boolean;
}

export interface TableRowAction {
  id: string;
  label: string;
  type?: 'ghost' | 'primary' | 'page' | 'mail';
  visible?: (row: unknown) => boolean;
  disabled?: (row: unknown) => boolean;
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
  @Input() selectedRowId: string | null = null;
  @Input() selectedRowKey = 'id';
  @Input() rowActions: TableRowAction[] = [];
  @Input() sortable = true;
  @Input() isHorizontalScrollable = true;

  @Output() rowClick = new EventEmitter<unknown>();
  @Output() rowAction = new EventEmitter<{ actionId: string; row: unknown }>();

  searchTerm = '';
  currentPage = 1;
  pageSize = 5;
  sortKey: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';
  private pageSizeInitialized = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows'] && !changes['rows'].firstChange) {
      this.currentPage = 1;
    }
    if (changes['initialPageSize'] || changes['pageSizeOptions']) {
      this.applyInitialPageSize();
    }
    if (changes['columns'] && this.sortKey && !this.columns.some((c) => c.key === this.sortKey)) {
      this.sortKey = null;
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
    return this.sortedRows.length;
  }

  get pageCount(): number {
    return this.totalRows === 0 ? 1 : Math.ceil(this.totalRows / this.pageSize);
  }

  get pagedRows(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sortedRows.slice(start, start + this.pageSize);
  }

  get sortedRows(): any[] {
    const key = this.sortKey;
    if (!key) return this.filteredRows;
    const column = this.columns.find((c) => c.key === key);
    if (!column) return this.filteredRows;
    const direction = this.sortDirection === 'asc' ? 1 : -1;
    return [...this.filteredRows].sort((a, b) => {
      const av = this.getCellValue(a, column);
      const bv = this.getCellValue(b, column);
      return this.compareCellValues(av, bv, column.type) * direction;
    });
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

  isColumnSortable(col: TableColumn): boolean {
    if (!this.sortable) return false;
    return col.sortable !== false;
  }

  onColumnHeaderClick(col: TableColumn): void {
    if (!this.isColumnSortable(col)) return;
    if (this.sortKey === col.key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = col.key;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
  }

  sortIconFor(col: TableColumn): string {
    if (!this.isColumnSortable(col)) return '';
    if (this.sortKey !== col.key) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
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

  onRowActionClick(action: TableRowAction, row: unknown, event: Event): void {
    event.stopPropagation();
    if (!action?.id) return;
    this.rowAction.emit({ actionId: action.id, row });
  }

  getVisibleRowActions(row: unknown): TableRowAction[] {
    return this.rowActions.filter((action) => {
      if (!action.visible) return true;
      try {
        return action.visible(row);
      } catch {
        return false;
      }
    });
  }

  isRowActionDisabled(action: TableRowAction, row: unknown): boolean {
    if (!action.disabled) return false;
    try {
      return action.disabled(row);
    } catch {
      return false;
    }
  }

  isSelectedRow(row: unknown): boolean {
    if (!this.selectedRowId || !row || typeof row !== 'object') {
      return false;
    }
    const value = (row as Record<string, unknown>)[this.selectedRowKey];
    return String(value ?? '') === this.selectedRowId;
  }

  get columnCount(): number {
    return this.columns.length + (this.rowActions.length > 0 ? 1 : 0);
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

  private compareCellValues(a: unknown, b: unknown, type: TableColumn['type']): number {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (type === 'number') {
      const an = Number(a);
      const bn = Number(b);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    }
    if (type === 'date') {
      const at = new Date(String(a)).getTime();
      const bt = new Date(String(b)).getTime();
      if (Number.isFinite(at) && Number.isFinite(bt)) return at - bt;
    }
    const as = String(a).toLocaleLowerCase('fr');
    const bs = String(b).toLocaleLowerCase('fr');
    return as.localeCompare(bs, 'fr', { numeric: true, sensitivity: 'base' });
  }
}
