export type ImportFieldKey =
  | 'skip'
  | 'lastname'
  | 'firstname'
  | 'email'
  | 'phone'
  | 'addressLine'
  | 'street'
  | 'postalCode'
  | 'city'
  | 'country';

export const IMPORT_FIELD_OPTIONS: { key: ImportFieldKey; label: string }[] = [
  { key: 'skip', label: '— Ignorer —' },
  { key: 'lastname', label: 'Nom' },
  { key: 'firstname', label: 'Prénom' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'addressLine', label: 'Adresse (tout en une colonne)' },
  { key: 'street', label: 'Rue / voie' },
  { key: 'postalCode', label: 'Code postal' },
  { key: 'city', label: 'Ville' },
  { key: 'country', label: 'Pays' }
];
