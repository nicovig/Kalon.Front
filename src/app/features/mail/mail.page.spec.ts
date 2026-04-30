import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { MailPageComponent } from './mail.page';
import { DashboardNotificationStore } from '../../core/notification/dashboard-notification.store';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ContactStoreService } from '../contact/contact.store';
import { ContactSettingsStore } from '../contact/settings/contact-settings.store';
import { IContact } from '../../core/models/contact.model';
import { DonationStoreService } from '../donation/donation.store';
import { IDonation } from '../../core/models/donation.model';
import { IaAgentCore } from '../../core/ia-agent/ia_agent.core';
import { OrganizationCustomContentStore } from '../account/organization-custom-content.store';
import { of as rxOf } from 'rxjs';

describe('MailPageComponent filters', () => {
  const taxReceiptContactIdsMock = signal<ReadonlySet<string>>(new Set());
  const taxReceiptsToSendMock = signal(0);
  let contacts: IContact[];
  let donations: IDonation[];
  let component: MailPageComponent;
  let capturedSendPayload: any = null;
  let capturedPostUrl: string | null = null;
  let capturedGetUrls: string[] = [];
  let sendResultResponse: { successCount: number; errorCount: number; errors: Array<{ contactId?: string; contactName?: string; reason?: string }> };
  let printResponse: HttpResponse<Blob>;
  const mailEditorTagsBase = [
    { id: 'prenom', label: 'Prénom', token: '{{prenom}}' },
    { id: 'nom', label: 'Nom', token: '{{nom}}' },
    { id: 'totalDonation', label: 'Total des contributions', token: '{{totalDonation}}' },
    { id: 'firstDonationAt', label: 'Date première contribution', token: '{{firstDonationAt}}' },
    { id: 'lastDonation', label: 'Date dernière contribution', token: '{{lastDonation}}' },
    { id: 'averageDonationAmount', label: 'Moyenne des contributions', token: '{{averageDonationAmount}}' },
    { id: 'donationCount', label: 'Nombre de contributions', token: '{{donationCount}}' }
  ];

  beforeEach(() => {
    taxReceiptContactIdsMock.set(new Set());
    taxReceiptsToSendMock.set(0);
    capturedSendPayload = null;
    capturedPostUrl = null;
    capturedGetUrls = [];
    sendResultResponse = { successCount: 1, errorCount: 0, errors: [] };
    printResponse = new HttpResponse({
      body: new Blob(['pdf'], { type: 'application/pdf' }),
      headers: new HttpHeaders({ 'content-disposition': 'attachment; filename="courriers_20260422.pdf"' }),
      status: 200
    });
    contacts = buildContacts();
    donations = buildDonations();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ContactStoreService,
          useValue: {
            contacts: () => contacts,
            loadContactsFromApi: () => of(contacts)
          }
        },
        {
          provide: ContactSettingsStore,
          useValue: {
            statusOf: (contact: IContact) => contact.status
          }
        },
        {
          provide: DonationStoreService,
          useValue: {
            donations: () => donations,
            loadDonationsFromApi: () => of(donations)
          }
        },
        {
          provide: OrganizationCustomContentStore,
          useValue: {
            ensureLoaded: () => undefined,
            textBlocks: () => [
              { id: 'sb1', label: 'Signature', content: 'Bien cordialement, {{nom_association}}', addedAt: 1, role: 'signature' },
              { id: 'tb1', label: 'Texte', content: 'Contenu bloc', addedAt: 2, role: 'text' }
            ],
            emailTemplates: () => [
              {
                id: 'mail1',
                label: 'Relance standard',
                subject: 'Objet modèle',
                body: 'Bonjour {{prenom}}',
                emailTemplateType: 'reminder',
                addedAt: 1
              }
            ],
            fiscalReceiptTemplates: () => [
              {
                id: 'tpl1',
                label: 'Modèle A',
                body: 'Corps du modèle',
                footer: "Footer {{nom_association}}",
                requiredMentions: ['Mention 1', 'Mention 2'],
                system: false,
                addedAt: 1
              }
            ]
          }
        },
        {
          provide: IaAgentCore,
          useValue: {
            generateReminderTemplate: () =>
              rxOf({
                subject: 'Sujet IA',
                body: '<p>Texte IA</p>{{signature_footer}}'
              })
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({}))
          }
        },
        {
          provide: DashboardNotificationStore,
          useValue: {
            contactsToRemind: signal(0).asReadonly(),
            taxReceiptsToSend: taxReceiptsToSendMock.asReadonly(),
            physicalLettersToSend: signal(0).asReadonly(),
            taxReceiptContactIds: taxReceiptContactIdsMock.asReadonly(),
            hasAnyPending: signal(false).asReadonly(),
            refresh: () => undefined,
            reset: () => undefined
          }
        },
        {
          provide: HttpClient,
          useValue: {
            get: (url: string) => {
              capturedGetUrls.push(url);
              const u = String(url);
              if (u.includes('/api/Organization') && !u.includes('CustomContent')) {
                return of({ sendingPreferences: null });
              }
              const hasCompany = u.includes('hasCompanyRecipient=true');
              return of(
                hasCompany
                  ? [
                      { id: 'prenom', label: 'Prénom', token: '{{prenom}}' },
                      { id: 'nom', label: 'Nom', token: '{{nom}}' },
                      { id: 'enterprise_name', label: "Nom de l'entreprise", token: '{{enterprise_name}}' },
                      ...mailEditorTagsBase.slice(2)
                    ]
                  : mailEditorTagsBase
              );
            },
            post: (url: string, payload: unknown) => {
              capturedPostUrl = url;
              capturedSendPayload = payload;
              if (String(url).includes('/api/Sending/print')) {
                return of(printResponse);
              }
              return of(sendResultResponse);
            }
          }
        }
      ]
    });

    component = TestBed.runInInjectionContext(() => new MailPageComponent());
    const cmp = component as any;
    cmp.chooseType('message');
    cmp.chooseMethod('email');
    cmp.goToRecipientsStep();
    cmp.onAvailabilityModeChange('with_email');
  });

  it('filtre sur le dernier don en mois', () => {
    const cmp = component as any;

    cmp.onMonthsSinceLastDonationMinChange(24);

    expect(idsOf(cmp.filteredContacts())).toEqual(['c1']);
  });

  it('filtre sur le total de contributions minimum depuis les dons reels', () => {
    const cmp = component as any;
    cmp.onAvailabilityModeChange('without_email');

    cmp.onTotalDonationMinChange('300');

    expect(idsOf(cmp.filteredContacts())).toEqual(['c4']);
  });

  it('filtre sur le total de contributions maximum depuis les dons reels', () => {
    const cmp = component as any;

    cmp.onTotalDonationMaxChange('100');

    expect(idsOf(cmp.filteredContacts())).toEqual(['c2', 'c5', 'c6']);
  });

  it('accepte les montants saisis avec une virgule', () => {
    const cmp = component as any;
    cmp.onAvailabilityModeChange('without_email');

    cmp.onTotalDonationMinChange('300,5');

    expect(idsOf(cmp.filteredContacts())).toEqual(['c4']);
  });

  it('filtre sur le nombre minimum de contributions', () => {
    const cmp = component as any;

    cmp.onDonationCountMinChange('3');

    expect(idsOf(cmp.filteredContacts())).toEqual(['c1', 'c3']);
  });

  it('filtre sur le type de contact', () => {
    const cmp = component as any;

    cmp.onKindFilterChange('company');

    expect(idsOf(cmp.filteredContacts())).toEqual(['c6']);
  });

  it('combine les filtres pour un cas d usage association', () => {
    const cmp = component as any;

    cmp.onSearchQueryChange('marie');
    cmp.onKindFilterChange('donor');
    cmp.onStatusFilterChange('to_remind');
    cmp.onDepartmentFilterChange('75');
    cmp.onAvailabilityModeChange('with_email');
    cmp.onMonthsSinceLastDonationMinChange(12);
    cmp.onTotalDonationMinChange('100');
    cmp.onTotalDonationMaxChange('200');
    cmp.onDonationCountMinChange('2');

    expect(idsOf(cmp.filteredContacts())).toEqual(['c1']);
  });

  it('prefere les agregats contact a une liste partielle de dons', () => {
    const cmp = component as any;

    cmp.onSearchQueryChange('marie');
    cmp.onMonthsSinceLastDonationMinChange(24);
    cmp.onTotalDonationMinChange('100');
    cmp.onTotalDonationMaxChange('200');
    cmp.onDonationCountMinChange('3');

    expect(idsOf(cmp.filteredContacts())).toEqual(['c1']);
  });

  it('combine les filtres et exclut les contacts sans email dans un envoi email', () => {
    const cmp = component as any;

    cmp.onStatusFilterChange('active');
    cmp.onDepartmentFilterChange('69');
    cmp.onAvailabilityModeChange('with_email');
    cmp.onTotalDonationMinChange('100');
    cmp.onDonationCountMinChange('1');

    expect(idsOf(cmp.filteredContacts())).toEqual(['c3']);
  });

  it('retourne uniquement les contacts sans email avec le filtre radio', () => {
    const cmp = component as any;

    cmp.onAvailabilityModeChange('without_email');

    expect(idsOf(cmp.filteredContacts())).toEqual(['c4']);
  });

  it('retourne uniquement les contacts sans adresse postale ni email', () => {
    const cmp = component as any;

    cmp.onAvailabilityModeChange('without_postal_address_and_email');

    expect(idsOf(cmp.filteredContacts())).toEqual([]);
  });

  it('filtre sur les contacts en attente de recu fiscal selon le store', () => {
    const cmp = component as any;
    taxReceiptContactIdsMock.set(new Set(['c1', 'c4']));
    taxReceiptsToSendMock.set(2);
    cmp.chooseType('tax_receipt');
    cmp.onAvailabilityModeChange('pending_tax_receipt');

    expect(idsOf(cmp.filteredContacts()).sort()).toEqual(['c1', 'c4'].sort());
  });

  it('positionne le filtre recu fiscal a l etape destinataires quand la file d attente n est pas vide', () => {
    const cmp = component as any;
    taxReceiptsToSendMock.set(2);
    taxReceiptContactIdsMock.set(new Set(['c1']));
    cmp.chooseType('tax_receipt');
    cmp.chooseMethod('email');
    cmp.goToRecipientsStep();

    expect(cmp.availabilityMode()).toBe('pending_tax_receipt');
  });

  it('retire le filtre recu fiscal si on change de type d envoi', () => {
    const cmp = component as any;
    taxReceiptsToSendMock.set(1);
    cmp.chooseType('tax_receipt');
    cmp.chooseMethod('email');
    cmp.goToRecipientsStep();
    expect(cmp.availabilityMode()).toBe('pending_tax_receipt');

    cmp.chooseType('message');

    expect(cmp.availabilityMode()).toBe('with_email');
  });

  it('applique par defaut le filtre avec email apres selection du canal email', () => {
    const cmp = component as any;
    cmp.onAvailabilityModeChange('without_email');

    cmp.chooseMethod('email');

    expect(cmp.availabilityMode()).toBe('with_email');
  });

  it('applique par defaut le filtre avec adresse postale apres selection du canal courrier', () => {
    const cmp = component as any;
    cmp.onAvailabilityModeChange('without_email');

    cmp.chooseMethod('print');

    expect(cmp.availabilityMode()).toBe('with_postal_address');
  });

  it('en courrier permet de filtrer les contacts sans email', () => {
    const cmp = component as any;
    cmp.chooseMethod('print');

    expect(idsOf(cmp.filteredContacts())).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);

    cmp.onAvailabilityModeChange('without_email');

    expect(idsOf(cmp.filteredContacts())).toEqual(['c4']);
  });

  it('affiche les infos de dernier don et don moyen dans la liste', () => {
    const cmp = component as any;

    const marie = cmp.recipientItems().find((item: { id: string }) => item.id === 'c1');

    expect(marie?.infoText).toContain('3 contributions');
    expect(marie?.infoText).toContain('150 cumulés');
    expect(marie?.detailText).toContain('Dernier don :');
    expect(marie?.detailText).toContain('Don moyen :');
  });

  it('genere le texte IA et remplace {{signature_footer}}', async () => {
    const cmp = component as any;

    cmp.onSelectSignatureBlock('sb1');
    cmp.selectAiTone('chill_reminder');

    await cmp.generateAiText();

    expect(cmp.generatedBody()).toContain('<p>Bien cordialement, {{nom_association}}</p>');
  });

  it('n autorise pas continuer sans choix explicite a l etape modele', () => {
    const cmp = component as any;

    expect(cmp.canContinueFromTemplateStep()).toBe(false);
    expect(cmp.templateChoiceLabel()).toBe('Aucun choix sélectionné');
  });

  it('autorise continuer apres selection d un modele stocke', () => {
    const cmp = component as any;

    cmp.onSelectEmailTemplate('mail1');

    expect(cmp.canContinueFromTemplateStep()).toBe(true);
    expect(cmp.templateChoiceLabel()).toContain('Modèle stocké');
  });

  it('selectionne un modele stocke depuis une ligne du tableau', () => {
    const cmp = component as any;

    cmp.onEmailTemplateRowClick({ id: 'mail1' });

    expect(cmp.selectedEmailTemplateId()).toBe('mail1');
    expect(cmp.templateChoiceSource()).toBe('template');
  });

  it('reutilise le texte IA deja genere sans regeneraion', async () => {
    const cmp = component as any;

    cmp.onSelectSignatureBlock('sb1');
    await cmp.generateAiText();
    cmp.onSelectEmailTemplate('mail1');

    cmp.onAiPrimaryAction();

    expect(cmp.templateChoiceSource()).toBe('ia');
    expect(cmp.iaGenerationState()).toBe('done');
    expect(cmp.iaButtonLabel()).toBe('Utiliser le texte généré');
  });

  it('autorise continuer apres generation IA terminee', async () => {
    const cmp = component as any;

    cmp.onSelectSignatureBlock('sb1');

    await cmp.generateAiText();

    expect(cmp.canContinueFromTemplateStep()).toBe(true);
    expect(cmp.templateChoiceLabel()).toBe('Génération par IA');
    expect(cmp.iaButtonLabel()).toBe('Utiliser le texte généré');
  });

  it('expose les destinataires selectionnes pour les etapes suivantes', () => {
    const cmp = component as any;

    cmp.toggleContact('c1');
    cmp.toggleContact('c4');

    expect(cmp.selectedRecipients().map((item: { id: string }) => item.id)).toEqual(['c1', 'c4']);
  });

  it('revient aux destinataires quand on retire le dernier contact', () => {
    const cmp = component as any;

    cmp.toggleContact('c1');
    cmp.goToTemplateStep();
    cmp.removeSelectedContact('c1');

    expect(cmp.selectedCount()).toBe(0);
    expect(cmp.activeStepKey()).toBe('destinataires');
  });

  it('saute directement a ecriture pour un recu fiscal', () => {
    const cmp = component as any;

    cmp.chooseType('tax_receipt');
    cmp.toggleContact('c1');
    cmp.goToTemplateStep();

    expect(cmp.activeStepKey()).toBe('ecriture');
  });

  it('saute directement a ecriture pour un certificat d adhesion', () => {
    const cmp = component as any;

    cmp.chooseType('membership_certificate');
    cmp.toggleContact('c1');
    cmp.goToTemplateStep();

    expect(cmp.activeStepKey()).toBe('ecriture');
  });

  it('affiche le wording encart pour les types documentaires', () => {
    const cmp = component as any;
    cmp.chooseType('payment_attestation');

    expect(cmp.writingStepTitle()).toBe('Texte');
    expect(cmp.writingStepLead()).toContain("message d'accompagnement");
  });

  it("affiche l'objet pour tous les types d'envoi", () => {
    const cmp = component as any;

    cmp.chooseType('tax_receipt');
    expect(cmp.showEditorSubject()).toBe(true);

    cmp.chooseType('payment_attestation');
    expect(cmp.showEditorSubject()).toBe(true);

    cmp.chooseType('membership_certificate');
    expect(cmp.showEditorSubject()).toBe(true);

    cmp.chooseType('message');
    expect(cmp.showEditorSubject()).toBe(true);
  });

  it('reveal progressif des etapes sur tunnel message', () => {
    const cmp = component as any;
    cmp.chooseType('message');
    cmp.goToMethodStep();
    cmp.chooseMethod('email');
    cmp.goToRecipientsStep();

    expect(cmp.revealedSteps().map((s: { key: string }) => s.key)).toEqual([
      'choix_type',
      'choix_canal',
      'destinataires'
    ]);
  });

  it('n affiche pas l etape modele pour les types hors message', () => {
    const cmp = component as any;
    cmp.chooseType('payment_attestation');
    cmp.goToMethodStep();
    cmp.chooseMethod('email');
    cmp.toggleContact('c1');
    cmp.goToTemplateStep();

    expect(cmp.flowSteps().map((s: { key: string }) => s.key)).toEqual([
      'choix_type',
      'choix_canal',
      'destinataires',
      'ecriture',
      'apercu'
    ]);
    expect(cmp.revealedSteps().map((s: { key: string }) => s.key)).toEqual([
      'choix_type',
      'choix_canal',
      'destinataires',
      'ecriture'
    ]);
  });

  it('precharge le tunnel depuis les query params dashboard', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ContactStoreService,
          useValue: {
            contacts: () => contacts,
            loadContactsFromApi: () => of(contacts)
          }
        },
        {
          provide: ContactSettingsStore,
          useValue: {
            statusOf: (contact: IContact) => contact.status
          }
        },
        {
          provide: DonationStoreService,
          useValue: {
            donations: () => donations,
            loadDonationsFromApi: () => of(donations)
          }
        },
        {
          provide: OrganizationCustomContentStore,
          useValue: {
            ensureLoaded: () => undefined,
            textBlocks: () => [{ id: 'sb1', label: 'Signature', content: 'Bien cordialement, {{nom_association}}', addedAt: 1, role: 'signature' }],
            emailTemplates: () => [{ id: 'mail1', label: 'Relance standard', subject: 'Objet modèle', body: 'Bonjour {{prenom}}', emailTemplateType: 'reminder', addedAt: 1 }],
            fiscalReceiptTemplates: () => []
          }
        },
        {
          provide: IaAgentCore,
          useValue: {
            generateReminderTemplate: () =>
              rxOf({
                subject: 'Sujet IA',
                body: '<p>Texte IA</p>{{signature_footer}}'
              })
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(
              convertToParamMap({
                type: 'message',
                canal: 'email',
                contactIds: 'c1,c4',
                step: 'modele'
              })
            )
          }
        },
        {
          provide: DashboardNotificationStore,
          useValue: {
            contactsToRemind: signal(0).asReadonly(),
            taxReceiptsToSend: taxReceiptsToSendMock.asReadonly(),
            physicalLettersToSend: signal(0).asReadonly(),
            taxReceiptContactIds: taxReceiptContactIdsMock.asReadonly(),
            hasAnyPending: signal(false).asReadonly(),
            refresh: () => undefined,
            reset: () => undefined
          }
        },
        {
          provide: HttpClient,
          useValue: {
            get: (url: string) => {
              if (String(url).includes('/api/Organization') && !String(url).includes('CustomContent')) {
                return of({ sendingPreferences: null });
              }
              return of([]);
            },
            post: () => of({ successCount: 1, errorCount: 0, errors: [] })
          }
        }
      ]
    });

    const routedComponent = TestBed.runInInjectionContext(() => new MailPageComponent()) as any;

    expect(routedComponent.selectedSendType()).toBe('message');
    expect(routedComponent.selectedSendMethod()).toBe('email');
    expect(Array.from(routedComponent.selectedContactIds())).toEqual(['c1', 'c4']);
    expect(routedComponent.activeStepKey()).toBe('modele');
  });

  it('interpole l apercu email selon le destinataire choisi', () => {
    const cmp = component as any;
    cmp.toggleContact('c1');
    cmp.generatedSubject.set('Bonjour {{prenom}}');
    cmp.generatedBody.set('<p>Ville: {{ville}}</p>');
    cmp.goToPreviewStep();
    cmp.onPreviewRecipientChange('c1');

    expect(cmp.previewSubject()).toBe('Bonjour Marie');
    expect(cmp.previewBodyHtml()).toContain('Ville: Paris');
  });

  it('interpole aussi les tokens avec une seule accolade', () => {
    const cmp = component as any;
    cmp.toggleContact('c1');
    cmp.generatedSubject.set('Bonjour {prenom}');
    cmp.generatedBody.set('<p>{association} - {nom}</p>');
    cmp.goToPreviewStep();
    cmp.onPreviewRecipientChange('c1');

    expect(cmp.previewSubject()).toBe('Bonjour Marie');
    expect(cmp.previewBodyHtml()).toContain('votre association - Dupont');
  });

  it('preserve les retours a la ligne dans l apercu', () => {
    const cmp = component as any;
    cmp.toggleContact('c1');
    cmp.generatedBody.set('Ligne 1\nLigne 2');
    cmp.goToPreviewStep();
    cmp.onPreviewRecipientChange('c1');

    expect(cmp.previewBodyHtml()).toContain('Ligne 1<br>Ligne 2');
  });

  it('envoie via Sending/send en mode email', async () => {
    const cmp = component as any;
    cmp.toggleContact('c1');
    cmp.generatedSubject.set('Sujet');
    cmp.generatedBody.set('<p>Contenu</p>');

    await cmp.sendEmail();

    expect(cmp.sendingState()).toBe('idle');
    expect(cmp.sendResultModal()).toEqual({
      channel: 'email',
      successCount: 1,
      errorCount: 0,
      sentRecipients: ['Marie Dupont'],
      failedRecipients: [],
      returnedDocuments: []
    });
  });

  it('envoie le body en html avec retours a la ligne preserves', async () => {
    const cmp = component as any;
    cmp.toggleContact('c1');
    cmp.generatedBody.set('Bonjour\nDeuxieme ligne');

    await cmp.sendEmail();

    expect(capturedSendPayload?.bodyHtml).toContain('Bonjour<br>Deuxieme ligne');
  });

  it('envoie documentBodyHtml pour un envoi avec document', async () => {
    const cmp = component as any;
    cmp.chooseType('tax_receipt');
    cmp.toggleContact('c1');
    cmp.generatedBody.set('Message accompagnement');
    cmp.generatedDocumentBody.set('Bloc document');

    await cmp.sendEmail();

    expect(capturedSendPayload?.bodyHtml).toContain('Message accompagnement');
    expect(capturedSendPayload?.documentBodyHtml).toContain('Bloc document');
  });

  it('affiche les destinataires en echec dans le resultat d envoi', async () => {
    const cmp = component as any;
    cmp.toggleContact('c1');
    cmp.toggleContact('c3');
    sendResultResponse = {
      successCount: 1,
      errorCount: 1,
      errors: [{ contactId: 'c3', contactName: 'Luc Bernard', reason: 'Adresse email invalide' }]
    };

    await cmp.sendEmail();

    expect(cmp.sendResultModal()).toEqual({
      channel: 'email',
      successCount: 1,
      errorCount: 1,
      sentRecipients: ['Marie Dupont'],
      failedRecipients: [{ contactId: 'c3', contactName: 'Luc Bernard', reason: 'Adresse email invalide' }],
      returnedDocuments: []
    });
  });

  it('imprime via Sending/print en mode courrier', async () => {
    const cmp = component as any;
    cmp.chooseMethod('print');
    cmp.toggleContact('c1');
    cmp.generatedBody.set('Courrier test');

    await cmp.print();

    expect(capturedPostUrl).toContain('/api/Sending/print');
    expect(capturedSendPayload?.channel).toBe('print');
    expect(cmp.sendResultModal()?.channel).toBe('print');
    expect(cmp.sendResultModal()?.returnedDocuments).toEqual([{ fileName: 'courriers_20260422.pdf' }]);
  });

  it('interpole les donnees de contribution et entreprise', () => {
    const cmp = component as any;
    cmp.toggleContact('c1');
    cmp.generatedBody.set(
      '{{totalDonation}} / {{firstDonationAt}} / {{lastDonation}} / {{averageDonationAmount}} / {{donationCount}}'
    );
    cmp.goToPreviewStep();
    cmp.onPreviewRecipientChange('c1');
    const preview = String(cmp.previewBodyHtml());
    expect(preview).toContain('150');
    expect(preview).toContain('01/06/2022');
    expect(preview).toContain('15/01/2024');
    expect(preview).toContain('50');
    expect(preview).toContain('3');
  });

  it('interpole aussi la notation Entreprise.Name', () => {
    const cmp = component as any;
    cmp.toggleContact('c6');
    cmp.generatedBody.set('{{enterprise.name}}');
    cmp.goToPreviewStep();
    cmp.onPreviewRecipientChange('c6');

    expect(cmp.previewBodyHtml()).toContain('ACME');
  });

  it("affiche le tag nom de l'entreprise seulement si un destinataire entreprise est selectionne", () => {
    const cmp = component as any;
    cmp.loadMailEditorTags();

    cmp.toggleContact('c1');
    expect(cmp.editorVariableTags().some((t: { id: string }) => t.id === 'enterprise_name')).toBe(false);

    cmp.toggleContact('c6');
    expect(cmp.editorVariableTags().some((t: { id: string }) => t.id === 'enterprise_name')).toBe(true);
  });

  it('charge les tags editeur via API avec le bon filtre entreprise', () => {
    const cmp = component as any;
    cmp.loadMailEditorTags();
    expect(capturedGetUrls.some((url) => url.includes('/api/Sending/mail-editor-tags'))).toBe(true);
    expect(capturedGetUrls.some((url) => url.toLowerCase().includes('hascompanyrecipient=true'))).toBe(true);

    cmp.toggleContact('c6');

    const tagsRequests = capturedGetUrls.filter((url) => url.includes('/api/Sending/mail-editor-tags'));
    expect(tagsRequests).toHaveLength(1);
  });
});

