import {
  analyzeContactImportDataset,
  assessContactImportRowSkipReason,
  buildContactImportBag,
  contactsImportMappingReady,
  hasPostalAddressInBag,
  hasReachableChannel,
  isValidEmail,
  splitFullNameCell
} from './import-contact-validation';
import { ImportFieldKey } from './model/import-field.model';

describe('import-contact-validation', () => {
  describe('isValidEmail', () => {
    it('accepts a standard email', () => {
      expect(isValidEmail('alice@example.com')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('splitFullNameCell', () => {
    it('splits firstname and lastname from a combined cell', () => {
      expect(splitFullNameCell('Jean Dupont')).toEqual({
        firstname: 'Jean',
        lastname: 'Dupont'
      });
    });

    it('keeps hyphenated first names intact', () => {
      expect(splitFullNameCell('Jean-Michel Dupont')).toEqual({
        firstname: 'Jean-Michel',
        lastname: 'Dupont'
      });
      expect(splitFullNameCell('Anne-Sophie Martin')).toEqual({
        firstname: 'Anne-Sophie',
        lastname: 'Martin'
      });
    });

    it('keeps hyphenated last names intact', () => {
      expect(splitFullNameCell('Jean Dupont-Martin')).toEqual({
        firstname: 'Jean',
        lastname: 'Dupont-Martin'
      });
    });

    it('supports lastname-firstname order', () => {
      expect(splitFullNameCell('Dupont Jean', 'lastname-firstname')).toEqual({
        firstname: 'Jean',
        lastname: 'Dupont'
      });
      expect(splitFullNameCell('Dupont Jean-Michel', 'lastname-firstname')).toEqual({
        firstname: 'Jean-Michel',
        lastname: 'Dupont'
      });
    });

    it('puts a single word in lastname', () => {
      expect(splitFullNameCell('Dupont')).toEqual({ firstname: '', lastname: 'Dupont' });
    });
  });

  describe('hasPostalAddressInBag', () => {
    it('accepts a full address line', () => {
      expect(hasPostalAddressInBag({ addressLine: '12 rue de la Paix 75002 Paris' })).toBe(true);
    });

    it('accepts street with postal code or city', () => {
      expect(hasPostalAddressInBag({ street: '12 rue de la Paix', postalCode: '75002' })).toBe(true);
      expect(hasPostalAddressInBag({ street: '12 rue de la Paix', city: 'Paris' })).toBe(true);
    });

    it('rejects placeholder street without city or postal code', () => {
      expect(hasPostalAddressInBag({ street: '-' })).toBe(false);
    });
  });

  describe('hasReachableChannel', () => {
    it('accepts email or postal address', () => {
      expect(hasReachableChannel({ email: 'a@b.com' })).toBe(true);
      expect(
        hasReachableChannel({ addressLine: '12 rue de la Paix 75002 Paris' })
      ).toBe(true);
      expect(hasReachableChannel({ firstname: 'Jean' })).toBe(false);
    });
  });

  describe('contactsImportMappingReady', () => {
    it('requires channel and identity fields', () => {
      expect(contactsImportMappingReady(['email', 'lastname'])).toBe(true);
      expect(contactsImportMappingReady(['addressLine', 'fullName'])).toBe(true);
      expect(contactsImportMappingReady(['email'])).toBe(false);
      expect(contactsImportMappingReady(['firstname'])).toBe(false);
    });
  });

  describe('assessContactImportRowSkipReason', () => {
    it('requires email or address for individuals', () => {
      expect(
        assessContactImportRowSkipReason({ firstname: 'Jean', lastname: 'Dupont' })
      ).toBe('Email ou adresse postale manquant');
    });

    it('accepts address without email when name is present', () => {
      expect(
        assessContactImportRowSkipReason({
          firstname: 'Jean',
          lastname: 'Dupont',
          addressLine: '12 rue de la Paix 75002 Paris'
        })
      ).toBeNull();
    });

    it('requires name or firstname for individuals', () => {
      expect(
        assessContactImportRowSkipReason({
          email: 'jean@example.com'
        })
      ).toBe('Nom ou prénom manquant');
    });

    it('derives name from fullName column', () => {
      expect(
        assessContactImportRowSkipReason({
          email: 'jean@example.com',
          fullName: 'Jean Dupont'
        })
      ).toBeNull();
    });
  });

  describe('analyzeContactImportDataset', () => {
    it('flags empty mapped columns as blocking errors', () => {
      const headers = ['Email', 'Nom'];
      const bindings: ImportFieldKey[] = ['email', 'lastname'];
      const rows = [['', 'Dupont'], ['', 'Martin']];
      const analysis = analyzeContactImportDataset(headers, bindings, rows);
      expect(analysis.issues.some((i) => i.code === 'empty_mapped_column')).toBe(true);
      expect(analysis.invalidRowCount).toBe(2);
    });

    it('detects duplicate emails in file', () => {
      const headers = ['Email', 'Nom'];
      const bindings: ImportFieldKey[] = ['email', 'lastname'];
      const rows = [
        ['dup@example.com', 'Dupont'],
        ['dup@example.com', 'Martin']
      ];
      const analysis = analyzeContactImportDataset(headers, bindings, rows);
      expect(analysis.duplicateEmails).toHaveLength(1);
      expect(analysis.duplicateEmails[0].rowNumbers).toEqual([1, 2]);
      expect(analysis.issues.some((i) => i.code === 'duplicate_emails_in_file')).toBe(true);
    });

    it('warns when a column looks like combined name', () => {
      const headers = ['Email', 'Identité'];
      const bindings: ImportFieldKey[] = ['email', 'firstname'];
      const rows = [
        ['a@b.com', 'Jean Dupont'],
        ['b@b.com', 'Marie Martin'],
        ['c@b.com', 'Paul Durand']
      ];
      const analysis = analyzeContactImportDataset(headers, bindings, rows);
      expect(analysis.issues.some((i) => i.code === 'combined_name_column')).toBe(true);
    });
  });

  describe('buildContactImportBag', () => {
    it('enriches firstname and lastname from fullName mapping', () => {
      const bindings: ImportFieldKey[] = ['fullName', 'email'];
      const row = ['Jean Dupont', 'jean@example.com'];
      const bag = buildContactImportBag(row, bindings);
      expect(bag.firstname).toBe('Jean');
      expect(bag.lastname).toBe('Dupont');
    });

    it('enriches from fullName with lastname-firstname order', () => {
      const bindings: ImportFieldKey[] = ['fullName', 'email'];
      const row = ['Dupont Jean', 'jean@example.com'];
      const bag = buildContactImportBag(row, bindings, undefined, {
        fullNameOrder: 'lastname-firstname'
      });
      expect(bag.firstname).toBe('Jean');
      expect(bag.lastname).toBe('Dupont');
    });
  });
});
