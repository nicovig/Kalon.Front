import { IMPORT_FIELD_OPTIONS, ImportFieldKey } from './import-field.model';

export type CombinedImportFieldKey =
  | ImportFieldKey
  | 'donationDate'
  | 'donationAmount'
  | 'donationType'
  | 'paymentMethod';

export const COMBINED_IMPORT_OPTIONS: { key: CombinedImportFieldKey; label: string }[] = [
  ...IMPORT_FIELD_OPTIONS,
  { key: 'donationDate', label: 'Date de la contribution' },
  { key: 'donationAmount', label: 'Montant de la contribution (€)' },
  { key: 'donationType', label: 'Type de contribution' },
  { key: 'paymentMethod', label: 'Moyen de paiement' }
];
