import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AccountPageComponent } from './account.page';
import { UserStore } from '../../core/auth/user.store';
import { OrganizationCustomContentStore } from './organization-custom-content.store';
import { ToastService } from '../../layout/toast/toast.service';

describe('AccountPageComponent', () => {
  let component: AccountPageComponent;
  let upsertTextArgs: unknown[] = [];
  let upsertLogoArgs: unknown[] = [];
  let updateOrganizationArgs: unknown[] = [];
  let removedTextIds: string[] = [];
  let removeLogoCalls = 0;
  let textBlocksData: Array<{ id: string; label: string; content: string; role: string }> = [];

  beforeEach(() => {
    upsertTextArgs = [];
    upsertLogoArgs = [];
    updateOrganizationArgs = [];
    removedTextIds = [];
    removeLogoCalls = 0;
    textBlocksData = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UserStore,
          useValue: {
            currentUser: {
              associationName: 'Asso Test',
              email: 'mail@asso.test'
            }
          }
        },
        {
          provide: OrganizationCustomContentStore,
          useValue: {
            ensureLoaded: () => undefined,
            textBlocks: () => textBlocksData,
            emailTemplates: () => [],
            images: () => [],
            logo: () => null,
            upsertTextBlock: (...args: unknown[]) => upsertTextArgs.push(args),
            removeTextBlock: (id: string) => removedTextIds.push(id),
            upsertEmailTemplate: () => of({}),
            removeEmailTemplate: () => of(undefined),
            upsertLogo: (...args: unknown[]) => {
              upsertLogoArgs.push(args);
              return of({});
            },
            removeLogo: () => {
              removeLogoCalls++;
              return of(undefined);
            }
          }
        },
        {
          provide: HttpClient,
          useValue: {
            get: (url: string) => {
              if (url.includes('/api/Sending/mail-editor-tags')) {
                return of([{ id: 'prenom', label: 'Prénom', token: '{{prenom}}' }]);
              }
              return of({
                name: 'Association API',
                senderEmail: 'api@asso.test',
                description: 'Description API',
                foundedYear: 2001,
                activitySector: 'Sport',
                audienceDescription: 'Jeunes',
                rna: 'W123',
                siret: '123',
                userId: '00000000-0000-0000-0000-000000000001',
                defaultReceiptFrequency: 0
              });
            },
            put: (_url: string, payload: unknown) => {
              updateOrganizationArgs.push(payload);
              return of(payload);
            }
          }
        },
        {
          provide: ToastService,
          useValue: {
            show: () => undefined
          }
        }
      ]
    });

    component = TestBed.runInInjectionContext(() => new AccountPageComponent());
  });

  it('hydrate les infos organisation depuis API', async () => {
    await Promise.resolve();
    expect((component as any).organizationInfo().associationName).toBe('Association API');
    expect((component as any).organizationInfo().senderEmail).toBe('api@asso.test');
    expect((component as any).organizationInfo().description).toBe('Description API');
    expect((component as any).organizationInfo().foundedYear).toBe('2001');
  });

  it('met a jour les infos organisation via API', async () => {
    const cmp = component as any;
    await Promise.resolve();
    cmp.onOrganizationFieldChange('associationName', 'Nouvelle Asso');
    cmp.onOrganizationFieldChange('senderEmail', 'nouveau@asso.test');
    cmp.onOrganizationFieldChange('description', 'Nouvelle description');
    cmp.onOrganizationFieldChange('foundedYear', '2015');
    cmp.onOrganizationFieldChange('activitySector', 'Culture');
    cmp.onOrganizationFieldChange('audienceDescription', 'Familles');

    await cmp.saveAccountDetailsBlock();

    expect(updateOrganizationArgs).toHaveLength(1);
    const payload = updateOrganizationArgs[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      name: 'Nouvelle Asso',
      email: 'nouveau@asso.test',
      senderEmail: 'nouveau@asso.test',
      description: 'Nouvelle description',
      foundedYear: 2015,
      activitySector: 'Culture',
      audienceDescription: 'Familles'
    });
    expect(Array.isArray(payload['sendingPreferences'])).toBe(true);
    expect((payload['sendingPreferences'] as string[]).length).toBeGreaterThan(0);
  });

  it('sauvegarde un bloc texte', () => {
    const cmp = component as any;
    cmp.textLabel.set('Bloc');
    cmp.textContent.set('Contenu');
    cmp.saveTextBlock();
    expect(upsertTextArgs[0]).toEqual([null, 'Bloc', 'Contenu', 'text']);
  });

  it('sauvegarde le logo', () => {
    const cmp = component as any;
    cmp.imageChosenFileName.set('logo.png');
    cmp.imageDataUrl.set('data:image/png;base64,abc');
    cmp.imageMimeType.set('image/png');
    cmp.saveLogo();
    expect(upsertLogoArgs[0]).toEqual(['data:image/png;base64,abc', 'image/png', 'logo.png']);
  });

  it('demande confirmation avant suppression bloc texte', () => {
    const cmp = component as any;
    textBlocksData = [{ id: 't1', label: 'Bloc A', content: 'x', role: 'text' }];
    cmp.requestRemoveTextBlock('t1');
    expect(cmp.removeTarget()).toEqual({ id: 't1', type: 'text', label: 'Bloc A' });
    cmp.confirmRemove();
    expect(removedTextIds).toEqual(['t1']);
  });

  it('demande confirmation avant suppression logo', () => {
    const cmp = component as any;
    cmp.requestRemoveLogo();
    expect(cmp.removeTarget()).toEqual({ type: 'logo', label: 'Logo' });
    cmp.confirmRemove();
    expect(removeLogoCalls).toBe(1);
  });
});
