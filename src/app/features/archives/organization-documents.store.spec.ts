import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { OrganizationDocumentsStore } from './organization-documents.store';
import { UserStore } from '../../core/auth/user.store';

describe('OrganizationDocumentsStore API', () => {
  let store: OrganizationDocumentsStore;
  const urls: string[] = [];

  beforeEach(() => {
    urls.length = 0;
    TestBed.configureTestingModule({
      providers: [
        OrganizationDocumentsStore,
        {
          provide: UserStore,
          useValue: {
            isAuthenticated: () => true
          }
        },
        {
          provide: HttpClient,
          useValue: {
            get: (url: string) => {
              urls.push(url);
              return of([]);
            }
          }
        }
      ]
    });
    store = TestBed.inject(OrganizationDocumentsStore);
  });

  it('charge les listes sans userId dans les URLs', () => {
    store.load();
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('/api/OrganizationDocuments/generated-documents');
    expect(urls[1]).toContain('/api/OrganizationDocuments/mail-logs');
    expect(urls.join('|')).not.toContain('userId=');
  });
});
