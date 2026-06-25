import { ImportMode } from './model/import-mode.model';

export type ImportBusinessRuleSection = {
  title: string;
  items: string[];
};

const FILE_RULES: ImportBusinessRuleSection[] = [
  {
    title: 'Fichier et feuilles Excel',
    items: [
      'Les fichiers CSV n’ont qu’un seul onglet de données.',
      'Pour un Excel multi-feuilles, seule la feuille sélectionnée est importée — vérifiez le sélecteur « Feuille Excel » si vos données ne s’affichent pas.',
      'Kalon détecte automatiquement la ligne d’en-têtes (première ligne contenant des libellés de colonnes).',
      'Les lignes entièrement vides sont ignorées.'
    ]
  },
  {
    title: 'Mapping des colonnes',
    items: [
      'Chaque champ Kalon ne doit être relié qu’à une seule colonne du fichier.',
      'Si deux colonnes pointent vers le même champ Kalon, l’import est bloqué.',
      'Pour l’aperçu uniquement, lorsqu’un doublon de mapping subsiste temporairement, c’est la colonne la plus à droite qui est utilisée.',
      'Une colonne mappée mais entièrement vide bloque l’import ; une colonne presque vide affiche un avertissement.'
    ]
  }
];

const CONTACT_RULES: ImportBusinessRuleSection[] = [
  {
    title: 'Profils — champs obligatoires',
    items: [
      'Chaque ligne doit avoir un moyen de contact : email valide ou adresse postale complète.',
      'Adresse postale acceptée : ligne d’adresse (≥ 8 caractères) ou rue + code postal et/ou ville.',
      'Chaque particulier doit avoir un nom ou un prénom (ou les deux).',
      'Chaque entreprise doit avoir : nom, SIRET, et nom ou prénom du contact.'
    ]
  },
  {
    title: 'Nom et prénom sur une seule colonne',
    items: [
      'Reliez la colonne à « Nom et prénom » si les deux sont dans la même cellule.',
      'Indiquez l’ordre : « Prénom Nom » (Jean Dupont) ou « Nom Prénom » (Dupont Jean).',
      'Les prénoms ou noms composés avec un tiret (Jean-Michel, Dupont-Martin) sont conservés tels quels.',
      'Si une colonne prénom ou nom seule contient les deux, le même sélecteur d’ordre s’applique.'
    ]
  },
  {
    title: 'Adresse postale',
    items: [
      'Une adresse peut être sur une seule colonne (« Adresse tout en une colonne ») ou répartie (rue, CP, ville).',
      'Si une colonne ressemble à une adresse complète mais est mappée sur « Rue » seule, Kalon vous le signale.'
    ]
  },
  {
    title: 'Doublons et mise à jour',
    items: [
      'Même email dans le fichier : la dernière ligne l’emporte à l’import.',
      'Même prénom + nom + adresse dans le fichier : signalé en avertissement.',
      'Profil existant avec le même email : mise à jour du profil.',
      'Sans email : recherche d’un profil existant par prénom + nom + adresse (normalisation casse/accents) ; mise à jour si trouvé, sinon création.'
    ]
  }
];

const DONATION_RULES: ImportBusinessRuleSection[] = [
  {
    title: 'Contributions — champs obligatoires',
    items: [
      'Chaque ligne doit avoir une date de contribution valide et un montant > 0 (don financier).',
      'Un lien vers un profil Kalon est requis : email du profil ou nom/prénom reconnu en base.',
      'Le profil doit déjà exister dans Kalon au moment de l’import des contributions.'
    ]
  },
  {
    title: 'Types et montants',
    items: [
      'Don en nature ou mécénat : le montant peut être 0 ou absent.',
      'Les dates et montants sont interprétés selon les formats courants (JJ/MM/AAAA, virgule ou point décimal).'
    ]
  }
];

const COMBINED_EXTRA: ImportBusinessRuleSection[] = [
  {
    title: 'Import combiné profils + contributions',
    items: [
      'Les règles profils s’appliquent d’abord : une ligne sans contact valide est ignorée.',
      'Si date et montant de contribution sont présents sur la même ligne, la contribution est associée au profil importé ou mis à jour.',
      'Contribution invalide (date ou montant) : le profil peut quand même être importé sans la contribution.'
    ]
  }
];

export function getImportBusinessRules(mode: ImportMode): ImportBusinessRuleSection[] {
  const sections: ImportBusinessRuleSection[] = [...FILE_RULES];

  if (mode === 'contacts' || mode === 'combined') {
    sections.push(...CONTACT_RULES);
  }
  if (mode === 'donations' || mode === 'combined') {
    sections.push(...DONATION_RULES);
  }
  if (mode === 'combined') {
    sections.push(...COMBINED_EXTRA);
  }
  if (mode === 'default') {
    sections.push(...CONTACT_RULES, ...DONATION_RULES);
  }

  return sections;
}
