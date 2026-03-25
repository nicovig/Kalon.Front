import { Injectable, inject, signal } from '@angular/core';
import { DonationPaymentMethod, IDonation } from '../../core/models/donation.model';
import { contactDisplayName, IContact } from '../../core/models/contact.model';
import { ContactStoreService } from '../contact/contact.store';

@Injectable({ providedIn: 'root' })
export class DonationStoreService {
  private readonly contactStore = inject(ContactStoreService);
  private readonly donationsSignal = signal<IDonation[]>([]);

  readonly donationsRead = this.donationsSignal.asReadonly();

  donations(): IDonation[] {
    return this.donationsSignal();
  }

  addDonationForContact(
    contact: IContact,
    amount: number,
    date: Date,
    paymentMethod: DonationPaymentMethod
  ): IDonation {
    const display = contactDisplayName(contact);
    const donation: IDonation = {
      id: this.newId(),
      contactId: contact.id,
      amount,
      date,
      contactDisplayName: display,
      paymentMethod
    };
    this.donationsSignal.set([donation, ...this.donationsSignal()]);
    this.contactStore.recordDonation(contact.id, amount, date);
    return donation;
  }

  private newId(): string {
    return `don-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
