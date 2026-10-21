import { parseTagNamesFromCell } from './import-row-to-contact';
import type { ImportFieldKey } from './model/import-field.model';

export type ImportTagMappingDraft = {
  sourceValue: string;
  kalonName: string;
  alreadyExists: boolean;
};

export function collectUniqueTagValuesFromRows(
  rows: string[][],
  columnIndex: number
): string[] {
  if (columnIndex < 0) {
    return [];
  }
  const seen = new Set<string>();
  const values: string[] = [];
  for (const row of rows) {
    const parts = parseTagNamesFromCell(String(row[columnIndex] ?? ''));
    for (const part of parts) {
      const key = part.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(part);
    }
  }
  return values.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

export function findTagsColumnIndex(bindings: string[]): number {
  return bindings.findIndex((b) => b === ('tags' as ImportFieldKey));
}

export function buildImportTagMappingDrafts(
  sourceValues: string[],
  findExistingName: (name: string) => string | undefined
): ImportTagMappingDraft[] {
  return sourceValues.map((sourceValue) => {
    const existing = findExistingName(sourceValue);
    return {
      sourceValue,
      kalonName: existing ?? sourceValue,
      alreadyExists: Boolean(existing)
    };
  });
}

export function applyTagRenameMap(tagNames: string[], renameMap: Record<string, string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tagNames) {
    const mapped = (renameMap[raw] ?? renameMap[raw.toLowerCase()] ?? raw).trim();
    if (!mapped) continue;
    const key = mapped.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(mapped);
  }
  return out;
}

export function buildTagRenameMap(drafts: ImportTagMappingDraft[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const draft of drafts) {
    const source = draft.sourceValue.trim();
    const kalon = draft.kalonName.trim() || source;
    if (!source) continue;
    map[source] = kalon;
    map[source.toLowerCase()] = kalon;
  }
  return map;
}
