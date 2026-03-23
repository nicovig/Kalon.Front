import { IMPORT_FIELD_OPTIONS, ImportFieldKey } from './import-field.model';

export type CombinedImportFieldKey = ImportFieldKey | 'donationDate' | 'donationAmount';

export const COMBINED_IMPORT_OPTIONS: { key: CombinedImportFieldKey; label: string }[] = [
  ...IMPORT_FIELD_OPTIONS,
  { key: 'donationDate', label: 'Date du don' },
  { key: 'donationAmount', label: 'Montant du don (€)' }
];
