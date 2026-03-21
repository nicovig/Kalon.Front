export type DonorKind = 'individual' | 'company';

export interface IDonor {
  id: string;
  kind: DonorKind;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  address?: IDonorAddress;
  enterprise?: IDonorEnterprise;
  creationDate: Date;
  statut: 'active' | 'to_remind' | 'new' | 'inactive';
  totalDonation: number;
  lastDonation?: Date;
  donationCount: number;
}

export interface IDonorAddress {
  street: string;
  postalCode: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface IDonorEnterprise {
  name: string;
  siret: string;
  address: IDonorAddress;
  contactFirstname?: string;
  contactLastname?: string;
}