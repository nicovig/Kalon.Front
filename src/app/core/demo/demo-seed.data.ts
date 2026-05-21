import {
  FiscalReceiptTemplate,
  MailDocumentAsset,
  MailTemplate,
  MailTextBlock
} from '../../features/account/organization-custom-content.store';
import { IContact } from '../models/contact.model';
import { IDonation } from '../models/donation.model';
import { MailLogListResponseApiModel } from '../api/backend-api.model';

const ORG_ID = '22222222-2222-2222-2222-222222222222';

function d(iso: string): Date {
  return new Date(iso);
}

export function createDemoContactsSeed(): IContact[] {
  return [
    {
      id: 'c-demo-1',
      kind: 'donor',
      firstname: 'Marie',
      lastname: 'Dupont',
      email: 'marie.dupont@demo.fr',
      phone: '06 12 34 56 78',
      organizationId: ORG_ID,
      address: {
        street: '12 rue de la Paix',
        postalCode: '75002',
        city: 'Paris',
        country: 'France'
      },
      creationDate: d('2023-03-15'),
      status: 'active',
      totalDonation: 450,
      firstDonationAt: d('2023-04-10'),
      lastDonation: d('2025-02-18'),
      lastDonationAmount: 150,
      averageDonationAmount: 150,
      donationCount: 3,
      preferredFrequencySendingReceipt: 'yearly'
    },
    {
      id: 'c-demo-2',
      kind: 'donor',
      firstname: 'Luc',
      lastname: 'Bernard',
      email: 'luc.bernard@demo.fr',
      phone: '06 98 76 54 32',
      organizationId: ORG_ID,
      address: {
        street: '8 avenue Victor Hugo',
        postalCode: '69002',
        city: 'Lyon',
        country: 'France'
      },
      creationDate: d('2022-11-01'),
      status: 'to_remind',
      totalDonation: 120,
      firstDonationAt: d('2022-12-05'),
      lastDonation: d('2023-08-20'),
      lastDonationAmount: 120,
      averageDonationAmount: 120,
      donationCount: 1,
      preferredFrequencySendingReceipt: 'yearly'
    },
    {
      id: 'c-demo-3',
      kind: 'member',
      firstname: 'Sophie',
      lastname: 'Martin',
      email: 'sophie.martin@demo.fr',
      organizationId: ORG_ID,
      address: {
        street: '3 allée des Chênes',
        postalCode: '33000',
        city: 'Bordeaux',
        country: 'France'
      },
      creationDate: d('2025-01-10'),
      status: 'new',
      totalDonation: 0,
      donationCount: 0,
      preferredFrequencySendingReceipt: 'yearly'
    },
    {
      id: 'c-demo-4',
      kind: 'company',
      firstname: '',
      lastname: '',
      email: 'contact@entreprise-demo.fr',
      organizationId: ORG_ID,
      enterprise: {
        name: 'Entreprise Solidaire SAS',
        siret: '12345678900012',
        legalForm: 'SAS',
        supportKind: 'patronage',
        address: {
          street: '25 boulevard Haussmann',
          postalCode: '75009',
          city: 'Paris',
          country: 'France',
          phone: '01 44 00 00 00'
        },
        contactFirstname: 'Claire',
        contactLastname: 'Simon',
        contactEmail: 'claire.simon@entreprise-demo.fr',
        contactPhone: '06 11 22 33 44'
      },
      creationDate: d('2021-06-01'),
      status: 'active',
      totalDonation: 2500,
      firstDonationAt: d('2024-11-05'),
      lastDonation: d('2024-11-05'),
      lastDonationAmount: 2500,
      averageDonationAmount: 2500,
      donationCount: 1,
      preferredFrequencySendingReceipt: 'yearly'
    },
    {
      id: 'c-demo-5',
      kind: 'helper',
      firstname: 'Thomas',
      lastname: 'Petit',
      email: 'thomas.petit@demo.fr',
      organizationId: ORG_ID,
      address: {
        street: '5 impasse des Lilas',
        postalCode: '44000',
        city: 'Nantes',
        country: 'France'
      },
      creationDate: d('2024-09-01'),
      status: 'inactive',
      totalDonation: 50,
      firstDonationAt: d('2024-09-15'),
      lastDonation: d('2024-09-15'),
      lastDonationAmount: 50,
      averageDonationAmount: 50,
      donationCount: 1
    }
  ];
}

