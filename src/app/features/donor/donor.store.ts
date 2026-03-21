import { Injectable, signal } from '@angular/core';
import { DonorKind, IDonor, IDonorAddress, IDonorEnterprise } from '../../core/models/donor.model';
import { DASHBOARD_LATEST_DONORS } from '../dashboard/mock-data';

export interface NewDonorInputIndividual {
  kind: 'individual';
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  address: IDonorAddress;
}

export interface NewDonorInputCompany {
  kind: 'company';
  email: string;
  phone?: string;
  enterprise: IDonorEnterprise;
}

export type NewDonorInput = NewDonorInputIndividual | NewDonorInputCompany;

@Injectable({ providedIn: 'root' })
export class DonorStoreService {
  private readonly donorsSignal = signal<IDonor[]>(DASHBOARD_LATEST_DONORS);

  donors(): IDonor[] {
    return this.donorsSignal();
  }

  createDonor(input: NewDonorInput): IDonor {
    const donor = this.buildDonor(input);
    this.donorsSignal.set([donor, ...this.donorsSignal()]);
    return donor;
  }

  private buildDonor(input: NewDonorInput): IDonor {
    const base = {
      id: this.newId(),
      creationDate: new Date(),
      statut: 'new' as const,
      totalDonation: 0,
      lastDonation: undefined,
      donationCount: 0
    };

    if (input.kind === 'individual') {
      return {
        ...base,
        kind: 'individual' satisfies DonorKind,
        firstname: input.firstname.trim(),
        lastname: input.lastname.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || undefined,
        address: this.normalizeAddress(input.address),
        enterprise: undefined
      };
    }

    const e = input.enterprise;
    const enterprise: IDonorEnterprise = {
      name: e.name.trim(),
      siret: e.siret.trim(),
      address: this.normalizeAddress(e.address),
      contactFirstname: e.contactFirstname?.trim() || undefined,
      contactLastname: e.contactLastname?.trim() || undefined
    };

    const contactFirst = enterprise.contactFirstname ?? '';
    const contactLast = enterprise.contactLastname ?? '';

    return {
      ...base,
      kind: 'company' satisfies DonorKind,
      firstname: contactFirst,
      lastname: enterprise.name,
      email: input.email.trim(),
      phone: input.phone?.trim() || undefined,
      address: undefined,
      enterprise
    };
  }

  private normalizeAddress(a: IDonorAddress): IDonorAddress {
    return {
      street: a.street.trim(),
      postalCode: a.postalCode.trim(),
      city: a.city.trim(),
      country: a.country.trim(),
      phone: a.phone?.trim() || undefined,
      email: a.email?.trim() || undefined,
      contactName: a.contactName?.trim() || undefined,
      contactPhone: a.contactPhone?.trim() || undefined
    };
  }

  private newId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
