import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, concatMap, from, map, of, reduce, switchMap, tap } from 'rxjs';
import { IContact, IContactAddress, IContactEnterprise } from '../../core/models/contact.model';
import { ContactSettingsStore } from './settings/contact-settings.store';
import { UserStore } from '../../core/auth/user.store';
import { API_ENDPOINTS } from '../../core/api/api.endpoints';
import {
  ContactApiAddress,
  ContactApiEnterprise,
  ContactApiModel,
  ContactBulkCreateRequestApiModel,
  ContactBulkCreateResponseApiModel,
  ContactCreateRequestApiModel,
  TagResponseApiModel
} from '../../core/api/backend-api.model';
import { contactMatchesIdentityAndAddress } from '../../core/utils/contact-match.util';
import { TagStoreService } from '../account/tag.store';

export interface NewContactInputIndividual {
  isEnterprise: false;
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
  lastMembershipDate?: Date | null;
  membershipEndDate?: Date | null;
  isFamilyMembership?: boolean;
  mainContactId?: string | null;
  tagIds?: string[];
}

export interface NewContactInputCompany {
  isEnterprise: true;
  email: string;
  phone?: string;
  enterprise: IContactEnterprise;
  preferredFrequencySendingReceipt?: IContact['preferredFrequencySendingReceipt'];
  out?: boolean;
  lastMembershipDate?: Date | null;
  membershipEndDate?: Date | null;
  isFamilyMembership?: boolean;
  mainContactId?: string | null;
  tagIds?: string[];
}

export type NewContactInput = NewContactInputIndividual | NewContactInputCompany;

@Injectable({ providedIn: 'root' })
export class ContactStoreService {
  private readonly contactsSignal = signal<IContact[]>([]);
  private readonly contactSettings = inject(ContactSettingsStore);
  private readonly userStore = inject(UserStore);
  private readonly http = inject(HttpClient);
  private readonly tagStore = inject(TagStoreService);

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

  findContactByNameAndAddress(
    firstname: string,
    lastname: string,
    address: IContactAddress
  ): IContact | undefined {
    return this.contactsSignal().find((contact) =>
      contactMatchesIdentityAndAddress(contact, firstname, lastname, address)
    );
  }

  findExistingContactForImport(input: NewContactInput): IContact | undefined {
    const email = input.email?.trim();
    if (email) {
      return this.findContactByEmail(email);
    }
    if (input.isEnterprise) {
      return undefined;
    }
    return this.findContactByNameAndAddress(input.firstname, input.lastname, input.address);
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

  createContactsBulk(inputs: NewContactInput[]): Observable<{ createdCount: number }> {
    if (!inputs.length) {
      return of({ createdCount: 0 });
    }
    if (!this.userStore.isAuthenticated()) {
      for (const input of inputs) {
        this.createContact(input);
      }
      return of({ createdCount: inputs.length });
    }
    const body: ContactBulkCreateRequestApiModel = {
      items: inputs.map((input) => this.toContactCreateBody(this.buildLocalContactFromInput(input)))
    };
    return this.http.post<ContactBulkCreateResponseApiModel>(API_ENDPOINTS.contact.bulkCreate(), body).pipe(
      switchMap((res) =>
        this.loadContactsFromApi().pipe(
          map(() => ({ createdCount: res.createdCount ?? inputs.length }))
        )
      )
    );
  }

  updateContactsSequential(
    updates: Array<{ id: string; input: NewContactInput }>
  ): Observable<number> {
    if (!updates.length) {
      return of(0);
    }
    return from(updates).pipe(
      concatMap(({ id, input }) =>
        this.updateContactAsync(id, input).pipe(
          map((contact) => (contact ? 1 : 0)),
          catchError(() => of(0))
        )
      ),
      reduce((sum, value) => sum + value, 0)
    );
  }

  private buildLocalContactFromInput(input: NewContactInput): IContact {
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
    return this.toContactFromInput(input, {
      ...baseData,
      status: this.contactSettings.statusOf(baseData, now)
    });
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
    if (input.isEnterprise === false) {
      return {
        ...meta,
        isEnterprise: false,
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
        status: input.out ? 'out' : meta.status,
        lastMembershipDate: input.lastMembershipDate ?? null,
        membershipEndDate: input.membershipEndDate ?? null,
        isFamilyMembership: Boolean(input.isFamilyMembership),
        mainContactId: input.mainContactId?.trim() || null,
        tags: this.resolveTagsFromIds(input.tagIds)
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
      isEnterprise: true,
      firstname: contactFirst,
      lastname: enterprise.name,
      email: input.email.trim(),
      phone: input.phone?.trim() || undefined,
      address: undefined,
      enterprise,
      preferredFrequencySendingReceipt: input.preferredFrequencySendingReceipt,
      status: input.out ? 'out' : meta.status,
      lastMembershipDate: input.lastMembershipDate ?? null,
      membershipEndDate: input.membershipEndDate ?? null,
      isFamilyMembership: Boolean(input.isFamilyMembership),
      mainContactId: input.mainContactId?.trim() || null,
      tags: this.resolveTagsFromIds(input.tagIds)
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
      !contact.isEnterprise && contact.address
        ? {
            street: contact.address.street ?? null,
            postalCode: contact.address.postalCode ?? null,
            city: contact.address.city ?? null,
            country: contact.address.country ?? null,
            phone: contact.address.phone ?? null,
            email: contact.address.email ?? null
          }
        : null;
    const enterprise = contact.isEnterprise && contact.enterprise
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
      isEnterprise: Boolean(contact.isEnterprise),
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
      lastMembershipDate: contact.lastMembershipDate
        ? new Date(contact.lastMembershipDate).toISOString()
        : null,
      membershipEndDate: contact.membershipEndDate
        ? new Date(contact.membershipEndDate).toISOString()
        : null,
      isFamilyMembership: Boolean(contact.isFamilyMembership),
      mainContactId: contact.mainContactId?.trim() || null,
      address,
      enterprise,
      tagIds: (contact.tags ?? []).map((tag) => tag.id)
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
    const statusRaw = String(row.status ?? 'new');
    const isEnterprise = Boolean(row.isEnterprise) || Boolean(row.enterprise?.name || row.enterprise?.siret);
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
      isEnterprise,
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
        (source === 'details' && department && !isEnterprise
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
      notes: row.notes ? String(row.notes) : undefined,
      lastMembershipDate: this.parseOptionalDate(row.lastMembershipDate),
      membershipEndDate: this.parseOptionalDate(row.membershipEndDate),
      isFamilyMembership: Boolean(row.isFamilyMembership),
      mainContactId: row.mainContactId ? String(row.mainContactId).trim() : null,
      tags: this.mapTagsFromApi(row.tags)
    };
  }

  private parseOptionalDate(value: string | null | undefined): Date | null | undefined {
    if (value == null || value === '') {
      return null;
    }
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private mapTagsFromApi(tags: TagResponseApiModel[] | null | undefined): IContact['tags'] {
    if (!tags?.length) {
      return [];
    }
    return tags
      .map((tag) => ({
        id: String(tag.id ?? ''),
        name: String(tag.name ?? '').trim(),
        color: tag.color ? String(tag.color).trim() : undefined
      }))
      .filter((tag) => tag.id && tag.name);
  }

  private resolveTagsFromIds(tagIds: string[] | undefined): IContact['tags'] {
    if (!tagIds?.length) {
      return [];
    }
    const known = this.tagStore.tags();
    return tagIds
      .map((id) => known.find((tag) => tag.id === id))
      .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));
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