export function createDemoDonationsSeed(): IDonation[] {
  return [
    {
      id: 'don-demo-1',
      organizationId: ORG_ID,
      contactId: 'c-demo-1',
      contactDisplayName: 'Marie Dupont',
      amount: 100,
      date: d('2023-04-10'),
      donationType: 'financial',
      paymentMethod: 'bank_transfer',
      isAnonymous: false
    },
    {
      id: 'don-demo-2',
      organizationId: ORG_ID,
      contactId: 'c-demo-1',
      contactDisplayName: 'Marie Dupont',
      amount: 200,
      date: d('2024-06-12'),
      donationType: 'financial',
      paymentMethod: 'check',
      isAnonymous: false
    },
    {
      id: 'don-demo-3',
      organizationId: ORG_ID,
      contactId: 'c-demo-1',
      contactDisplayName: 'Marie Dupont',
      amount: 150,
      date: d('2025-02-18'),
      donationType: 'financial',
      paymentMethod: 'bank_transfer',
      isAnonymous: false
    },
    {
      id: 'don-demo-4',
      organizationId: ORG_ID,
      contactId: 'c-demo-2',
      contactDisplayName: 'Luc Bernard',
      amount: 120,
      date: d('2023-08-20'),
      donationType: 'financial',
      paymentMethod: 'cash',
      isAnonymous: false
    },
    {
      id: 'don-demo-5',
      organizationId: ORG_ID,
      contactId: 'c-demo-4',
      contactDisplayName: 'Entreprise Solidaire SAS',
      amount: 2500,
      date: d('2024-11-05'),
      donationType: 'financial',
      paymentMethod: 'bank_transfer',
      isAnonymous: false
    },
    {
      id: 'don-demo-6',
      organizationId: ORG_ID,
      contactId: 'c-demo-5',
      contactDisplayName: 'Thomas Petit',
      amount: 50,
      date: d('2024-09-15'),
      donationType: 'financial',
      paymentMethod: 'other',
      isAnonymous: false
    }
  ];
}

export type DemoCustomContentState = {
  textBlocks: MailTextBlock[];
  emailTemplates: MailTemplate[];
  fiscalReceiptTemplates: FiscalReceiptTemplate[];
  documents: MailDocumentAsset[];
  logo: { id: string; label: string; fileName: string; dataUrl: string; addedAt: number } | null;
};

export function createDemoCustomContentSeed(): DemoCustomContentState {
  return {
    textBlocks: [
      {
        id: 'tb-demo-1',
        label: 'Introduction donateurs',
        content: 'Merci pour votre confiance et votre engagement à nos côtés.',
        addedAt: 1,
        role: 'text'
      },
      {
        id: 'sb-demo-1',
        label: 'Signature bureau',
        content: 'Bien cordialement,\nLe bureau de {{nom_association}}',
        addedAt: 2,
        role: 'signature'
      }
    ],
    emailTemplates: [
      {
        id: 'tpl-demo-1',
        label: 'Relance douce',
        subject: 'Un petit mot de {{nom_association}}',
        body: '<p>Bonjour {{prenom}},</p><p>Nous espérons que vous allez bien.</p>',
        emailTemplateType: 'message',
        addedAt: 1
      }
    ],
    fiscalReceiptTemplates: [],
    documents: [],
    logo: null
  };
}

export function createDemoOrganizationSeed(): Record<string, unknown> {
  return {
    name: 'Association Kalon Démo',
    email: 'contact@asso-demo.fr',
    senderEmail: 'contact@asso-demo.fr',
    description: 'Association de démonstration — toutes les données restent dans votre navigateur.',
    foundedYear: 1998,
    activitySector: 'Solidarité',
    audienceDescription: 'Donateurs, membres et entreprises mécènes',
    sendingPreferences: ['message', 'tax_receipt', 'payment_attestation', 'membership_certificate']
  };
}

export type DemoNotificationsState = {
  contactsToRemind: string[];
  contactsToSendTaxReceipts: string[];
  physicalLettersToSendCount: number;
  taxReceiptPeriodFrom: string | null;
  taxReceiptPeriodTo: string | null;
};

export function createDemoNotificationsSeed(): DemoNotificationsState {
  const year = new Date().getFullYear() - 1;
  return {
    contactsToRemind: ['c-demo-2'],
    contactsToSendTaxReceipts: ['c-demo-1', 'c-demo-4'],
    physicalLettersToSendCount: 1,
    taxReceiptPeriodFrom: `${year}-01-01`,
    taxReceiptPeriodTo: `${year}-12-31`
  };
}

export function createDemoMailLogsSeed(): MailLogListResponseApiModel[] {
  return [
    {
      id: 'log-demo-1',
      type: 'message',
      date: '2025-03-10T10:00:00Z',
      isEmail: true,
      status: 'sent',
      firstname: 'Marie',
      lastname: 'Dupont'
    },
    {
      id: 'log-demo-2',
      type: 'tax_receipt',
      date: '2025-01-20T14:30:00Z',
      isEmail: false,
      status: 'printed',
      firstname: 'Luc',
      lastname: 'Bernard'
    }
  ];
}
