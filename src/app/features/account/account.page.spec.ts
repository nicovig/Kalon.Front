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
  let upsertImageArgs: unknown[] = [];
  let updateOrganizationArgs: unknown[] = [];
  let removedTextIds: string[] = [];
  let removedImageIds: string[] = [];
  let textBlocksData: Array<{ id: string; label: string; content: string; role: string }> = [];
  let imagesData: Array<{ id: string; label: string; fileName: string; dataUrl: string; addedAt: number }> = [];

  beforeEach(() => {
    upsertTextArgs = [];
    upsertImageArgs = [];
    updateOrganizationArgs = [];
    removedTextIds = [];
    removedImageIds = [];
    textBlocksData = [];
    imagesData = [];
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
            images: () => imagesData,
            upsertTextBlock: (...args: unknown[]) => upsertTextArgs.push(args),
            removeTextBlock: (id: string) => removedTextIds.push(id),
            upsertImage: (...args: unknown[]) => upsertImageArgs.push(args),
            removeImage: (id: string) => removedImageIds.push(id)
          }
        },
        {
          provide: HttpClient,
          useValue: {
            get: () =>
              of({
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
              }),
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

    await cmp.saveOrganizationInfo();

    expect(updateOrganizationArgs).toHaveLength(1);
    expect(updateOrganizationArgs[0]).toMatchObject({
      name: 'Nouvelle Asso',
      email: 'nouveau@asso.test',
      senderEmail: 'nouveau@asso.test',
      description: 'Nouvelle description',
      foundedYear: 2015,
      activitySector: 'Culture',
      audienceDescription: 'Familles'
    });
  });

  it('sauvegarde un bloc texte', () => {
    const cmp = component as any;
    cmp.textLabel.set('Bloc');
    cmp.textContent.set('Contenu');
    cmp.saveTextBlock();
    expect(upsertTextArgs[0]).toEqual([null, 'Bloc', 'Contenu', 'text']);
  });

  it('sauvegarde une image', () => {
    const cmp = component as any;
    cmp.imageLabel.set('Logo');
    cmp.imageDataUrl.set('data:image/png;base64,abc');
    cmp.imageMimeType.set('image/png');
    cmp.saveImage();
    expect(upsertImageArgs[0]).toEqual([null, 'Logo', 'data:image/png;base64,abc', 'image/png']);
  });

  it('demande confirmation avant suppression bloc texte', () => {
    const cmp = component as any;
    textBlocksData = [{ id: 't1', label: 'Bloc A', content: 'x', role: 'text' }];
    cmp.requestRemoveTextBlock('t1');
    expect(cmp.removeTarget()).toEqual({ id: 't1', type: 'text', label: 'Bloc A' });
    cmp.confirmRemove();
    expect(removedTextIds).toEqual(['t1']);
  });

  it('demande confirmation avant suppression image', () => {
    const cmp = component as any;
    imagesData = [{ id: 'i1', label: 'Logo', fileName: 'logo.png', dataUrl: 'data:image/png;base64,abc', addedAt: 1 }];
    cmp.requestRemoveImage('i1');
    expect(cmp.removeTarget()).toEqual({ id: 'i1', type: 'image', label: 'Logo' });
    cmp.confirmRemove();
    expect(removedImageIds).toEqual(['i1']);
  });
});