function idsOf(contacts: IContact[]): string[] {
  return contacts.map((contact) => contact.id);
}

function buildContacts(): IContact[] {
  return [
    {
      id: 'c1',
      kind: 'donor',
      firstname: 'Marie',
      lastname: 'Dupont',
      email: 'marie@example.org',
      organizationId: 'org-1',
      address: { street: '1 rue A', postalCode: '75010', city: 'Paris', country: 'France' },
      creationDate: new Date('2022-01-15T00:00:00Z'),
      status: 'to_remind',
      totalDonation: 150,
      firstDonationAt: new Date('2022-06-01T00:00:00Z'),
      lastDonation: new Date('2024-01-15T00:00:00Z'),
      lastDonationAmount: 60,
      averageDonationAmount: 50,
      donationCount: 3
    },
    {
      id: 'c2',
      kind: 'donor',
      firstname: 'Paul',
      lastname: 'Martin',
      email: 'paul@example.org',
      organizationId: 'org-1',
      address: { street: '2 rue B', postalCode: '13001', city: 'Marseille', country: 'France' },
      creationDate: new Date('2024-01-10T00:00:00Z'),
      status: 'new',
      totalDonation: 50,
      firstDonationAt: new Date('2025-12-01T00:00:00Z'),
      lastDonation: new Date('2025-12-01T00:00:00Z'),
      lastDonationAmount: 50,
      averageDonationAmount: 50,
      donationCount: 1
    },
    {
      id: 'c3',
      kind: 'donor',
      firstname: 'Luc',
      lastname: 'Bernard',
      email: 'luc@example.org',
      organizationId: 'org-1',
      address: { street: '3 rue C', postalCode: '69001', city: 'Lyon', country: 'France' },
      creationDate: new Date('2023-02-01T00:00:00Z'),
      status: 'active',
      totalDonation: 100.5,
      firstDonationAt: new Date('2023-02-01T00:00:00Z'),
      lastDonation: new Date('2025-02-01T00:00:00Z'),
      lastDonationAmount: 30,
      averageDonationAmount: 25.125,
      donationCount: 4
    },
    {
      id: 'c4',
      kind: 'donor',
      firstname: 'Sonia',
      lastname: 'Durand',
      email: '',
      organizationId: 'org-1',
      address: { street: '4 rue D', postalCode: '75015', city: 'Paris', country: 'France' },
      creationDate: new Date('2021-03-01T00:00:00Z'),
      status: 'inactive',
      totalDonation: 500,
      firstDonationAt: new Date('2020-10-15T00:00:00Z'),
      lastDonation: new Date('2021-12-20T00:00:00Z'),
      lastDonationAmount: 250,
      averageDonationAmount: 250,
      donationCount: 2
    },
    {
      id: 'c5',
      kind: 'donor',
      firstname: 'Alice',
      lastname: 'Petit',
      email: 'alice@example.org',
      organizationId: 'org-1',
      address: { street: '5 rue E', postalCode: '33000', city: 'Bordeaux', country: 'France' },
      creationDate: new Date('2023-06-01T00:00:00Z'),
      status: 'active',
      totalDonation: 0,
      firstDonationAt: undefined,
      lastDonation: undefined,
      lastDonationAmount: undefined,
      averageDonationAmount: undefined,
      donationCount: 0
    },
    {
      id: 'c6',
      kind: 'company',
      firstname: '',
      lastname: 'ACME',
      email: 'contact@acme.fr',
      organizationId: 'org-1',
      address: undefined,
      enterprise: {
        name: 'ACME',
        siret: '123',
        legalForm: 'SAS',
        supportKind: 'patronage',
        address: { street: '6 rue F', postalCode: '75009', city: 'Paris', country: 'France' }
      },
      creationDate: new Date('2022-06-01T00:00:00Z'),
      status: 'active',
      totalDonation: 0,
      firstDonationAt: undefined,
      lastDonation: undefined,
      lastDonationAmount: undefined,
      averageDonationAmount: undefined,
      donationCount: 0
    }
  ];
}

