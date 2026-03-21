import { IDonation } from '../../core/models/donation.model';
import { IDonor } from '../../core/models/donor.model';

export interface DashboardKpi {
  id: string;
  label: string;
  value: string;
  helper: string;
}

export interface DashboardPlanQuota {
  donorsUsed: number;
  donorsLimit: number;
  receiptsUsed: number;
  receiptsLimit: number;
  canImportMore: boolean;
}

export interface DashboardReminderItem {
  donorId: string;
  name: string;
  lastDonation: Date | null;
  reason: string;
}

export const DASHBOARD_KPIS: DashboardKpi[] = [
  {
    id: 'active-donors',
    label: 'Donateurs actifs',
    value: '128',
    helper: 'Au moins un don sur les 12 derniers mois'
  },
  {
    id: 'year-donations',
    label: 'Dons cette année',
    value: '18 450 €',
    helper: 'Depuis le 1er janvier'
  },
  {
    id: 'to-remind',
    label: 'À relancer',
    value: '23',
    helper: 'Aucun don depuis 12 mois'
  },
  {
    id: 'receipts',
    label: 'Reçus générés',
    value: '94',
    helper: 'Prêts à être envoyés'
  }
];

export const DASHBOARD_PLAN_QUOTA: DashboardPlanQuota = {
  donorsUsed: 128,
  donorsLimit: 200,
  receiptsUsed: 94,
  receiptsLimit: 200,
  canImportMore: true
};

export const DASHBOARD_LATEST_DONATIONS: IDonation[] = [
  {
    id: 'don-01',
    donorId: '1',
    amount: 80,
    date: new Date(new Date().setDate(new Date().getDate() - 1)),
    donorDisplayName: 'Marie-Laure Fontaine'
  },
  {
    id: 'don-02',
    donorId: '9',
    amount: 500,
    date: new Date(new Date().setDate(new Date().getDate() - 2)),
    donorDisplayName: 'Solidarité Nord'
  },
  {
    id: 'don-03',
    donorId: '4',
    amount: 120,
    date: new Date(new Date().setDate(new Date().getDate() - 3)),
    donorDisplayName: 'Chloé Martin'
  },
  {
    id: 'don-04',
    donorId: '3',
    amount: 50,
    date: new Date(new Date().setDate(new Date().getDate() - 4)),
    donorDisplayName: 'Sophie Bernard'
  },
  {
    id: 'don-05',
    donorId: '9',
    amount: 700,
    date: new Date(new Date().setDate(new Date().getDate() - 5)),
    donorDisplayName: 'Solidarité Nord'
  },
  {
    id: 'don-06',
    donorId: '6',
    amount: 35,
    date: new Date(new Date().setDate(new Date().getDate() - 6)),
    donorDisplayName: 'Isabelle Moreau'
  },
  {
    id: 'don-07',
    donorId: '8',
    amount: 90,
    date: new Date(new Date().setDate(new Date().getDate() - 7)),
    donorDisplayName: 'Claire Bernard'
  },
  {
    id: 'don-08',
    donorId: '1',
    amount: 100,
    date: new Date(new Date().setDate(new Date().getDate() - 10)),
    donorDisplayName: 'Marie-Laure Fontaine'
  },
  {
    id: 'don-09',
    donorId: '5',
    amount: 75,
    date: new Date(new Date().setDate(new Date().getDate() - 14)),
    donorDisplayName: 'Pierre Leclerc'
  },
  {
    id: 'don-10',
    donorId: '4',
    amount: 40,
    date: new Date(new Date().setDate(new Date().getDate() - 21)),
    donorDisplayName: 'Chloé Martin'
  },
  {
    id: 'don-11',
    donorId: '2',
    amount: 25,
    date: new Date(new Date().setDate(new Date().getDate() - 45)),
    donorDisplayName: 'Jean Dupont'
  },
  {
    id: 'don-12',
    donorId: '7',
    amount: 45,
    date: new Date(new Date().setDate(new Date().getDate() - 60)),
    donorDisplayName: 'Thomas Garnier'
  }
];

