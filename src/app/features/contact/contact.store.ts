import { inject, Injectable, signal } from '@angular/core';
import { ContactKind, IContact, IContactAddress, IContactEnterprise } from '../../core/models/contact.model';
import { ContactSettingsStore } from './settings/contact-settings.store';
import { UserStore } from '../../core/auth/user.store';

export interface NewContactInputIndividual {
  kind: 'donor' | 'member' | 'helper';
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  address: IContactAddress;
  jobTitle?: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other';
  preferredFrequencySendingReceipt?: IContact['preferredFrequencySendingReceipt'];
  out?: boolean;
}

export interface NewContactInputCompany {
  kind: 'company';
  email: string;
  phone?: string;
  enterprise: IContactEnterprise;
  preferredFrequencySendingReceipt?: IContact['preferredFrequencySendingReceipt'];
  out?: boolean;
}

export type NewContactInput = NewContactInputIndividual | NewContactInputCompany;

@Injectable({ providedIn: 'root' })
export class ContactStoreService {
  private readonly contactsSignal = signal<IContact[]>([]);
  private readonly contactSettings = inject(ContactSettingsStore);
  private readonly userStore = inject(UserStore);

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
      status: 'new',
      totalDonation: 0,
      lastDonation: undefined,
      donationCount: 0,
      organizationId: this.userStore.organizationId
    });
    const contact = this.toContactFromInput(input, {
      ...baseData,
      status: this.contactSettings.statusOf(baseData, now)
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
      status: input.out ? 'out' : 'new',
      totalDonation: existing.totalDonation,
      lastDonation: existing.lastDonation,
      donationCount: existing.donationCount,
      organizationId: existing.organizationId
    });
    const updatedWithStatus = {
      ...updated,
      status: this.contactSettings.statusOf(updated)
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
          status: this.contactSettings.statusOf(updated)
        };
      })
    );
  }

  recomputeStatuses(): void {
    const now = new Date();
    this.contactsSignal.update((list) =>
      list.map((d) => ({
        ...d,
        status: this.contactSettings.statusOf(d, now)
      }))
    );
  }

  private toContactFromInput(
    input: NewContactInput,
    meta: {
      id: string;
      creationDate: Date;
      status: IContact['status'];
      totalDonation: number;
      lastDonation?: Date;
      donationCount: number;
      organizationId: string;
    }
  ): IContact {
    if (input.kind !== 'company') {
      return {
        ...meta,
        kind: input.kind satisfies ContactKind,
        jobTitle: input.jobTitle?.trim() || undefined,
        birthDate: input.birthDate,
        organizationId: meta.organizationId,
        gender: input.gender,
        preferredFrequencySendingReceipt: input.preferredFrequencySendingReceipt,
        firstname: input.firstname.trim(),
        lastname: input.lastname.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || undefined,
        address: this.normalizeAddress(input.address),
        enterprise: undefined,
        status: input.out ? 'out' : meta.status
      };
    }

    const e = input.enterprise;
    const enterprise: IContactEnterprise = {
      name: e.name.trim(),
      siret: e.siret.trim(),
      address: this.normalizeAddress(e.address),
      legalForm: e.legalForm,
      supportKind: e.supportKind,
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
      enterprise,
      preferredFrequencySendingReceipt: input.preferredFrequencySendingReceipt,
      status: input.out ? 'out' : meta.status
    };
  }

  private normalizeAddress(a: IContactAddress): IContactAddress {
    return {
      street: a.street.trim(),
      postalCode: a.postalCode.trim(),
      city: a.city.trim(),
      country: a.country.trim(),
      phone: a.phone?.trim() || undefined,
      email: a.email?.trim() || undefined
    };
  }

  private newId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

}
