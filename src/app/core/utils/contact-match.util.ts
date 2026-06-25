import { IContact, IContactAddress } from '../models/contact.model';

export function normalizeIdentityPart(value: string | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

export function normalizeAddressKey(address: {
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}): string {
  const norm = (value: string | undefined): string =>
    String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  return [norm(address.street), norm(address.postalCode), norm(address.city)]
    .filter((part) => part && part !== '-')
    .join('|');
}

export function contactMatchesIdentityAndAddress(
  contact: IContact,
  firstname: string,
  lastname: string,
  address: IContactAddress
): boolean {
  if (contact.kind === 'company') {
    return false;
  }
  const fn = normalizeIdentityPart(firstname);
  const ln = normalizeIdentityPart(lastname);
  const cFn = normalizeIdentityPart(contact.firstname);
  const cLn = normalizeIdentityPart(contact.lastname);
  if (!fn || !ln || fn !== cFn || ln !== cLn) {
    return false;
  }
  if (!contact.address) {
    return false;
  }
  const targetKey = normalizeAddressKey(address);
  const contactKey = normalizeAddressKey(contact.address);
  return Boolean(targetKey) && targetKey === contactKey;
}
