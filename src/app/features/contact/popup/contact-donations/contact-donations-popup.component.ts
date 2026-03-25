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
import { contactDisplayName, IContact } from '../../../../core/models/contact.model';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { TableComponent, TableColumn } from '../../../../layout/table/table.component';
import { DonationStoreService } from '../../../donation/donation.store';

@Component({
  selector: 'contact-donations-popup',
  standalone: true,
  imports: [CommonModule, PopupShellComponent, TableComponent],
  templateUrl: './contact-donations-popup.component.html',
  styleUrls: ['./contact-donations-popup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactDonationsPopupComponent {
  private readonly donationStore = inject(DonationStoreService);

  readonly contact = input.required<IContact>();

  @Output() closed = new EventEmitter<void>();

  protected readonly contactTitle = computed(() => contactDisplayName(this.contact()));

  protected readonly donationRows = computed(() => {
    this.donationStore.donationsRead();
    const id = this.contact().id;
    return this.donationStore
      .donations()
      .filter((d) => d.contactId === id)
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
