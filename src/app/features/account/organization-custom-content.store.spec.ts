import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { OrganizationCustomContentStore } from './organization-custom-content.store';
import { UserStore } from '../../core/auth/user.store';

describe('OrganizationCustomContentStore API', () => {
  let store: OrganizationCustomContentStore;
  const getUrls: string[] = [];
  const postUrls: string[] = [];
  const putUrls: string[] = [];
  const deleteUrls: string[] = [];

  beforeEach(() => {
    getUrls.length = 0;
    postUrls.length = 0;
    putUrls.length = 0;
    deleteUrls.length = 0;

    TestBed.configureTestingModule({
      providers: [
        OrganizationCustomContentStore,
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
              getUrls.push(url);
              return of([]);
            },
            post: (url: string) => {
              postUrls.push(url);
              return of({});
            },
            put: (url: string) => {
              putUrls.push(url);
              return of({});
            },
            delete: (url: string) => {
              deleteUrls.push(url);
              return of(undefined);
            }
          }
        }
      ]
    });
    store = TestBed.inject(OrganizationCustomContentStore);
  });

  it('loadAll appelle les listes sans userId', () => {
    store.loadAll();
    expect(getUrls).toHaveLength(2);
    expect(getUrls[0]).toContain('/api/OrganizationCustomContent/content-blocks');
    expect(getUrls[1]).toContain('/api/EmailTemplate');
    expect(getUrls.join('|')).not.toContain('userId=');
  });

  it('upsert et remove de content block sans userId', () => {
    store.upsertTextBlock(null, 'Bloc', 'Contenu', 'text');
    store.upsertTextBlock('cb-1', 'Bloc', 'Contenu', 'signature');
    store.removeTextBlock('cb-1');

    expect(postUrls.some((u) => u.includes('/api/OrganizationCustomContent/content-blocks'))).toBe(true);
    expect(putUrls.some((u) => u.includes('/api/OrganizationCustomContent/content-blocks/cb-1'))).toBe(true);
    expect(deleteUrls.some((u) => u.includes('/api/OrganizationCustomContent/content-blocks/cb-1'))).toBe(true);
    expect(`${postUrls}|${putUrls}|${deleteUrls}`).not.toContain('userId=');
  });

  it('upsert image sans userId', () => {
    store.upsertImage(null, 'Logo', 'data:image/png;base64,abc', 'image/png');
    store.upsertImage('img-1', 'Logo 2', 'data:image/png;base64,def', 'image/png');

    expect(postUrls.some((u) => u.includes('/api/OrganizationCustomContent/content-blocks'))).toBe(true);
    expect(putUrls.some((u) => u.includes('/api/OrganizationCustomContent/content-blocks/img-1'))).toBe(true);
    expect(`${postUrls}|${putUrls}`).not.toContain('userId=');
  });

  it('templates email sans userId', () => {
    store.addFiscalReceiptTemplate('Tpl', 'Body', 'Footer');
    store.updateFiscalReceiptTemplate('tpl-1', 'Tpl', 'Body', 'Footer');
    store.removeFiscalReceiptTemplate('tpl-1');

    expect(postUrls.some((u) => u.includes('/api/EmailTemplate'))).toBe(true);
    expect(putUrls.some((u) => u.includes('/api/EmailTemplate/tpl-1'))).toBe(true);
    expect(deleteUrls.some((u) => u.includes('/api/EmailTemplate/tpl-1'))).toBe(true);
    expect(`${postUrls}|${putUrls}|${deleteUrls}`).not.toContain('userId=');
  });
});
