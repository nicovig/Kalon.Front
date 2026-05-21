import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DonationStoreService } from './donation.store';
import { UserStore } from '../../core/auth/user.store';
import { ContactStoreService } from '../contact/contact.store';

describe('DonationStoreService', () => {
  let store: DonationStoreService;
  const getUrls: string[] = [];

  beforeEach(() => {
    getUrls.length = 0;
    TestBed.configureTestingModule({
      providers: [
        DonationStoreService,
        {
          provide: UserStore,
          useValue: { isAuthenticated: () => true, organizationId: 'org-1' }
        },
        {
          provide: ContactStoreService,
          useValue: { contacts: () => [], recordDonation: () => undefined }
        },
        {
          provide: HttpClient,
          useValue: {
            get: (url: string) => {
              getUrls.push(url);
              if (url.includes('/api/Donation/contact/')) {
                return of({
                  contactId: 'c1',
                  items: [
                    {
                      id: 'd1',
                      contactId: 'c1',
                      amount: 50,
                      date: '2025-06-01T00:00:00Z',
                      donationType: 'financial'
                    }
                  ]
                });
              }
              return of({ items: [], totalCount: 0, page: 1, pageSize: 50, totalPages: 0 });
            },
            post: () => of({})
          }
        }
      ]
    });
    store = TestBed.inject(DonationStoreService);
  });

  it('queryDonationsForContacts appelle listByContact sans pagination', async () => {
    const rows = await firstValueFrom(
      store.queryDonationsForContacts({
        contactIds: ['c1', 'c2'],
        fromDate: '2025-01-01T00:00:00.000Z',
        toDate: '2025-12-31T23:59:59.999Z'
      })
    );

    expect(getUrls.filter((u) => u.includes('/api/Donation/contact/')).length).toBe(2);
    expect(getUrls.some((u) => u.includes('fromDate='))).toBe(true);
    expect(getUrls.some((u) => u.includes('pageSize='))).toBe(false);
    expect(rows.length).toBe(2);
  });
});
