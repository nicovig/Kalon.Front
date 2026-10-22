import {
  buildImportPersistSteps,
  chunkArray,
  computeImportProgressPercent,
  IMPORT_CONTACT_CHUNK_SIZE,
  IMPORT_PROGRESS_BATCH_SIZE,
  splitPreparedContactChunk,
  type PreparedContactImportRow
} from './import-chunking';
import type { NewContactInput } from '../../contact/contact.store';

function person(firstname: string, lastname: string, email: string): NewContactInput {
  return {
    isEnterprise: false,
    firstname,
    lastname,
    email,
    address: { street: '', postalCode: '', city: '', country: 'France' }
  };
}

describe('import-chunking', () => {
  describe('chunkArray', () => {
    it('returns empty for empty input', () => {
      expect(chunkArray([])).toEqual([]);
    });

    it('keeps a single chunk when under the limit', () => {
      expect(chunkArray([1, 2, 3], 200)).toEqual([[1, 2, 3]]);
    });

    it('splits by blocks of 200 by default', () => {
      const items = Array.from({ length: 450 }, (_, i) => i);
      const chunks = chunkArray(items);
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toHaveLength(IMPORT_CONTACT_CHUNK_SIZE);
      expect(chunks[1]).toHaveLength(IMPORT_CONTACT_CHUNK_SIZE);
      expect(chunks[2]).toHaveLength(50);
      expect(chunks[0][0]).toBe(0);
      expect(chunks[1][0]).toBe(200);
      expect(chunks[2][0]).toBe(400);
    });

    it('supports custom chunk size', () => {
      expect(chunkArray(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([
        ['a', 'b'],
        ['c', 'd'],
        ['e']
      ]);
    });
  });

  describe('computeImportProgressPercent', () => {
    it('returns 100 when total is zero', () => {
      expect(computeImportProgressPercent(0, 0)).toBe(100);
    });

    it('computes rounded ratio of processed lines', () => {
      expect(computeImportProgressPercent(0, 400)).toBe(0);
      expect(computeImportProgressPercent(200, 400)).toBe(50);
      expect(computeImportProgressPercent(400, 400)).toBe(100);
      expect(computeImportProgressPercent(1, 3)).toBe(33);
    });

    it('clamps processed within [0, total]', () => {
      expect(computeImportProgressPercent(-10, 100)).toBe(0);
      expect(computeImportProgressPercent(150, 100)).toBe(100);
    });
  });

  describe('splitPreparedContactChunk', () => {
    it('separates creates and updates and tracks child indexes', () => {
      const chunk: PreparedContactImportRow[] = [
        { index: 0, input: person('A', 'One', 'a@test.fr') },
        { index: 1, input: person('B', 'Two', 'b@test.fr'), existingId: 'id-b' },
        { index: 2, input: person('C', 'Three', 'c@test.fr') }
      ];
      const split = splitPreparedContactChunk(chunk);
      expect(split.creates).toHaveLength(2);
      expect(split.updates).toEqual([
        { id: 'id-b', input: chunk[1].input }
      ]);
      expect(split.entries.map((e) => e.index)).toEqual([0, 1, 2]);
      expect([...split.childIndexSet]).toEqual([0, 1, 2]);
    });
  });

  describe('chunked import process contract', () => {
    it('processes each block independently then reaches 100%', () => {
      const prepared: PreparedContactImportRow[] = Array.from({ length: 450 }, (_, index) => ({
        index,
        input: person(`F${index}`, `L${index}`, `u${index}@test.fr`)
      }));
      const chunks = chunkArray(prepared, IMPORT_CONTACT_CHUNK_SIZE);
      expect(chunks).toHaveLength(3);

      let processed = 0;
      const percents: number[] = [];
      for (const chunk of chunks) {
        const split = splitPreparedContactChunk(chunk);
        expect(split.creates.length + split.updates.length).toBe(chunk.length);
        processed += chunk.length;
        percents.push(computeImportProgressPercent(processed, prepared.length));
      }

      expect(percents).toEqual([44, 89, 100]);
      expect(percents[percents.length - 1]).toBe(100);
    });

    it('runs full block cycle: split creates/updates, accumulate entries, progress by ratio', () => {
      const prepared: PreparedContactImportRow[] = Array.from({ length: 350 }, (_, index) => ({
        index,
        input: person(`F${index}`, `L${index}`, `u${index}@test.fr`),
        existingId: index % 10 === 0 ? `existing-${index}` : undefined
      }));
      const chunks = chunkArray(prepared, IMPORT_CONTACT_CHUNK_SIZE);
      expect(chunks).toHaveLength(2);

      let cumulativeEntries: Array<{ index: number; input: NewContactInput }> = [];
      let processed = 0;
      const blockReports: Array<{
        creates: number;
        updates: number;
        childCount: number;
        cumulativeCount: number;
        percent: number;
      }> = [];

      for (const chunk of chunks) {
        const split = splitPreparedContactChunk(chunk);
        cumulativeEntries = cumulativeEntries.concat(split.entries);
        processed += chunk.length;
        blockReports.push({
          creates: split.creates.length,
          updates: split.updates.length,
          childCount: split.childIndexSet.size,
          cumulativeCount: cumulativeEntries.length,
          percent: computeImportProgressPercent(processed, prepared.length)
        });
      }

      expect(blockReports[0]).toEqual({
        creates: 180,
        updates: 20,
        childCount: 200,
        cumulativeCount: 200,
        percent: 57
      });
      expect(blockReports[1]).toEqual({
        creates: 135,
        updates: 15,
        childCount: 150,
        cumulativeCount: 350,
        percent: 100
      });
      expect(blockReports.every((b) => b.creates + b.updates === b.childCount)).toBe(true);
    });

    it('keeps child indexes scoped to the current block only', () => {
      const prepared: PreparedContactImportRow[] = Array.from({ length: 250 }, (_, index) => ({
        index,
        input: person(`F${index}`, `L${index}`, `u${index}@test.fr`)
      }));
      const [first, second] = chunkArray(prepared, IMPORT_CONTACT_CHUNK_SIZE);
      const firstSplit = splitPreparedContactChunk(first);
      const secondSplit = splitPreparedContactChunk(second);

      expect(firstSplit.childIndexSet.has(0)).toBe(true);
      expect(firstSplit.childIndexSet.has(199)).toBe(true);
      expect(firstSplit.childIndexSet.has(200)).toBe(false);
      expect(secondSplit.childIndexSet.has(200)).toBe(true);
      expect(secondSplit.childIndexSet.has(249)).toBe(true);
      expect(secondSplit.childIndexSet.has(0)).toBe(false);
    });

    it('advances progress in small steps for imports under the 200 threshold', () => {
      const prepared: PreparedContactImportRow[] = Array.from({ length: 100 }, (_, index) => ({
        index,
        input: person(`F${index}`, `L${index}`, `u${index}@test.fr`)
      }));
      const steps = buildImportPersistSteps(prepared);
      expect(IMPORT_PROGRESS_BATCH_SIZE).toBe(10);
      expect(steps).toHaveLength(10);
      expect(steps[0]).toBe(10);
      expect(steps[4]).toBe(50);
      expect(steps[steps.length - 1]).toBe(100);
      expect(steps.every((value, index) => index === 0 || value > steps[index - 1])).toBe(true);
    });

    it('advances one step per update then by create batches', () => {
      const prepared: PreparedContactImportRow[] = [
        { index: 0, input: person('A', 'One', 'a@test.fr'), existingId: 'id-a' },
        { index: 1, input: person('B', 'Two', 'b@test.fr'), existingId: 'id-b' },
        { index: 2, input: person('C', 'Three', 'c@test.fr') },
        { index: 3, input: person('D', 'Four', 'd@test.fr') },
        { index: 4, input: person('E', 'Five', 'e@test.fr') }
      ];
      const steps = buildImportPersistSteps(prepared, 200, 2);
      expect(steps).toEqual([20, 40, 80, 100]);
    });
  });
});