export const DASHBOARD_LATEST_DONORS: IDonor[] = [
  {
    id: '1',
    kind: 'individual',
    firstname: 'Marie-Laure',
    lastname: 'Fontaine',
    email: 'ml.fontaine@example.org',
    creationDate: new Date(new Date().setDate(new Date().getDate() - 1)),
    statut: 'active',
    totalDonation: 320,
    lastDonation: new Date(new Date().setDate(new Date().getDate() - 1)),
    donationCount: 4
  },
  {
    id: '2',
    kind: 'individual',
    firstname: 'Jean',
    lastname: 'Dupont',
    email: 'jean.dupont@example.org',
    creationDate: new Date(new Date().setDate(new Date().getDate() - 3)),
    statut: 'to_remind',
    totalDonation: 80,
    lastDonation: new Date(new Date().setMonth(new Date().getMonth() - 13)),
    donationCount: 2
  },
  {
    id: '3',
    kind: 'individual',
    firstname: 'Sophie',
    lastname: 'Bernard',
    email: 's.bernard@example.org',
    creationDate: new Date(new Date().setDate(new Date().getDate() - 5)),
    statut: 'new',
    totalDonation: 50,
    lastDonation: new Date(new Date().setDate(new Date().getDate() - 5)),
    donationCount: 1
  },
  {
    id: '4',
    kind: 'individual',
    firstname: 'Chloé',
    lastname: 'Martin',
    email: 'chloe.martin@example.org',
    creationDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    statut: 'active',
    totalDonation: 200,
    lastDonation: new Date(new Date().setDate(new Date().getDate() - 7)),
    donationCount: 3
  },
  {
    id: '5',
    kind: 'individual',
    firstname: 'Pierre',
    lastname: 'Leclerc',
    email: 'p.leclerc@example.org',
    creationDate: new Date(new Date().setDate(new Date().getDate() - 10)),
    statut: 'to_remind',
    totalDonation: 150,
    lastDonation: new Date(new Date().setMonth(new Date().getMonth() - 15)),
    donationCount: 2
  },
  {
    id: '6',
    kind: 'individual',
    firstname: 'Isabelle',
    lastname: 'Moreau',
    email: 'isabelle.moreau@example.org',
    creationDate: new Date(new Date().setDate(new Date().getDate() - 12)),
    statut: 'active',
    totalDonation: 60,
    lastDonation: new Date(new Date().setDate(new Date().getDate() - 12)),
    donationCount: 2
  },
  {
    id: '7',
    kind: 'individual',
    firstname: 'Thomas',
    lastname: 'Garnier',
    email: 'thomas.garnier@example.org',
    creationDate: new Date(new Date().setDate(new Date().getDate() - 15)),
    statut: 'to_remind',
    totalDonation: 45,
    lastDonation: new Date(new Date().setMonth(new Date().getMonth() - 16)),
    donationCount: 1
  },
  {
    id: '8',
    kind: 'individual',
    firstname: 'Claire',
    lastname: 'Bernard',
    email: 'claire.bernard@example.org',
    creationDate: new Date(new Date().setDate(new Date().getDate() - 18)),
    statut: 'new',
    totalDonation: 90,
    lastDonation: new Date(new Date().setDate(new Date().getDate() - 18)),
    donationCount: 1
  },
  {
    id: '9',
    kind: 'company',
    firstname: 'Camille',
    lastname: 'Solidarité Nord',
    email: 'bureau@solidarite-nord.org',
    creationDate: new Date(new Date().setDate(new Date().getDate() - 20)),
    statut: 'active',
    totalDonation: 1200,
    lastDonation: new Date(new Date().setDate(new Date().getDate() - 4)),
    donationCount: 2,
    enterprise: {
      name: 'Solidarité Nord',
      siret: '12345678900012',
      address: {
        street: '15 avenue de la République',
        postalCode: '59000',
        city: 'Lille',
        country: 'France'
      },
      contactFirstname: 'Camille',
      contactLastname: 'Dubois'
    }
  }
];

export const DASHBOARD_REMINDERS: DashboardReminderItem[] = [
  {
    donorId: '2',
    name: 'Jean Martin',
    lastDonation: new Date(new Date().setMonth(new Date().getMonth() - 14)),
    reason: 'Aucun don depuis plus de 12 mois'
  },
  {
    donorId: '4',
    name: 'Claire Bernard',
    lastDonation: null,
    reason: 'Premier don il y a un an'
  }
];

