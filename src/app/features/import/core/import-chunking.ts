import type { NewContactInput } from '../../contact/contact.store';

export const IMPORT_CONTACT_CHUNK_SIZE = 200;

export function chunkArray<T>(items: T[], size: number = IMPORT_CONTACT_CHUNK_SIZE): T[][] {
  const chunkSize = Math.max(1, Math.floor(size));
  if (!items.length) {
    return [];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export function computeImportProgressPercent(processed: number, total: number): number {
  if (total <= 0) {
    return 100;
  }
  const safeProcessed = Math.max(0, Math.min(processed, total));
  return Math.round((safeProcessed / total) * 100);
}

export type PreparedContactImportRow = {
  index: number;
  input: NewContactInput;
  existingId?: string;
};

export function splitPreparedContactChunk(chunk: PreparedContactImportRow[]): {
  creates: NewContactInput[];
  updates: Array<{ id: string; input: NewContactInput }>;
  entries: Array<{ index: number; input: NewContactInput }>;
  childIndexSet: Set<number>;
} {
  const creates: NewContactInput[] = [];
  const updates: Array<{ id: string; input: NewContactInput }> = [];
  const entries: Array<{ index: number; input: NewContactInput }> = [];
  const childIndexSet = new Set<number>();

  for (const row of chunk) {
    entries.push({ index: row.index, input: row.input });
    childIndexSet.add(row.index);
    if (row.existingId) {
      updates.push({ id: row.existingId, input: row.input });
    } else {
      creates.push(row.input);
    }
  }

  return { creates, updates, entries, childIndexSet };
}
