import {
  analyzeContactImportDataset,
  assessContactImportRowSkipReason,
  buildContactImportBag,
  contactsImportMappingReady,
  hasReachableChannel,
  needsCombinedNameOrderChoice,
  splitFullNameCell
} from './import-contact-validation';
import type { ImportFieldKey } from './model/import-field.model';

describe('import-contact-validation', () => {
  describe('splitFullNameCell', () => {
    it('splits firstname and lastname from a combined cell', () => {
      expect(splitFullNameCell('Jean Dupont')).toEqual({
        firstname: 'Jean',
        lastname: 'Dupont'
      });
      expect(splitFullNameCell('Jean-Michel Dupont')).toEqual({
        firstname: 'Jean-Michel',
        lastname: 'Dupont'
      });
      expect(splitFullNameCell('Anne-Sophie Martin')).toEqual({
        firstname: 'Anne-Sophie',
        lastname: 'Martin'
      });
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
    it('accepts person identity (separate, combined, or single name column) or enterprise name', () => {
      expect(contactsImportMappingReady(['firstname', 'lastname'])).toBe(true);
      expect(contactsImportMappingReady(['fullName'])).toBe(true);
      expect(contactsImportMappingReady(['enterpriseName'])).toBe(true);
      expect(contactsImportMappingReady(['email', 'lastname'])).toBe(true);
      expect(contactsImportMappingReady(['firstname'])).toBe(true);
      expect(contactsImportMappingReady(['email'])).toBe(false);
      expect(contactsImportMappingReady(['mobilePhone', 'street'])).toBe(false);
    });
  });

  describe('assessContactImportRowSkipReason', () => {
    it('accepts person with firstname and lastname only', () => {
      expect(
        assessContactImportRowSkipReason({ firstname: 'Jean', lastname: 'Dupont' })
      ).toBeNull();
    });

    it('requires both firstname and lastname for individuals', () => {
      expect(
        assessContactImportRowSkipReason({
          email: 'jean@example.com',
          firstname: 'Jean'
        })
      ).toBe('Nom manquant');
      expect(
        assessContactImportRowSkipReason({
          email: 'jean@example.com',
          lastname: 'Dupont'
        })
      ).toBe('Prénom manquant');
      expect(
        assessContactImportRowSkipReason({
          email: 'jean@example.com'
        })
      ).toBe('Prénom manquant');
    });

    it('derives name from fullName column', () => {
      expect(
        assessContactImportRowSkipReason({
          fullName: 'Jean Dupont'
        })
      ).toBeNull();
    });

    it('requires enterprise name only for companies', () => {
      expect(
        assessContactImportRowSkipReason({
          enterpriseName: 'ACME'
        })
      ).toBeNull();
      expect(
        assessContactImportRowSkipReason({
          siret: '12345678901234'
        })
      ).toBe('Nom entreprise manquant');
    });
  });

  describe('analyzeContactImportDataset', () => {
    it('does not flag mapping_incomplete when a name column is mapped', () => {
      const headers = ['Email', 'Nom'];
      const bindings: ImportFieldKey[] = ['email', 'lastname'];
      const rows = [
        ['a@b.com', 'Dupont'],
        ['c@d.com', 'Martin']
      ];
      const analysis = analyzeContactImportDataset(headers, bindings, rows);
      expect(analysis.issues.some((issue) => issue.code === 'mapping_incomplete')).toBe(false);
    });

    it('flags mapping_incomplete when no identity column is mapped', () => {
      const headers = ['Email', 'Téléphone'];
      const bindings: ImportFieldKey[] = ['email', 'mobilePhone'];
      const rows = [
        ['a@b.com', '0600000000'],
        ['c@d.com', '0600000001']
      ];
      const analysis = analyzeContactImportDataset(headers, bindings, rows);
      expect(analysis.issues.some((issue) => issue.code === 'mapping_incomplete')).toBe(true);
    });

    it('accepts firstname+lastname mapping without email', () => {
      const headers = ['Prénom', 'Nom'];
      const bindings: ImportFieldKey[] = ['firstname', 'lastname'];
      const rows = [
        ['Jean', 'Dupont'],
        ['Marie', 'Martin']
      ];
      const analysis = analyzeContactImportDataset(headers, bindings, rows);
      expect(analysis.issues.some((issue) => issue.code === 'mapping_incomplete')).toBe(false);
      expect(analysis.validRowCount).toBe(2);
    });
  });

  describe('buildContactImportBag', () => {
    it('enriches firstname and lastname from fullName mapping', () => {
      const bindings: ImportFieldKey[] = ['fullName', 'email'];
      const bag = buildContactImportBag(['Jean Dupont', 'a@b.com'], bindings);
      expect(bag.firstname).toBe('Jean');
      expect(bag.lastname).toBe('Dupont');
    });

    it('enriches from fullName with lastname-firstname order', () => {
      const bindings: ImportFieldKey[] = ['fullName', 'email'];
      const bag = buildContactImportBag(['Dupont Jean', 'a@b.com'], bindings, undefined, {
        fullNameOrder: 'lastname-firstname'
      });
      expect(bag.firstname).toBe('Jean');
      expect(bag.lastname).toBe('Dupont');
    });

    it('strips firstname from lastname column when order is lastname-firstname', () => {
      const bindings: ImportFieldKey[] = ['lastname', 'firstname', 'email'];
      const bag = buildContactImportBag(['BAUDET FRANCINE', '', 'a@b.com'], bindings, undefined, {
        fullNameOrder: 'lastname-firstname'
      });
      expect(bag.lastname).toBe('BAUDET');
      expect(bag.firstname).toBe('FRANCINE');
    });

    it('splits lastname-only combined cell with lastname-firstname order', () => {
      const bindings: ImportFieldKey[] = ['lastname', 'email'];
      const bag = buildContactImportBag(['BAUDET FRANCINE', 'a@b.com'], bindings, undefined, {
        fullNameOrder: 'lastname-firstname'
      });
      expect(bag.lastname).toBe('BAUDET');
      expect(bag.firstname).toBe('FRANCINE');
    });
  });

  describe('needsCombinedNameOrderChoice', () => {
    it('detects fullName mapping', () => {
      expect(needsCombinedNameOrderChoice(['fullName', 'email'])).toBe(true);
      expect(needsCombinedNameOrderChoice(['firstname', 'lastname'])).toBe(false);
    });
  });
});
