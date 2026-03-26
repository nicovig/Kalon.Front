import { IMPORT_FIELD_OPTIONS, ImportFieldKey } from './import-field.model';

export type CombinedImportFieldKey =
  | ImportFieldKey
  | 'donationDate'
  | 'donationAmount'
  | 'donationType'
  | 'paymentMethod';

export const COMBINED_IMPORT_OPTIONS: { key: CombinedImportFieldKey; label: string }[] = [
  ...IMPORT_FIELD_OPTIONS,
  { key: 'donationDate', label: 'Date du don' },
  { key: 'donationAmount', label: 'Montant du don (€)' },
  { key: 'donationType', label: 'Type de don' },
  { key: 'paymentMethod', label: 'Moyen de paiement' }
];
