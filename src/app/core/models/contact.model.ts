export type ContactKind = 'donor' | 'company' | 'member' | 'helper';
export type ContactStatus = 'active' | 'to_remind' | 'new' | 'inactive' | 'out'; //out == dead

export interface IContact {
  id: string;
  kind: ContactKind;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other';
  organizationId: string; // id of the organization (Kalon client) this contact belongs to
  address?: IContactAddress;
  enterprise?: IContactEnterprise;
  creationDate: Date;
  status: ContactStatus;
  totalDonation: number;
  firstDonationAt?: Date;
  lastDonation?: Date;
  lastDonationAmount?: number;
  averageDonationAmount?: number;
  donationCount: number;
  preferredFrequencySendingReceipt?: 'instantly' | 'monthly' | 'quarterly' | 'semesterly' | 'yearly';
  notes?: string;
}

export interface IContactAddress {
  street: string;
  postalCode: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
}

// export type OrganizationLegalXXXX =
//   | 'general_interest_66'   // intérêt général — réduction IS 60%
//   | 'public_utility_66'     // utilité publique — réduction IS 60%
//   | 'aid_organization_75';  // aide aux personnes — réduction IS 60% (taux particulier differ)

 export type EnterpriseSupportKind =
  | 'patronage'
  | 'sponsoring'
  | 'donation'
  | 'other';

export interface IContactEnterprise {
  name: string;
  siret: string;
  legalForm: string;
  supportKind: EnterpriseSupportKind;
  address: IContactAddress;
  contactFirstname?: string;
  contactLastname?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export function contactDisplayName(c: IContact): string {
  if (c.kind === 'company' && c.enterprise?.name) {
    return c.enterprise.name;
  }
  return `${c.firstname} ${c.lastname}`.trim();
}