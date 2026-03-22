export type DonationImportFieldKey =
  | 'skip'
  | 'donationDate'
  | 'donationAmount'
  | 'donorEmail';

export const DONATION_IMPORT_FIELD_OPTIONS: { key: DonationImportFieldKey; label: string }[] = [
  { key: 'skip', label: '— Ignorer —' },
  { key: 'donationDate', label: 'Date du don' },
  { key: 'donationAmount', label: 'Montant (€)' },
  { key: 'donorEmail', label: 'Email du donateur (lien)' }
];
