import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { ContactKind, IContact, IContactAddress, IContactEnterprise } from '../../core/models/contact.model';
import { ContactSettingsStore } from './settings/contact-settings.store';
import { UserStore } from '../../core/auth/user.store';
import { API_ENDPOINTS } from '../../core/api/api.endpoints';
import { ContactApiAddress, ContactApiEnterprise, ContactApiModel, ContactCreateRequestApiModel } from '../../core/api/backend-api.model';

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
  private readonly http = inject(HttpClient);

  contacts(): IContact[] {
    return this.contactsSignal();
  }

  getContactByIdAsync(contactId: string): Observable<IContact | null> {
    if (!this.userStore.isAuthenticated()) {
      const local = this.contactsSignal().find((c) => c.id === contactId) ?? null;
      return of(local);
    }
    const url = API_ENDPOINTS.contact.getById({ id: contactId });
    return this.http.get<ContactApiModel>(url).pipe(
      map((payload) => this.mapApiContact(payload, 'details')),
      tap((contact) => {
        this.upsertContact(contact);
      })
    );
  }

  loadContactsFromApi(): Observable<IContact[]> {
    if (!this.userStore.isAuthenticated()) {
      return of(this.contactsSignal());
    }
    const url = API_ENDPOINTS.contact.list();
    return this.http.get<ContactApiModel[]>(url).pipe(
      map((payload) => payload.map((row) => this.mapApiContact(row, 'list'))),
      tap((contacts) => this.contactsSignal.set(contacts))
    );
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
    this.pushCreateToApi(contact).subscribe({ error: () => undefined });
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
    this.pushUpdateToApi(updatedWithStatus).subscribe({ error: () => undefined });
    return updatedWithStatus;
  }

  createContactAsync(input: NewContactInput): Observable<IContact> {
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
    return this.pushCreateToApi(contact);
  }

  updateContactAsync(id: string, input: NewContactInput): Observable<IContact | null> {
    const existing = this.contactsSignal().find((d) => d.id === id);
    if (!existing) {
      return of(null);
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
    return this.pushUpdateToApi(updatedWithStatus);
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

  private pushCreateToApi(contact: IContact): Observable<IContact> {
    if (!this.userStore.isAuthenticated()) {
      return of(contact);
    }
    const url = API_ENDPOINTS.contact.create();
    return this.http.post<ContactApiModel>(url, this.toContactCreateBody(contact)).pipe(
      map((payload) => this.mapApiContact(payload, 'details')),
      tap((created) => {
        this.contactsSignal.update((list) => [
          created,
          ...list.filter((x) => x.id !== contact.id && x.id !== created.id)
        ]);
      })
    );
  }

  private pushUpdateToApi(contact: IContact): Observable<IContact> {
    if (!this.userStore.isAuthenticated()) {
      return of(contact);
    }
    const url = API_ENDPOINTS.contact.update({ id: contact.id });
    return this.http.put<ContactApiModel>(url, this.toContactCreateBody(contact)).pipe(
      map((payload) => this.mapApiContact(payload, 'details')),
      tap((updated) => this.upsertContact(updated))
    );
  }

  private toContactCreateBody(contact: IContact): ContactCreateRequestApiModel {
    const address =
      contact.kind !== 'company' && contact.address
        ? {
            street: contact.address.street ?? null,
            postalCode: contact.address.postalCode ?? null,
            city: contact.address.city ?? null,
            country: contact.address.country ?? null,
            phone: contact.address.phone ?? null,
            email: contact.address.email ?? null
          }
        : null;
    const enterprise = contact.kind === 'company' && contact.enterprise
      ? {
          name: contact.enterprise.name ?? null,
          siret: contact.enterprise.siret ?? null,
          supportKind: contact.enterprise.supportKind ?? null,
          street: contact.enterprise.address?.street ?? null,
          postalCode: contact.enterprise.address?.postalCode ?? null,
          city: contact.enterprise.address?.city ?? null,
          country: contact.enterprise.address?.country ?? null,
          contactFirstname: contact.enterprise.contactFirstname ?? null,
          contactLastname: contact.enterprise.contactLastname ?? null,
          contactEmail: contact.enterprise.contactEmail ?? null,
          contactPhone: contact.enterprise.contactPhone ?? null
        }
      : null;
    return {
      kind: contact.kind,
      firstname: contact.firstname ?? null,
      lastname: contact.lastname ?? null,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      jobTitle: contact.jobTitle ?? null,
      birthDate: contact.birthDate ? new Date(contact.birthDate).toISOString() : null,
      gender: contact.gender ?? null,
      notes: contact.notes ?? null,
      department: this.departmentFromContact(contact),
      preferredFrequencySendingReceipt: contact.preferredFrequencySendingReceipt ?? null,
      address,
      enterprise
    };
  }

  private departmentFromContact(contact: IContact): string | null {
    const raw = (contact.address?.postalCode ?? contact.enterprise?.address?.postalCode ?? '').trim();
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if ((digits.startsWith('97') || digits.startsWith('98')) && digits.length >= 3) {
      return digits.slice(0, 3);
    }
    if (digits.startsWith('20') && digits.length >= 3) {
      const third = digits[2] ?? '';
      return third === '0' || third === '1' ? '2A' : '2B';
    }
    return digits.length >= 2 ? digits.slice(0, 2) : null;
  }

  private mapApiContact(row: ContactApiModel, source: 'list' | 'details'): IContact {
    const kindRaw = String(row.kind ?? 'donor');
    const statusRaw = String(row.status ?? 'new');
    const kind: ContactKind =
      kindRaw === 'company' || kindRaw === 'member' || kindRaw === 'helper' ? kindRaw : 'donor';
    const status: IContact['status'] =
      statusRaw === 'active' ||
      statusRaw === 'to_remind' ||
      statusRaw === 'inactive' ||
      statusRaw === 'out'
        ? statusRaw
        : 'new';
    const birthDateRaw = row.birthDate;
    const creationDateRaw = row.createdAt;
    const preferredFrequency = String(row.preferredFrequencySendingReceipt ?? '');
    const department = String(row.department ?? '').trim();
    const mappedAddress = this.mapAddressFromApiRow(row);
    const mappedEnterprise = this.mapEnterpriseFromApiRow(row);
    return {
      id: String(row.id ?? this.newId()),
      organizationId: String(row.organizationId ?? this.userStore.organizationId),
      kind,
      firstname: String(row.firstname ?? ''),
      lastname: String(row.lastname ?? ''),
      email: String(row.email ?? ''),
      phone: row.phone ? String(row.phone) : undefined,
      jobTitle: row.jobTitle ? String(row.jobTitle) : undefined,
      birthDate:
        birthDateRaw && !Number.isNaN(new Date(String(birthDateRaw)).getTime())
          ? new Date(String(birthDateRaw))
          : undefined,
      gender:
        row.gender === 'male' || row.gender === 'female' || row.gender === 'other'
          ? row.gender
          : undefined,
      address:
        mappedAddress ??
        (source === 'details' && department
          ? { street: '', postalCode: department, city: '', country: 'France' }
          : undefined),
      enterprise: mappedEnterprise,
      creationDate:
        creationDateRaw && !Number.isNaN(new Date(String(creationDateRaw)).getTime())
          ? new Date(String(creationDateRaw))
          : new Date(),
      status,
      totalDonation: Number(row.totalDonation ?? 0),
      firstDonationAt:
        row.firstDonationAt && !Number.isNaN(new Date(String(row.firstDonationAt)).getTime())
          ? new Date(String(row.firstDonationAt))
          : undefined,
      firstDonationAmount:
        row.firstDonationAmount == null || !Number.isFinite(Number(row.firstDonationAmount))
          ? undefined
          : Number(row.firstDonationAmount),
      lastDonation:
        row.lastDonation && !Number.isNaN(new Date(String(row.lastDonation)).getTime())
          ? new Date(String(row.lastDonation))
          : undefined,
      lastDonationAmount:
        row.lastDonationAmount == null || !Number.isFinite(Number(row.lastDonationAmount))
          ? undefined
          : Number(row.lastDonationAmount),
      averageDonationAmount:
        row.averageDonationAmount == null || !Number.isFinite(Number(row.averageDonationAmount))
          ? undefined
          : Number(row.averageDonationAmount),
      donationCount: Number(row.donationCount ?? 0),
      preferredFrequencySendingReceipt:
        preferredFrequency === 'instantly' ||
        preferredFrequency === 'monthly' ||
        preferredFrequency === 'quarterly' ||
        preferredFrequency === 'semesterly' ||
        preferredFrequency === 'yearly'
          ? preferredFrequency
          : undefined,
      notes: row.notes ? String(row.notes) : undefined
    };
  }

  private upsertContact(contact: IContact): void {
    this.contactsSignal.update((list) => {
      const index = list.findIndex((x) => x.id === contact.id);
      if (index === -1) {
        return [contact, ...list];
      }
      const next = list.slice();
      const prev = next[index];
      next[index] = {
        ...prev,
        ...contact,
        address: contact.address ?? prev.address,
        enterprise: contact.enterprise ?? prev.enterprise
      };
      return next;
    });
  }

  private mapAddressFromApiRow(row: ContactApiModel): IContactAddress | undefined {
    const nestedAddress: ContactApiAddress | null = row.address ?? null;
    const street = String(nestedAddress?.street ?? '').trim();
    const postalCode = String(nestedAddress?.postalCode ?? row.department ?? '').trim();
    const city = String(nestedAddress?.city ?? '').trim();
    const country = String(nestedAddress?.country ?? '').trim();
    if (!street && !postalCode && !city && !country) {
      return undefined;
    }
    return {
      street,
      postalCode,
      city,
      country: country || 'France',
      phone: nestedAddress?.phone ? String(nestedAddress.phone) : undefined,
      email: nestedAddress?.email ? String(nestedAddress.email) : undefined
    };
  }

  private mapEnterpriseFromApiRow(row: ContactApiModel): IContactEnterprise | undefined {
    const nestedEnterprise: ContactApiEnterprise | null = row.enterprise ?? null;
    if (!nestedEnterprise) {
      return undefined;
    }
    const supportKindRaw = String(nestedEnterprise.supportKind ?? '').trim();
    const supportKind: IContactEnterprise['supportKind'] =
      supportKindRaw === 'patronage' ||
      supportKindRaw === 'sponsoring' ||
      supportKindRaw === 'donation' ||
      supportKindRaw === 'other'
        ? supportKindRaw
        : 'other';
    return {
      name: String(nestedEnterprise.name ?? '').trim(),
      siret: String(nestedEnterprise.siret ?? '').trim(),
      legalForm: '',
      supportKind,
      address: {
        street: String(nestedEnterprise.street ?? '').trim(),
        postalCode: String(nestedEnterprise.postalCode ?? '').trim(),
        city: String(nestedEnterprise.city ?? '').trim(),
        country: String(nestedEnterprise.country ?? 'France').trim() || 'France'
      },
      contactFirstname: nestedEnterprise.contactFirstname
        ? String(nestedEnterprise.contactFirstname).trim()
        : undefined,
      contactLastname: nestedEnterprise.contactLastname
        ? String(nestedEnterprise.contactLastname).trim()
        : undefined,
      contactEmail: nestedEnterprise.contactEmail
        ? String(nestedEnterprise.contactEmail).trim()
        : undefined,
      contactPhone: nestedEnterprise.contactPhone
        ? String(nestedEnterprise.contactPhone).trim()
        : undefined
    };
  }

}
