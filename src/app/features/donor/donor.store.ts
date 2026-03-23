import { inject, Injectable, signal } from '@angular/core';
import { DonorKind, IDonor, IDonorAddress, IDonorEnterprise } from '../../core/models/donor.model';
import { DonorSettingsStore } from './settings/donor-settings.store';

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
  private readonly donorSettings = inject(DonorSettingsStore);

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

  findDonorByLink(link: string): IDonor | undefined {
    const s = link.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!s) {
      return undefined;
    }

    if (s.includes('@')) {
      return this.findDonorByEmail(s);
    }

    return this.donorsSignal().find((d) => {
      const a = `${d.firstname} ${d.lastname}`.trim().toLowerCase().replace(/\s+/g, ' ');
      const b = `${d.lastname} ${d.firstname}`.trim().toLowerCase().replace(/\s+/g, ' ');
      return a === s || b === s;
    });
  }

  createDonor(input: NewDonorInput): IDonor {
    const now = new Date();
    const baseData = this.toDonorFromInput(input, {
      id: this.newId(),
      creationDate: now,
      statut: 'new',
      totalDonation: 0,
      lastDonation: undefined,
      donationCount: 0
    });
    const donor = this.toDonorFromInput(input, {
      ...baseData,
      statut: this.donorSettings.statusOf(baseData, now)
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
    const updatedWithStatus = {
      ...updated,
      statut: this.donorSettings.statusOf(updated)
    };
    this.donorsSignal.update((list) => list.map((d) => (d.id === id ? updatedWithStatus : d)));
    return updatedWithStatus;
  }

  recordDonation(donorId: string, amount: number, date: Date): void {
    this.donorsSignal.update((list) =>
      list.map((d) => {
        if (d.id !== donorId) {
          return d;
        }
        const lastDonation =
          !d.lastDonation || date > d.lastDonation ? date : d.lastDonation;
        const updated = {
          ...d,
          totalDonation: d.totalDonation + amount,
          donationCount: d.donationCount + 1,
          lastDonation
        };
        return {
          ...updated,
          statut: this.donorSettings.statusOf(updated)
        };
      })
    );
  }

  recomputeStatuses(): void {
    const now = new Date();
    this.donorsSignal.update((list) =>
      list.map((d) => ({
        ...d,
        statut: this.donorSettings.statusOf(d, now)
      }))
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
