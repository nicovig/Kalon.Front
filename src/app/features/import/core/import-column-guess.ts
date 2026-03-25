import { ImportFieldKey } from './model/import-field.model';

export function normalizeHeaderLabel(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim();
}

type Rule = { field: ImportFieldKey; weight: number; test: (n: string) => boolean };

const RULES: Rule[] = [
  {
    field: 'email',
    weight: 10,
    test: (n) =>
      /\bemail\b/.test(n) ||
      /\bmail\b/.test(n) ||
      /\bcourriel\b/.test(n) ||
      /\be[\s-]?mail\b/.test(n)
  },
  {
    field: 'enterpriseName',
    weight: 9,
    test: (n) =>
      /\bentreprise\b/.test(n) ||
      /\braison\s*sociale\b/.test(n) ||
      /\bsociete\b/.test(n) ||
      /\bsociete\s+anonyme\b/.test(n) ||
      /\bnom\s+entreprise\b/.test(n)
  },
  {
    field: 'siret',
    weight: 10,
    test: (n) =>
      /\bsiret\b/.test(n) ||
      /\bsir[eè]t\b/.test(n) ||
      /\bnum[eé]ro\s*siret\b/.test(n)
  },
  {
    field: 'contactLastname',
    weight: 8,
    test: (n) =>
      /\bnom\b/.test(n) && (/\bcontact\b/.test(n) || /\binterlocuteur\b/.test(n) || /\bresponsable\b/.test(n))
  },
  {
    field: 'contactFirstname',
    weight: 8,
    test: (n) =>
      /\bprenom\b/.test(n) && (/\bcontact\b/.test(n) || /\binterlocuteur\b/.test(n) || /\bresponsable\b/.test(n))
  },
  {
    field: 'phone',
    weight: 10,
    test: (n) =>
      /\btel\b/.test(n) ||
      /\btelephone\b/.test(n) ||
      /\bmobile\b/.test(n) ||
      /\bportable\b/.test(n) ||
      /\bfixe\b/.test(n)
  },
  {
    field: 'jobTitle',
    weight: 7,
    test: (n) =>
      /\bmetier\b/.test(n) ||
      /\bprofession\b/.test(n) ||
      /\bjob\b/.test(n) ||
      /\bfacon\b/.test(n) ||
      /\bfonction\b/.test(n)
  },
  {
    field: 'birthDate',
    weight: 10,
    test: (n) =>
      /\bnaissance\b/.test(n) ||
      /\bbirth\b/.test(n) ||
      /\bdob\b/.test(n) ||
      (/\bdate\b/.test(n) && /\bnaiss\b/.test(n))
  },
  {
    field: 'gender',
    weight: 8,
    test: (n) => /\bgenre\b/.test(n) || /\bsexe\b/.test(n) || /\bgender\b/.test(n)
  },
  {
    field: 'out',
    weight: 6,
    test: (n) =>
      /\bout\b/.test(n) || /\bdeces\b/.test(n) || /\bdec[eé]s\b/.test(n) || /\bdecede\b/.test(n) || /\bmort\b/.test(n)
  },
  {
    field: 'preferredFrequencySendingReceipt',
    weight: 6,
    test: (n) =>
      (/\brecus\b/.test(n) && /\bfr[ei]quence\b/.test(n)) ||
      /\bmensuel\b/.test(n) ||
      /\btrimestriel\b/.test(n) ||
      /\bsemestriel\b/.test(n) ||
      /\bannuel\b/.test(n) ||
      /\bquarterly\b/.test(n) ||
      /\bmonthly\b/.test(n) ||
      /\byearly\b/.test(n)
  },
  {
    field: 'lastname',
    weight: 9,
    test: (n) =>
      /^nom$/.test(n) ||
      (/^nom\b/.test(n) && !/\bprenom\b/.test(n) && !/nom de jeune fille/.test(n)) ||
      /\blast\s*name\b/.test(n) ||
      /\bsurname\b/.test(n) ||
      (/\bname\b/.test(n) && !/first|given|prenom|company|social/.test(n))
  },
  {
    field: 'firstname',
    weight: 9,
    test: (n) =>
      /\bprenom\b/.test(n) ||
      /\bfirst\s*name\b/.test(n) ||
      /\bgiven\s*name\b/.test(n) ||
      /\bprenom\b/.test(n)
  },
  {
    field: 'postalCode',
    weight: 8,
    test: (n) =>
      /\bcp\b/.test(n) ||
      /\bcode\s*postal\b/.test(n) ||
      /\bpostal\b/.test(n) ||
      /\bzip\b/.test(n)
  },
  {
    field: 'city',
    weight: 8,
    test: (n) =>
      /\bville\b/.test(n) ||
      /\bcity\b/.test(n) ||
      /\blocalite\b/.test(n) ||
      /\bcommune\b/.test(n)
  },
  {
    field: 'street',
    weight: 7,
    test: (n) =>
      /\brue\b/.test(n) ||
      /\bvoie\b/.test(n) ||
      /\badresse\s*1\b/.test(n) ||
      /\bligne\s*1\b/.test(n) ||
      /\bstreet\b/.test(n) ||
      (/\badresse\b/.test(n) && !/\bcode\b/.test(n) && !/\bville\b/.test(n))
  },
  {
    field: 'addressLine',
    weight: 6,
    test: (n) =>
      /\badresse\b/.test(n) ||
      /\baddress\b/.test(n) ||
      /\blieu\s*dit\b/.test(n)
  },
  {
    field: 'country',
    weight: 5,
    test: (n) => /\bpays\b/.test(n) || /\bcountry\b/.test(n)
  }
];

export function guessFieldForHeader(headerCell: string): ImportFieldKey {
  const n = normalizeHeaderLabel(headerCell);
  if (!n) {
    return 'skip';
  }
  let best: ImportFieldKey = 'skip';
  let bestW = 0;
  for (const r of RULES) {
    if (r.test(n) && r.weight > bestW) {
      bestW = r.weight;
      best = r.field;
    }
  }
  return best;
}

export function guessMappingForHeaders(headers: string[]): ImportFieldKey[] {
  const raw = headers.map((h) => guessFieldForHeader(h));
  const used = new Set<ImportFieldKey>();
  used.add('skip');
  const out = [...raw];
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < out.length; i++) {
      const f = out[i];
      if (f === 'skip') {
        continue;
      }
      if (used.has(f)) {
        out[i] = 'skip';
      } else {
        used.add(f);
      }
    }
  }
  return out;
}

export function headerRowScore(row: string[]): number {
  let s = 0;
  for (const cell of row) {
    const g = guessFieldForHeader(String(cell ?? ''));
    if (g !== 'skip') {
      s += 3;
    } else {
      const t = normalizeHeaderLabel(String(cell ?? ''));
      if (t.length >= 2) {
        s += 0.2;
      }
    }
  }
  return s;
}

export function detectHeaderRowIndex(matrix: string[][], maxScan = 30): number {
  if (!matrix.length) {
    return 0;
  }
  let best = 0;
  let bestScore = -1;
  const limit = Math.min(maxScan, matrix.length);
  for (let i = 0; i < limit; i++) {
    const row = matrix[i].map((c) => String(c ?? ''));
    const score = headerRowScore(row);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (bestScore < 1 && matrix.length > 1) {
    return 0;
  }
  return best;
}
