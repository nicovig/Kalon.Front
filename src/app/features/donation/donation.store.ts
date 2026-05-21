import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, tap } from 'rxjs';
import {
  DonationPaymentMethod,
  DonationType,
  IDonation,
  IGeneratedDocumentSummary
} from '../../core/models/donation.model';
import { contactDisplayName, IContact } from '../../core/models/contact.model';
import { ContactStoreService } from '../contact/contact.store';
import { API_ENDPOINTS } from '../../core/api/api.endpoints';
import { UserStore } from '../../core/auth/user.store';
import {
  DonationApiModel,
  DonationByContactListResponseApiModel,
  DonationListResponse,
  GeneratedDocumentApiModel
} from '../../core/api/backend-api.model';

@Injectable({ providedIn: 'root' })
export class DonationStoreService {
  private readonly contactStore = inject(ContactStoreService);
  private readonly userStore = inject(UserStore);
  private readonly http = inject(HttpClient);
  private readonly donationsSignal = signal<IDonation[]>([]);

  readonly donationsRead = this.donationsSignal.asReadonly();

  donations(): IDonation[] {
    return this.donationsSignal();
  }

  loadDonationsFromApi(): Observable<IDonation[]> {
    if (!this.userStore.isAuthenticated()) {
      return of(this.donationsSignal());
    }
    return this.queryDonations({ page: 1, pageSize: 200 }).pipe(
      tap((donations) => this.donationsSignal.set(donations))
    );
  }

  queryDonations(params: {
    fromDate?: string;
    toDate?: string;
    contactId?: string;
    donationType?: string;
    page?: number;
    pageSize?: number;
  } = {}): Observable<IDonation[]> {
    if (!this.userStore.isAuthenticated()) {
      return of([]);
    }
    const url = API_ENDPOINTS.donation.list({
      fromDate: params.fromDate,
      toDate: params.toDate,
      contactId: params.contactId,
      donationType: params.donationType,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 500
    });
    return this.http.get<DonationListResponse>(url).pipe(
      map((payload) => (payload.items ?? []).map((row) => this.mapApiDonation(row)))
    );
  }

  queryDonationsByContact(params: {
    contactId: string;
    fromDate?: string;
    toDate?: string;
    donationType?: string;
    minAmount?: number;
    maxAmount?: number;
  }): Observable<IDonation[]> {
    const contactId = params.contactId.trim();
    if (!contactId || !this.userStore.isAuthenticated()) {
      return of([]);
    }
    const url = API_ENDPOINTS.donation.listByContact({
      contactId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      donationType: params.donationType,
      minAmount: params.minAmount,
      maxAmount: params.maxAmount
    });
    return this.http.get<DonationByContactListResponseApiModel>(url).pipe(
      map((payload) => (payload.items ?? []).map((row) => this.mapApiDonation(row)))
    );
  }

  queryDonationsForContacts(params: {
    contactIds: string[];
    fromDate?: string;
    toDate?: string;
    donationType?: string;
    minAmount?: number;
    maxAmount?: number;
  }): Observable<IDonation[]> {
    const ids = [...new Set(params.contactIds.map((id) => id.trim()).filter(Boolean))];
    if (!ids.length || !this.userStore.isAuthenticated()) {
      return of([]);
    }
    if (ids.length === 1) {
      return this.queryDonationsByContact({
        contactId: ids[0],
        fromDate: params.fromDate,
        toDate: params.toDate,
        donationType: params.donationType,
        minAmount: params.minAmount,
        maxAmount: params.maxAmount
      });
    }
    return forkJoin(
      ids.map((contactId) =>
        this.queryDonationsByContact({
          contactId,
          fromDate: params.fromDate,
          toDate: params.toDate,
          donationType: params.donationType,
          minAmount: params.minAmount,
          maxAmount: params.maxAmount
        })
      )
    ).pipe(map((lists) => lists.flat()));
  }

  addDonationForContact(
    contact: IContact,
    amount: number,
    date: Date,
    paymentMethod: DonationPaymentMethod | null,
    donationType: DonationType
  ): IDonation {
    const display = contactDisplayName(contact);
    const donation: IDonation = {
      id: this.newId(),
      organizationId: contact.organizationId,
      contactId: contact.id,
      amount,
      date,
      contactDisplayName: display,
      paymentMethod,
      donationType,
      isAnonymous: false,
      generatedDocumentId: undefined,
      generatedDocument: undefined,
      notes: undefined
    };
    this.donationsSignal.set([donation, ...this.donationsSignal()]);
    this.contactStore.recordDonation(contact.id, amount, date);
    this.pushCreateToApi(donation).subscribe({ error: () => undefined });
    return donation;
  }

