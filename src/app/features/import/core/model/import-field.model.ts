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
  | 'jobTitle'
  | 'birthDate'
  | 'gender'
  | 'out'
  | 'preferredFrequencySendingReceipt'
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
  { key: 'jobTitle', label: 'Profil - Métier' },
  { key: 'birthDate', label: 'Profil - Date de naissance' },
  { key: 'gender', label: 'Profil - Genre' },
  { key: 'out', label: 'Profil - Sorti / Décédé (out)' },
  { key: 'preferredFrequencySendingReceipt', label: 'Profil - Fréquence d\'envoi des reçus fiscaux' },
  { key: 'addressLine', label: 'Particulier - Adresse (tout en une colonne)' },
  { key: 'street', label: 'Particulier - Rue / voie' },
  { key: 'postalCode', label: 'Particulier - Code postal' },
  { key: 'city', label: 'Particulier - Ville' },
  { key: 'country', label: 'Particulier - Pays' }
];
