import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../button/button.component';
import { FormTextComponent } from '../forms/text/form-text.component';
import { DonorStatusLabelPipe } from './donor-status-label.pipe';
import { Donor } from '../../core/models/donor.model';

@Component({
  selector: 'table-component',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, FormTextComponent, DatePipe, DonorStatusLabelPipe],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableComponent {
  @Input() rows: Donor[] = [];
  @Input() pageSizeOptions: number[] = [25, 50, 100];
  @Input() initialPageSize = 25;

  searchTerm = '';
  currentPage = 1;
  pageSize = this.initialPageSize;

  get filteredRows(): Donor[] {
    if (!this.searchTerm) {
      return this.rows;
    }
    const term = this.searchTerm.toLowerCase();
    return this.rows.filter((row) => {
      return (
        row.firstname.toLowerCase().includes(term) ||
        row.lastname.toLowerCase().includes(term) ||
        row.email.toLowerCase().includes(term)
      );
    });
  }

  get totalRows(): number {
    return this.filteredRows.length;
  }

  get pageCount(): number {
    return this.totalRows === 0 ? 1 : Math.ceil(this.totalRows / this.pageSize);
  }

  get pagedRows(): Donor[] {
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
}