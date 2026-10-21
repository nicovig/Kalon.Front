import { ImportMode } from './model/import-mode.model';

export type ImportBusinessRuleSection = {
  title: string;
  items: string[];
};

const FILE_RULES: ImportBusinessRuleSection[] = [
  {
    title: 'Votre fichier Excel ou CSV',
    items: [
      'Un fichier CSV contient une seule liste de données.',
      'Si votre Excel a plusieurs onglets, choisissez celui qui contient vos profils avec le sélecteur « Feuille Excel ».',
      'Kalon repère tout seul la ligne des titres de colonnes (Nom, Email, etc.).',
      'Les lignes complètement vides sont laissées de côté.'
    ]
  },
  {
    title: 'Relier vos colonnes à Kalon',
    items: [
      'Chaque information Kalon (nom, email, téléphone…) ne doit venir que d’une seule colonne de votre fichier.',
      'Si deux colonnes pointent vers la même information, l’import s’arrête pour vous laisser corriger.',
      'Dans l’aperçu, si un doublon reste un moment, Kalon utilise la colonne la plus à droite du fichier.',
      'Une colonne reliée mais totalement vide bloque l’import ; une colonne presque vide affiche un avertissement.'
    ]
  }
];

const CONTACT_RULES: ImportBusinessRuleSection[] = [
  {
    title: 'Ce qu’il faut pour chaque profil',
    items: [
      'Pour un particulier : prénom et nom sont obligatoires.',
      'Pour une entreprise : la raison sociale est obligatoire.',
      'Email, téléphone, adresse et SIRET restent optionnels.',
      'Adresse acceptée si renseignée : tout sur une ligne, ou rue + code postal et/ou ville.'
    ]
  },
  {
    title: 'Nom et prénom dans la même case',
    items: [
      'Si nom et prénom sont collés dans une seule colonne, reliez-la à « Nom et prénom ».',
      'Indiquez l’ordre utilisé dans le fichier : « Prénom Nom » (Jean Dupont) ou « Nom Prénom » (Dupont Jean).',
      'Kalon retire alors le prénom du nom (et inversement) pour ne garder que la bonne information dans chaque champ.',
      'Les prénoms ou noms avec un tiret (Jean-Michel, Dupont-Martin) restent tels quels.'
    ]
  },
  {
    title: 'Adresse postale',
    items: [
      'L’adresse peut être dans une seule colonne, ou découpée (rue, code postal, ville).',
      'Si une colonne ressemble à une adresse complète mais est reliée seulement à « Rue », Kalon vous le signale.'
    ]
  },
  {
    title: 'Doublons et mises à jour',
    items: [
      'Si le même email apparaît plusieurs fois dans le fichier, c’est la dernière ligne qui sera prise en compte.',
      'Un email vide ou du type « non renseigné » n’est pas un doublon : chaque ligne est traitée à part.',
      'Même prénom + nom + adresse dans le fichier : Kalon vous prévient avant d’importer.',
      'Si un profil avec le même email existe déjà dans Kalon, il est mis à jour.',
      'Sans email : Kalon cherche un profil existant avec le même nom et la même adresse ; s’il le trouve, il le met à jour, sinon il en crée un nouveau.'
    ]
  },
  {
    title: 'Adhésion et tags',
    items: [
      'Adhésion familiale : indiquez oui ou non.',
      'Dates de début et de fin d’adhésion : formats courants du type 01/01/2024 ; ces champs sont facultatifs.',
      'Tag : reliez une colonne (type, nature, état d’adhésion…). Avant l’import, Kalon propose de créer ou renommer les valeurs détectées.',
      'Plusieurs tags dans une même case restent possibles s’ils sont séparés par une virgule ou un point-virgule.'
    ]
  }
];

const DONATION_RULES: ImportBusinessRuleSection[] = [
  {
    title: 'Ce qu’il faut pour chaque contribution',
    items: [
      'Chaque ligne doit avoir une date valide et, pour un don d’argent, un montant supérieur à 0.',
      'Il faut pouvoir retrouver le profil dans Kalon (souvent via l’email, parfois le nom/prénom).',
      'Le profil doit déjà exister dans Kalon avant d’importer les contributions seules.'
    ]
  },
  {
    title: 'Types et montants',
    items: [
      'Don en nature ou mécénat : le montant peut être 0 ou absent.',
      'Les dates et montants sont lus dans les formats courants (JJ/MM/AAAA, virgule ou point pour les décimales).'
    ]
  }
];

const COMBINED_EXTRA: ImportBusinessRuleSection[] = [
  {
    title: 'Profils et contributions sur la même ligne',
    items: [
      'Les règles des profils s’appliquent d’abord : une ligne sans contact valide est ignorée.',
      'Si date et montant sont présents sur la même ligne, la contribution est liée au profil créé ou mis à jour.',
      'Si la contribution est invalide (date ou montant), le profil peut quand même être importé sans elle.'
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
