export type DonorKind = 'individual' | 'company';
export type DonorStatus = 'active' | 'to_remind' | 'new' | 'inactive';

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
  statut: DonorStatus;
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

export type EnterpriseFiscalStatus = 'general_interest_66';

export interface IDonorEnterprise {
  name: string;
  siret: string;
  fiscalStatus: EnterpriseFiscalStatus;
  address: IDonorAddress;
  contactFirstname?: string;
  contactLastname?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export function donorDisplayName(d: IDonor): string {
  if (d.kind === 'company' && d.enterprise?.name) {
    return d.enterprise.name;
  }
  return `${d.firstname} ${d.lastname}`.trim();
}