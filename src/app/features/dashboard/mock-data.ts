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

export const DASHBOARD_LATEST_DONORS: IDonor[] = [
  {
    id: '1',
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
    firstname: 'Claire',
    lastname: 'Bernard',
    email: 'claire.bernard@example.org',
    creationDate: new Date(new Date().setDate(new Date().getDate() - 18)),
    statut: 'new',
    totalDonation: 90,
    lastDonation: new Date(new Date().setDate(new Date().getDate() - 18)),
    donationCount: 1
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

