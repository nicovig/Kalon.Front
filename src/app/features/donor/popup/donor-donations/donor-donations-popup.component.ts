import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IDonor, donorDisplayName } from '../../../../core/models/donor.model';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { TableComponent, TableColumn } from '../../../../layout/table/table.component';
import { DonationStoreService } from '../../../donation/donation.store';

@Component({
  selector: 'donor-donations-popup',
  standalone: true,
  imports: [CommonModule, PopupShellComponent, TableComponent],
  templateUrl: './donor-donations-popup.component.html',
  styleUrls: ['./donor-donations-popup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonorDonationsPopupComponent {
  private readonly donationStore = inject(DonationStoreService);

  readonly donor = input.required<IDonor>();

  @Output() closed = new EventEmitter<void>();

  protected readonly donorTitle = computed(() => donorDisplayName(this.donor()));

  protected readonly donationRows = computed(() => {
    this.donationStore.donationsRead();
    const id = this.donor().id;
    return this.donationStore
      .donations()
      .filter((d) => d.donorId === id)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  protected readonly donationColumns: TableColumn[] = [
    { key: 'date', header: 'Date', type: 'date', searchable: false },
    { key: 'amount', header: 'Montant (€)', type: 'number', align: 'right', searchable: false }
  ];

  protected onDismiss(): void {
    this.closed.emit();
  }
}
