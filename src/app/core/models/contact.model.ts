export type ContactKind = 'individual' | 'company';
export type ContactStatus = 'active' | 'to_remind' | 'new' | 'inactive';

export interface IContact {
  id: string;
  kind: ContactKind;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  address?: IContactAddress;
  enterprise?: IContactEnterprise;
  creationDate: Date;
  statut: ContactStatus;
  totalDonation: number;
  lastDonation?: Date;
  donationCount: number;
}

export interface IContactAddress {
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

export interface IContactEnterprise {
  name: string;
  siret: string;
  fiscalStatus: EnterpriseFiscalStatus;
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