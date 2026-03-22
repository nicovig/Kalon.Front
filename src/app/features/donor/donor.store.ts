import { Injectable, signal } from '@angular/core';
import { DonorKind, IDonor, IDonorAddress, IDonorEnterprise } from '../../core/models/donor.model';

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
  private readonly donorsSignal = signal<IDonor[]>([]);

  donors(): IDonor[] {
    return this.donorsSignal();
  }

  findDonorByEmail(email: string): IDonor | undefined {
    const e = email.trim().toLowerCase();
    if (!e) {
      return undefined;
    }
    return this.donorsSignal().find((d) => d.email.toLowerCase() === e);
  }

  createDonor(input: NewDonorInput): IDonor {
    const donor = this.toDonorFromInput(input, {
      id: this.newId(),
      creationDate: new Date(),
      statut: 'new',
      totalDonation: 0,
      lastDonation: undefined,
      donationCount: 0
    });
    this.donorsSignal.set([donor, ...this.donorsSignal()]);
    return donor;
  }

  updateDonor(id: string, input: NewDonorInput): IDonor | null {
    const existing = this.donorsSignal().find((d) => d.id === id);
    if (!existing) {
      return null;
    }
    const updated = this.toDonorFromInput(input, {
      id: existing.id,
      creationDate: existing.creationDate,
      statut: existing.statut,
      totalDonation: existing.totalDonation,
      lastDonation: existing.lastDonation,
      donationCount: existing.donationCount
    });
    this.donorsSignal.update((list) => list.map((d) => (d.id === id ? updated : d)));
    return updated;
  }

  recordDonation(donorId: string, amount: number, date: Date): void {
    this.donorsSignal.update((list) =>
      list.map((d) => {
        if (d.id !== donorId) {
          return d;
        }
        const lastDonation =
          !d.lastDonation || date > d.lastDonation ? date : d.lastDonation;
        return {
          ...d,
          totalDonation: d.totalDonation + amount,
          donationCount: d.donationCount + 1,
          lastDonation
        };
      })
    );
  }

  private toDonorFromInput(
    input: NewDonorInput,
    meta: {
      id: string;
      creationDate: Date;
      statut: IDonor['statut'];
      totalDonation: number;
      lastDonation?: Date;
      donationCount: number;
    }
  ): IDonor {
    if (input.kind === 'individual') {
      return {
        ...meta,
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
      fiscalStatus: e.fiscalStatus,
      contactFirstname: e.contactFirstname?.trim() || undefined,
      contactLastname: e.contactLastname?.trim() || undefined,
      contactEmail: e.contactEmail?.trim() || undefined,
      contactPhone: e.contactPhone?.trim() || undefined
    };

    const contactFirst = enterprise.contactFirstname ?? '';

    return {
      ...meta,
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
