import { contactMatchesIdentityAndAddress, normalizeAddressKey } from './contact-match.util';
import { IContact } from '../models/contact.model';

describe('contact-match.util', () => {
  const baseContact: IContact = {
    id: '1',
    kind: 'donor',
    firstname: 'Jean',
    lastname: 'Dupont',
    email: '',
    organizationId: 'org',
    creationDate: new Date(),
    status: 'new',
    totalDonation: 0,
    donationCount: 0,
    address: {
      street: '12 rue de la Paix',
      postalCode: '75002',
      city: 'Paris',
      country: 'France'
    }
  };

  it('matches same identity and normalized address', () => {
    expect(
      contactMatchesIdentityAndAddress(baseContact, 'Jean', 'Dupont', {
        street: '12 Rue de la Paix',
        postalCode: '75002',
        city: 'Paris',
        country: 'France'
      })
    ).toBe(true);
  });

  it('rejects different address for same name', () => {
    expect(
      contactMatchesIdentityAndAddress(baseContact, 'Jean', 'Dupont', {
        street: '5 avenue Victor Hugo',
        postalCode: '75016',
        city: 'Paris',
        country: 'France'
      })
    ).toBe(false);
  });

  it('rejects swapped firstname and lastname', () => {
    expect(
      contactMatchesIdentityAndAddress(baseContact, 'Dupont', 'Jean', {
        street: '12 rue de la Paix',
        postalCode: '75002',
        city: 'Paris',
        country: 'France'
      })
    ).toBe(false);
  });

  it('normalizes address keys consistently', () => {
    expect(
      normalizeAddressKey({
        street: '12, rue de la Paix',
        postalCode: '75002',
        city: 'Paris'
      })
    ).toBe(
      normalizeAddressKey({
        street: '12 rue de la paix',
        postalCode: '75002',
        city: 'paris'
      })
    );
  });
});
