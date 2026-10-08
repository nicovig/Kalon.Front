export type ContactStatus = 'active' | 'to_remind' | 'new' | 'inactive' | 'out';

export interface IContactTag {
  id: string;
  name: string;
  color?: string;
}

export interface IContact {
  id: string;
  isEnterprise: boolean;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other';
  organizationId: string;
  address?: IContactAddress;
  enterprise?: IContactEnterprise;
  creationDate: Date;
  status: ContactStatus;
  totalDonation: number;
  firstDonationAt?: Date;
  firstDonationAmount?: number;
  lastDonation?: Date;
  lastDonationAmount?: number;
  averageDonationAmount?: number;
  donationCount: number;
  preferredFrequencySendingReceipt?: 'instantly' | 'monthly' | 'quarterly' | 'semesterly' | 'yearly';
  notes?: string;
  lastMembershipDate?: Date | null;
  membershipEndDate?: Date | null;
  isFamilyMembership?: boolean;
  mainContactId?: string | null;
  tags?: IContactTag[];
}

export function isLinkedContact(c: Pick<IContact, 'mainContactId'>): boolean {
  return Boolean(c.mainContactId?.trim());
}

export interface IContactAddress {
  street: string;
  postalCode: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
}

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
  if (c.isEnterprise && c.enterprise?.name) {
    return c.enterprise.name;
  }
  return `${c.firstname} ${c.lastname}`.trim();
}

export function contactNatureLabel(c: Pick<IContact, 'isEnterprise'> | boolean): string {
  const isEnterprise = typeof c === 'boolean' ? c : c.isEnterprise;
  return isEnterprise ? 'Entreprise' : 'Particulier';
}
