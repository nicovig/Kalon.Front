export interface Donor {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  address?: string;
  creationDate: Date;
  statut: 'active' | 'to_remind' | 'new' | 'inactive';
  totalDonation: number;
  lastDonation?: Date;
  donationCount: number;
}