  addDonationForContactAsync(
    contact: IContact,
    amount: number,
    date: Date,
    paymentMethod: DonationPaymentMethod | null,
    donationType: DonationType
  ): Observable<IDonation> {
    const display = contactDisplayName(contact);
    const donation: IDonation = {
      id: this.newId(),
      organizationId: contact.organizationId,
      contactId: contact.id,
      amount,
      date,
      contactDisplayName: display,
      paymentMethod,
      donationType,
      isAnonymous: false,
      generatedDocumentId: undefined,
      generatedDocument: undefined,
      notes: undefined
    };
    this.donationsSignal.set([donation, ...this.donationsSignal()]);
    this.contactStore.recordDonation(contact.id, amount, date);
    return this.pushCreateToApi(donation);
  }

  private newId(): string {
    return `don-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private pushCreateToApi(donation: IDonation): Observable<IDonation> {
    if (!this.userStore.isAuthenticated()) {
      return of(donation);
    }
    const url = API_ENDPOINTS.donation.create();
    const { contactId, amount, date, donationType, paymentMethod, notes, isAnonymous } = donation;
    return this.http
      .post<DonationApiModel>(url, {
        contactId,
        amount,
        date: new Date(date).toISOString(),
        donationType,
        paymentMethod,
        notes: notes ?? null,
        isAnonymous
      })
      .pipe(
        map((payload) => this.mapApiDonation(payload)),
        tap((created) => {
          this.donationsSignal.update((list) => [
            created,
            ...list.filter((x) => x.id !== donation.id && x.id !== created.id)
          ]);
        })
      );
  }

  private mapApiDonation(row: DonationApiModel): IDonation {
    const donationTypeRaw = String(row.donationType ?? 'financial');
    const paymentMethodRaw = row.paymentMethod;
    const donationType: DonationType =
      donationTypeRaw === 'in_kind' || donationTypeRaw === 'sponsoring' ? donationTypeRaw : 'financial';
    const paymentMethod: DonationPaymentMethod | null =
      paymentMethodRaw === 'bank_transfer' ||
      paymentMethodRaw === 'cash' ||
      paymentMethodRaw === 'check' ||
      paymentMethodRaw === 'other'
        ? paymentMethodRaw
        : null;
    const dateRaw = row.date;
    const contactId = String(row.contactId ?? '');
    const contact = this.contactStore.contacts().find((c) => c.id === contactId);
    const generatedDocument = this.mapGeneratedDocument(row.generatedDocument);
    const generatedDocumentIdRaw = row.generatedDocumentId;
    const generatedDocumentId = generatedDocumentIdRaw
      ? String(generatedDocumentIdRaw)
      : generatedDocument?.id;
    return {
      id: String(row.id ?? `don-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      organizationId: String(row.organizationId ?? this.userStore.organizationId),
      contactId,
      contactDisplayName: String(row.contactDisplayName ?? (contact ? contactDisplayName(contact) : 'Profil')),
      amount: Number(row.amount ?? 0),
      date: dateRaw && !Number.isNaN(new Date(String(dateRaw)).getTime()) ? new Date(String(dateRaw)) : new Date(),
      donationType,
      paymentMethod,
      notes: row.notes ? String(row.notes) : undefined,
      isAnonymous: Boolean(row.isAnonymous),
      generatedDocumentId,
      generatedDocument:
        generatedDocument ?? (generatedDocumentId ? { id: generatedDocumentId } : undefined)
    };
  }

  private mapGeneratedDocument(
    raw: DonationApiModel['generatedDocument']
  ): IGeneratedDocumentSummary | undefined {
    if (!raw || !raw.id) {
      return undefined;
    }
    const full = raw as GeneratedDocumentApiModel;
    const sentAt =
      full.sentAt && !Number.isNaN(new Date(String(full.sentAt)).getTime())
        ? new Date(String(full.sentAt))
        : undefined;
    const generatedAt =
      full.generatedAt && !Number.isNaN(new Date(String(full.generatedAt)).getTime())
        ? new Date(String(full.generatedAt))
        : undefined;
    return {
      id: String(raw.id),
      documentType: raw.documentType ?? null,
      orderNumber: raw.orderNumber ?? null,
      status: raw.status ?? null,
      pdfPath: raw.pdfPath ?? null,
      sentAt,
      generatedAt
    };
  }
}
