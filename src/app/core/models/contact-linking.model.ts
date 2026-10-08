export type ContactLinkingMode = 'none' | 'same_id' | 'same_address' | 'manual';

export const CONTACT_LINKING_MODE_OPTIONS: ReadonlyArray<{
  value: ContactLinkingMode;
  label: string;
  hint: string;
}> = [
  {
    value: 'none',
    label: 'Désactivé',
    hint: 'Aucun lien entre profils (comportement classique).'
  },
  {
    value: 'same_id',
    label: 'Même identifiant',
    hint: 'Les profils partageant la même valeur d’identifiant sont liés (ex. n° adhérent famille).'
  },
  {
    value: 'same_address',
    label: 'Même adresse',
    hint: 'Les profils avec la même rue et le même code postal sont liés.'
  },
  {
    value: 'manual',
    label: 'Manuel',
    hint: 'Vous définissez vous-même les liens parent / enfants à l’import et dans Kalon.'
  }
];

export function normalizeContactLinkingMode(value: unknown): ContactLinkingMode {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'same_id' || raw === 'same_address' || raw === 'manual') {
    return raw;
  }
  return 'none';
}
