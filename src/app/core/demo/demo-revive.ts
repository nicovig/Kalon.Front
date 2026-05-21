import { IContact } from '../models/contact.model';
import { IDonation } from '../models/donation.model';

export function reviveContacts(raw: unknown): IContact[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => {
    const c = item as IContact;
    return {
      ...c,
      creationDate: new Date(c.creationDate),
      birthDate: c.birthDate ? new Date(c.birthDate) : undefined,
      firstDonationAt: c.firstDonationAt ? new Date(c.firstDonationAt) : undefined,
      lastDonation: c.lastDonation ? new Date(c.lastDonation) : undefined
    };
  });
}

export function reviveDonations(raw: unknown): IDonation[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => {
    const d = item as IDonation;
    return {
      ...d,
      date: new Date(d.date)
    };
  });
}