function buildDonations(): IDonation[] {
  return [
    donation('d1', 'c1', 160.1, '2026-03-23T14:29:17Z'),
    donation('d2', 'c1', 140.36, '2026-03-20T14:29:17Z'),
    donation('d3', 'c1', 190.04, '2023-12-15T00:00:00Z'),
    donation('d4', 'c2', 34.7, '2026-04-01T15:29:17Z'),
    donation('d5', 'c3', 271.1, '2026-03-21T14:29:17Z'),
    donation('d6', 'c3', 109.66, '2026-02-28T14:29:17Z'),
    donation('d7', 'c3', 80.0, '2025-02-01T00:00:00Z'),
    donation('d8', 'c4', 323.62, '2021-12-20T00:00:00Z'),
    donation('d9', 'c4', 86.3, '2021-11-01T00:00:00Z'),
    donation('d10', 'c5', 0, '2025-01-01T00:00:00Z'),
    donation('d11', 'c6', 78.81, '2025-05-30T15:29:17Z')
  ];
}

function donation(id: string, contactId: string, amount: number, isoDate: string): IDonation {
  return {
    id,
    organizationId: 'org-1',
    contactId,
    contactDisplayName: contactId,
    amount,
    date: new Date(isoDate),
    donationType: 'financial',
    paymentMethod: 'bank_transfer',
    isAnonymous: false
  };
}
