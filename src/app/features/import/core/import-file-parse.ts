import * as XLSX from 'xlsx';
import { detectHeaderRowIndex } from './import-column-guess';

function trimMatrix(m: string[][]): string[][] {
  return m.map((row) => row.map((c) => (c == null ? '' : String(c)).trim()));
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && ch === delimiter) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function detectDelimiterFromLine(line: string): string {
  let commas = 0;
  let semis = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '"' && line[j + 1] === '"') {
          j += 2;
          continue;
        }
        if (line[j] === '"') {
          i = j;
          break;
        }
        j++;
      }
      continue;
    }
    if (ch === ',') {
      commas++;
    }
    if (ch === ';') {
      semis++;
    }
  }
  return semis > commas ? ';' : ',';
}

export function parseCsvText(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, '');
  const lines = normalized.split(/\r?\n/).filter((l) => l.length > 0);
  if (!lines.length) {
    return [];
  }
  const delim = detectDelimiterFromLine(lines[0]);
  return lines.map((line) => parseCsvLine(line, delim));
}

function padRow(row: string[], len: number): string[] {
  const r = [...row];
  while (r.length < len) {
    r.push('');
  }
  return r.slice(0, len);
}

export function resolveExcelSheetName(sheetNames: string[], preferredSheetName?: string): string {
  if (!sheetNames.length) {
    throw new Error('Excel workbook has no sheets');
  }
  if (preferredSheetName && sheetNames.includes(preferredSheetName)) {
    return preferredSheetName;
  }
  return sheetNames[0];
}

export function matrixFromExcelSheet(workbook: XLSX.WorkBook, sheetName: string): string[][] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return [];
  }
  const raw = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false
  }) as unknown[][];
  return trimMatrix(
    raw.map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? '')) : []))
  );
}

export function parseImportMatrix(
  matrix: string[][],
  sheetName?: string
): {
  headers: string[];
  rows: string[][];
  sheetName?: string;
} {
  if (!matrix.length) {
    return { headers: [], rows: [], sheetName };
  }

  const headerIdx = detectHeaderRowIndex(matrix);
  const headers = matrix[headerIdx].map((h) => String(h ?? ''));
  const colCount = Math.max(headers.length, 1);
  const body = matrix
    .slice(headerIdx + 1)
    .filter((row) => row.some((c) => String(c ?? '').trim().length > 0))
    .map((row) => padRow(row.map((c) => String(c ?? '')), colCount));

  return {
    headers,
    rows: body,
    sheetName
  };
}

export async function parseImportFile(
  file: File,
  preferredSheetName?: string
): Promise<{
  headers: string[];
  rows: string[][];
  sheetName?: string;
  sheetNames?: string[];
}> {
  const name = file.name.toLowerCase();
  const isCsv = name.endsWith('.csv') || file.type === 'text/csv';

  if (isCsv) {
    const text = await file.text();
    const parsed = parseImportMatrix(trimMatrix(parseCsvText(text)));
    return parsed;
  }

  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const sheetNameOut = resolveExcelSheetName(sheetNames, preferredSheetName);
  const matrix = matrixFromExcelSheet(workbook, sheetNameOut);
  const parsed = parseImportMatrix(matrix, sheetNameOut);
  return {
    ...parsed,
    sheetNames
  };
}
