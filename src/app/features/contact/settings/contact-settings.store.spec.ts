import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ContactSettingsStore } from './contact-settings.store';
import { UserStore } from '../../../core/auth/user.store';

describe('ContactSettingsStore API', () => {
  let store: ContactSettingsStore;
  let capturedGetUrl = '';
  let capturedPutUrl = '';
  let capturedPostUrl = '';
  let capturedPutBody: Record<string, unknown> | null = null;

  beforeEach(() => {
    capturedGetUrl = '';
    capturedPutUrl = '';
    capturedPostUrl = '';
    capturedPutBody = null;

    TestBed.configureTestingModule({
      providers: [
        ContactSettingsStore,
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
              capturedGetUrl = url;
              return of({
                id: 'settings-1',
                organizationId: 'org-1',
                userId: 'legacy-user-id',
                newDurationDays: 30,
                toRemindAfterMonths: 12,
                inactiveAfterMonths: 24
              });
            },
            put: (url: string, body: Record<string, unknown>) => {
              capturedPutUrl = url;
              capturedPutBody = body;
              return of({
                id: 'settings-1',
                organizationId: 'org-1',
                newDurationDays: body['newDurationDays'],
                toRemindAfterMonths: body['toRemindAfterMonths'],
                inactiveAfterMonths: body['inactiveAfterMonths']
              });
            },
            post: (url: string) => {
              capturedPostUrl = url;
              return of({
                newDurationDays: 30,
                toRemindAfterMonths: 12,
                inactiveAfterMonths: 24
              });
            }
          }
        }
      ]
    });

    store = TestBed.inject(ContactSettingsStore);
  });

  it('appelle le GET sans userId', () => {
    store.loadFromApi().subscribe();
    expect(capturedGetUrl).toContain('/api/contact-status-settings');
    expect(capturedGetUrl).not.toContain('userId=');
  });

  it('appelle le PUT sans userId dans URL ni payload', () => {
    store.loadFromApi().subscribe();
    store.updateAsync({
      newForDays: 40,
      toRemindAfterMonths: 10,
      inactiveAfterMonths: 20
    }).subscribe();

    expect(capturedPutUrl).toContain('/api/contact-status-settings');
    expect(capturedPutUrl).not.toContain('userId=');
    expect(capturedPutBody?.['userId']).toBeUndefined();
  });

  it('appelle le reset sans userId', () => {
    store.resetAsync().subscribe();
    expect(capturedPostUrl).toContain('/api/contact-status-settings/reset');
    expect(capturedPostUrl).not.toContain('userId=');
  });
});
