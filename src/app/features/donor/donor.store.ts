import { Injectable, signal } from '@angular/core';
import { IDonor, IDonorAddress } from '../../core/models/donor.model';
import { DASHBOARD_LATEST_DONORS } from '../dashboard/mock-data';

export interface NewDonorInput {
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  address: IDonorAddress;
  enterprise?: {
    name: string;
    siret: string;
    address: IDonorAddress;
  };
}

@Injectable({ providedIn: 'root' })
export class DonorStoreService {
  private readonly donorsSignal = signal<IDonor[]>(DASHBOARD_LATEST_DONORS);

  donors(): IDonor[] {
    return this.donorsSignal();
  }

  createDonor(input: NewDonorInput): IDonor {
    const donor: IDonor = {
      id: this.newId(),
      firstname: input.firstname.trim(),
      lastname: input.lastname.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() || undefined,
      address: {
        street: input.address.street.trim(),
        postalCode: input.address.postalCode.trim(),
        city: input.address.city.trim(),
        country: input.address.country.trim()
      },
      creationDate: new Date(),
      statut: 'new',
      totalDonation: 0,
      lastDonation: undefined,
      donationCount: 0,
      enterprise: input.enterprise
        ? {
            name: input.enterprise.name.trim(),
            siret: input.enterprise.siret.trim(),
            address: {
              street: input.enterprise.address.street.trim(),
              postalCode: input.enterprise.address.postalCode.trim(),
              city: input.enterprise.address.city.trim(),
              country: input.enterprise.address.country.trim()
            }
          }
        : undefined
    };

    this.donorsSignal.set([donor, ...this.donorsSignal()]);
    return donor;
  }

  private newId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

