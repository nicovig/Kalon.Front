import { Donor } from '../../core/models/donor.model';

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

export const DASHBOARD_LATEST_DONORS: Donor[] = [
  {
    id: '1',
    firstname: 'Marie',
    lastname: 'Dupont',
    email: 'marie.dupont@example.org',
    creationDate: new Date(),
    statut: 'active',
    totalDonation: 450,
    lastDonation: new Date(),
    donationCount: 5
  },
  {
    id: '2',
    firstname: 'Jean',
    lastname: 'Martin',
    email: 'jean.martin@example.org',
    creationDate: new Date(),
    statut: 'to_remind',
    totalDonation: 120,
    lastDonation: new Date(new Date().setMonth(new Date().getMonth() - 14)),
    donationCount: 2
  },
  {
    id: '3',
    firstname: 'Sofia',
    lastname: 'Leroy',
    email: 'sofia.leroy@example.org',
    creationDate: new Date(),
    statut: 'new',
    totalDonation: 50,
    lastDonation: new Date(),
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

