export type ImportFieldKey =
  | 'skip'
  | 'enterpriseName'
  | 'siret'
  | 'contactFirstname'
  | 'contactLastname'
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
  { key: 'enterpriseName', label: 'Entreprise - Raison sociale' },
  { key: 'siret', label: 'Entreprise - SIRET' },
  { key: 'contactLastname', label: 'Entreprise - Nom contact' },
  { key: 'contactFirstname', label: 'Entreprise - Prénom contact' },
  { key: 'lastname', label: 'Particulier - Nom' },
  { key: 'firstname', label: 'Particulier - Prénom' },
  { key: 'email', label: 'Particulier - Email' },
  { key: 'phone', label: 'Particulier - Téléphone' },
  { key: 'addressLine', label: 'Particulier - Adresse (tout en une colonne)' },
  { key: 'street', label: 'Particulier - Rue / voie' },
  { key: 'postalCode', label: 'Particulier - Code postal' },
  { key: 'city', label: 'Particulier - Ville' },
  { key: 'country', label: 'Particulier - Pays' }
];
