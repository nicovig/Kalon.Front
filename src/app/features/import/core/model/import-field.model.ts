export type ImportFieldKey =
  | 'skip'
  | 'enterpriseName'
  | 'siret'
  | 'legalForm'
  | 'supportKind'
  | 'contactFirstname'
  | 'contactLastname'
  | 'lastname'
  | 'firstname'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'jobTitle'
  | 'birthDate'
  | 'gender'
  | 'out'
  | 'preferredFrequencySendingReceipt'
  | 'isFamilyMembership'
  | 'lastMembershipDate'
  | 'membershipEndDate'
  | 'tags'
  | 'addressLine'
  | 'street'
  | 'postalCode'
  | 'city'
  | 'country';

export const IMPORT_FIELD_OPTIONS: { key: ImportFieldKey; label: string }[] = [
  { key: 'skip', label: '- Ignorer -' },
  { key: 'enterpriseName', label: 'Entreprise - Raison sociale' },
  { key: 'siret', label: 'Entreprise - SIRET' },
  { key: 'legalForm', label: 'Entreprise - Forme juridique (SARL, SASU, ...)' },
  { key: 'supportKind', label: 'Entreprise - Type de soutien (mecenat, sponsoring, ...)' },
  { key: 'contactLastname', label: 'Entreprise - Nom contact' },
  { key: 'contactFirstname', label: 'Entreprise - Prénom contact' },
  { key: 'lastname', label: 'Particulier - Nom' },
  { key: 'firstname', label: 'Particulier - Prénom' },
  { key: 'fullName', label: 'Particulier - Nom et prénom' },
  { key: 'email', label: 'Particulier - Email' },
  { key: 'phone', label: 'Particulier - Téléphone' },
  { key: 'jobTitle', label: 'Particulier - Métier' },
  { key: 'birthDate', label: 'Particulier - Date de naissance' },
  { key: 'gender', label: 'Particulier - Genre' },
  { key: 'out', label: 'Particulier - Sorti (décédé)' },
  { key: 'preferredFrequencySendingReceipt', label: 'Particulier - Fréquence d\'envoi des reçus fiscaux' },
  { key: 'isFamilyMembership', label: 'Particulier - Adhésion familiale (oui/non)' },
  { key: 'lastMembershipDate', label: 'Particulier - Date de début d’adhésion' },
  { key: 'membershipEndDate', label: 'Particulier - Date de fin d’adhésion' },
  { key: 'tags', label: 'Particulier - Tags (séparés par , ou ;)' },
  { key: 'addressLine', label: 'Particulier - Adresse (tout en une colonne)' },
  { key: 'street', label: 'Particulier - Rue / voie' },
  { key: 'postalCode', label: 'Particulier - Code postal' },
  { key: 'city', label: 'Particulier - Ville' },
  { key: 'country', label: 'Particulier - Pays' }
];
