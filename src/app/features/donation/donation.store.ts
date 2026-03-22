import { Injectable, inject, signal } from '@angular/core';
import { IDonation } from '../../core/models/donation.model';
import { donorDisplayName, IDonor } from '../../core/models/donor.model';
import { DonorStoreService } from '../donor/donor.store';

@Injectable({ providedIn: 'root' })
export class DonationStoreService {
  private readonly donorStore = inject(DonorStoreService);
  private readonly donationsSignal = signal<IDonation[]>([]);

  readonly donationsRead = this.donationsSignal.asReadonly();

  donations(): IDonation[] {
    return this.donationsSignal();
  }

  addDonationForDonor(donor: IDonor, amount: number, date: Date): IDonation {
    const display = donorDisplayName(donor);
    const donation: IDonation = {
      id: this.newId(),
      donorId: donor.id,
      amount,
      date,
      donorDisplayName: display
    };
    this.donationsSignal.set([donation, ...this.donationsSignal()]);
    this.donorStore.recordDonation(donor.id, amount, date);
    return donation;
  }

  private newId(): string {
    return `don-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
