import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MailPageComponent } from './mail.page';
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
  let contacts: IContact[];
  let donations: IDonation[];
  let component: MailPageComponent;

  beforeEach(() => {
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
        }
      ]
    });

    component = TestBed.runInInjectionContext(() => new MailPageComponent());
    const cmp = component as any;
    cmp.chooseType('relance');
    cmp.chooseMethod('email');
    cmp.goToRecipientsStep();
  });

  it('filtre sur le dernier don en mois', () => {
    const cmp = component as any;

    cmp.onMonthsSinceLastDonationMinChange(24);

    expect(idsOf(cmp.filteredContacts())).toEqual(['c1', 'c4']);
  });

  it('filtre sur le total de contributions minimum depuis les dons reels', () => {
    const cmp = component as any;

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
    cmp.onIncludeWithoutChannelChange(false);
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
    cmp.onIncludeWithoutChannelChange(false);
    cmp.onTotalDonationMinChange('100');
    cmp.onDonationCountMinChange('1');

    expect(idsOf(cmp.filteredContacts())).toEqual(['c3']);
  });

  it('retourne uniquement les contacts sans email si avec email est decoche', () => {
    const cmp = component as any;

    cmp.onIncludeWithChannelChange(false);

    expect(idsOf(cmp.filteredContacts())).toEqual(['c4']);
  });

  it('retourne zero resultat si les deux disponibilites sont decochees', () => {
    const cmp = component as any;

    cmp.onIncludeWithChannelChange(false);
    cmp.onIncludeWithoutChannelChange(false);

    expect(idsOf(cmp.filteredContacts())).toEqual([]);
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
    cmp.selectAiTone('douce');

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

    cmp.chooseType('recu_fiscal');
    cmp.toggleContact('c1');
    cmp.goToTemplateStep();

    expect(cmp.activeStepKey()).toBe('ecriture');
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
                type: 'relance',
                canal: 'email',
                contactIds: 'c1,c4',
                step: 'modele'
              })
            )
          }
        }
      ]
    });

    const routedComponent = TestBed.runInInjectionContext(() => new MailPageComponent()) as any;

    expect(routedComponent.selectedSendType()).toBe('relance');
    expect(routedComponent.selectedSendMethod()).toBe('email');
    expect(Array.from(routedComponent.selectedContactIds())).toEqual(['c1', 'c4']);
    expect(routedComponent.activeStepKey()).toBe('modele');
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
