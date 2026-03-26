export type DonationImportFieldKey =
  | 'skip'
  | 'donationDate'
  | 'donationAmount'
  | 'donationType'
  | 'contactEmail'
  | 'paymentMethod';

export const DONATION_IMPORT_FIELD_OPTIONS: { key: DonationImportFieldKey; label: string }[] = [
  { key: 'skip', label: '— Ignorer —' },
  { key: 'donationDate', label: 'Date du don' },
  { key: 'donationAmount', label: 'Montant (€)' },
  { key: 'donationType', label: 'Type de don' },
  { key: 'contactEmail', label: 'Email du profil (lien)' },
  { key: 'paymentMethod', label: 'Moyen de paiement' }
];
