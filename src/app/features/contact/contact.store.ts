import { inject, Injectable, signal } from '@angular/core';
import { ContactKind, IContact, IContactAddress, IContactEnterprise } from '../../core/models/contact.model';
import { ContactSettingsStore } from './settings/contact-settings.store';

export interface NewContactInputIndividual {
  kind: 'individual';
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  address: IContactAddress;
}

export interface NewContactInputCompany {
  kind: 'company';
  email: string;
  phone?: string;
  enterprise: IContactEnterprise;
}

export type NewContactInput = NewContactInputIndividual | NewContactInputCompany;

@Injectable({ providedIn: 'root' })
export class ContactStoreService {
  private readonly contactsSignal = signal<IContact[]>([]);
  private readonly contactSettings = inject(ContactSettingsStore);

  contacts(): IContact[] {
    return this.contactsSignal();
  }

  findContactByEmail(email: string): IContact | undefined {
    const e = email.trim().toLowerCase();
    if (!e) {
      return undefined;
    }
    return this.contactsSignal().find((d) => d.email.toLowerCase() === e);
  }

  findContactByLink(link: string): IContact | undefined {
    const s = link.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!s) {
      return undefined;
    }

    if (s.includes('@')) {
      return this.findContactByEmail(s);
    }

    return this.contactsSignal().find((d) => {
      const a = `${d.firstname} ${d.lastname}`.trim().toLowerCase().replace(/\s+/g, ' ');
      const b = `${d.lastname} ${d.firstname}`.trim().toLowerCase().replace(/\s+/g, ' ');
      return a === s || b === s;
    });
  }

  createContact(input: NewContactInput): IContact {
    const now = new Date();
    const baseData = this.toContactFromInput(input, {
      id: this.newId(),
      creationDate: now,
      statut: 'new',
      totalDonation: 0,
      lastDonation: undefined,
      donationCount: 0
    });
    const contact = this.toContactFromInput(input, {
      ...baseData,
      statut: this.contactSettings.statusOf(baseData, now)
    });
    this.contactsSignal.set([contact, ...this.contactsSignal()]);
    return contact;
  }

  updateContact(id: string, input: NewContactInput): IContact | null {
    const existing = this.contactsSignal().find((d) => d.id === id);
    if (!existing) {
      return null;
    }
    const updated = this.toContactFromInput(input, {
      id: existing.id,
      creationDate: existing.creationDate,
      statut: existing.statut,
      totalDonation: existing.totalDonation,
      lastDonation: existing.lastDonation,
      donationCount: existing.donationCount
    });
    const updatedWithStatus = {
      ...updated,
      statut: this.contactSettings.statusOf(updated)
    };
    this.contactsSignal.update((list) => list.map((d) => (d.id === id ? updatedWithStatus : d)));
    return updatedWithStatus;
  }

  recordDonation(contactId: string, amount: number, date: Date): void {
    this.contactsSignal.update((list) =>
      list.map((d) => {
        if (d.id !== contactId) {
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
          statut: this.contactSettings.statusOf(updated)
        };
      })
    );
  }

  recomputeStatuses(): void {
    const now = new Date();
    this.contactsSignal.update((list) =>
      list.map((d) => ({
        ...d,
        statut: this.contactSettings.statusOf(d, now)
      }))
    );
  }

  private toContactFromInput(
    input: NewContactInput,
    meta: {
      id: string;
      creationDate: Date;
      statut: IContact['statut'];
      totalDonation: number;
      lastDonation?: Date;
      donationCount: number;
    }
  ): IContact {
    if (input.kind === 'individual') {
      return {
        ...meta,
        kind: 'individual' satisfies ContactKind,
        firstname: input.firstname.trim(),
        lastname: input.lastname.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || undefined,
        address: this.normalizeAddress(input.address),
        enterprise: undefined
      };
    }

    const e = input.enterprise;
    const enterprise: IContactEnterprise = {
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
      kind: 'company' satisfies ContactKind,
      firstname: contactFirst,
      lastname: enterprise.name,
      email: input.email.trim(),
      phone: input.phone?.trim() || undefined,
      address: undefined,
      enterprise
    };
  }

  private normalizeAddress(a: IContactAddress): IContactAddress {
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
