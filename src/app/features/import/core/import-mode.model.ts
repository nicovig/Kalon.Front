export type ImportMode = 'donors' | 'donations' | 'combined';

export const IMPORT_MODE_OPTIONS: {
  mode: ImportMode;
  label: string;
  hint: string;
  blurb: string;
}[] = [
  {
    mode: 'donors',
    label: 'Donateurs',
    hint: 'Fiche contact : noms, emails, adresses…',
    blurb: 'Importer ou mettre à jour des fiches contact.'
  },
  {
    mode: 'donations',
    label: 'Dons',
    hint: 'Montants et dates, liés à un donateur existant par email',
    blurb: 'Enregistrer des dons : le donateur doit déjà exister (reconnu par email).'
  },
  {
    mode: 'combined',
    label: 'Les deux',
    hint: 'Une ligne = contact éventuellement avec un don',
    blurb: 'Un même fichier : chaque ligne peut créer le contact et le don associé.'
  }
];

export const IMPORT_MODE_ORDER: ImportMode[] = ['donors', 'donations', 'combined'];
