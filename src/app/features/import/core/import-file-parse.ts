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

export async function parseImportFile(file: File): Promise<{
  headers: string[];
  rows: string[][];
  sheetName?: string;
}> {
  const name = file.name.toLowerCase();
  const isCsv = name.endsWith('.csv') || file.type === 'text/csv';

  let matrix: string[][];
  let sheetNameOut: string | undefined;

  if (isCsv) {
    const text = await file.text();
    matrix = trimMatrix(parseCsvText(text));
  } else {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    sheetNameOut = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetNameOut];
    const raw = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false
    }) as unknown[][];
    matrix = trimMatrix(
      raw.map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? '')) : []))
    );
  }

  if (!matrix.length) {
    return { headers: [], rows: [] };
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
    sheetName: sheetNameOut
  };
}
