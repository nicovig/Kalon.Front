export type ImportMode = 'contacts' | 'donations' | 'combined' | 'default';

export const IMPORT_MODE_OPTIONS: {
  mode: ImportMode;
  label: string;
  hint: string;
  blurb: string;
}[] = [
  {
    mode: 'contacts',
    label: 'Profils',
    hint: 'Fiche profil : noms, emails, adresses…',
    blurb: 'Importer ou mettre à jour des fiches profil.'
  },
  {
    mode: 'donations',
    label: 'Dons',
    hint: 'Montants et dates, liés à un profil (lien fait avec l\'email)',
    blurb: 'Enregistrer des dons : le profil doit déjà exister (reconnu par email).'
  },
  {
    mode: 'combined',
    label: 'Les deux',
    hint: 'Une ligne = profil éventuellement avec un don',
    blurb: 'Un même fichier : chaque ligne peut créer le profil et le don associé.'
  }
];

export const IMPORT_MODE_ORDER: ImportMode[] = ['contacts', 'donations', 'combined'];
