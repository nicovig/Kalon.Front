import type { NewContactInput } from '../../contact/contact.store';
import type { ContactLinkingMode } from '../../../core/models/contact-linking.model';

export type ImportLinkingRole = 'independent' | 'parent' | 'child';

export type ImportManualLinkAssignment = {
  role: ImportLinkingRole;
  parentRowIndex?: number | null;
};

export type ImportLinkingGroup = {
  key: string;
  parentIndex: number;
  childIndexes: number[];
};

export function normalizeLinkingStreetKey(street: string, postalCode: string): string {
  const streetKey = street
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  const postalKey = postalCode.trim().replace(/\s+/g, '');
  if (!streetKey || !postalKey) {
    return '';
  }
  return `${streetKey}|${postalKey}`;
}

export function linkingKeyFromContactInput(input: NewContactInput): string {
  if (input.isEnterprise) {
    const address = input.enterprise.address;
    return normalizeLinkingStreetKey(address.street ?? '', address.postalCode ?? '');
  }
  return normalizeLinkingStreetKey(input.address.street ?? '', input.address.postalCode ?? '');
}

export function linkingKeyFromRowCell(row: string[], columnIndex: number): string {
  const value = String(row[columnIndex] ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
  return value;
}

export function buildLinkingGroupsByKey(
  entries: Array<{ index: number; key: string }>
): ImportLinkingGroup[] {
  const byKey = new Map<string, number[]>();
  for (const entry of entries) {
    const key = entry.key.trim();
    if (!key) continue;
    const list = byKey.get(key);
    if (list) list.push(entry.index);
    else byKey.set(key, [entry.index]);
  }
  const groups: ImportLinkingGroup[] = [];
  for (const [key, indexes] of byKey.entries()) {
    if (indexes.length < 2) continue;
    const [parentIndex, ...childIndexes] = indexes;
    groups.push({ key, parentIndex, childIndexes });
  }
  return groups;
}

export function buildManualLinkingGroups(
  assignments: Record<number, ImportManualLinkAssignment>
): ImportLinkingGroup[] {
  const parents = Object.entries(assignments)
    .filter(([, value]) => value.role === 'parent')
    .map(([index]) => Number(index));
  const groups: ImportLinkingGroup[] = [];
  for (const parentIndex of parents) {
    const childIndexes = Object.entries(assignments)
      .filter(([, value]) => {
        if (value.role !== 'child' || value.parentRowIndex == null) {
          return false;
        }
        return Number(value.parentRowIndex) === parentIndex;
      })
      .map(([index]) => Number(index));
    if (!childIndexes.length) continue;
    groups.push({
      key: `manual-${parentIndex}`,
      parentIndex,
      childIndexes
    });
  }
  return groups;
}

export function isManualLinkingReady(
  rowIndexes: number[],
  assignments: Record<number, ImportManualLinkAssignment>
): boolean {
  for (const index of rowIndexes) {
    const assignment = assignments[index] ?? { role: 'independent' };
    if (assignment.role === 'child') {
      if (assignment.parentRowIndex == null) {
        return false;
      }
      const parent = Number(assignment.parentRowIndex);
      if (!Number.isFinite(parent) || assignments[parent]?.role !== 'parent') {
        return false;
      }
    }
  }
  return true;
}

export function contactLinkingImportHint(mode: ContactLinkingMode): string {
  if (mode === 'same_id') {
    return 'Choisissez la colonne qui identifie la famille : le premier profil de chaque groupe devient le principal.';
  }
  if (mode === 'same_address') {
    return 'Les profils avec la même rue et le même code postal seront liés : le premier de chaque groupe devient le principal.';
  }
  if (mode === 'manual') {
    return 'Indiquez pour chaque ligne si le profil est principal, lié, ou indépendant.';
  }
  return '';
}

export function shouldRunPostImportLinking(mode: ContactLinkingMode): boolean {
  return mode === 'same_id' || mode === 'same_address' || mode === 'manual';
}

export type ImportPostLinkUpdatePlan = {
  childRowIndex: number;
  parentRowIndex: number;
  childContactId: string;
  parentContactId: string;
  childInput: NewContactInput;
};

export type PlanPostImportLinkUpdatesArgs = {
  mode: ContactLinkingMode;
  importedEntries: Array<{ index: number; input: NewContactInput }>;
  rows: string[][];
  linkingColumnIndex: number | null;
  manualAssignments: Record<number, ImportManualLinkAssignment>;
  resolveContactId: (input: NewContactInput) => string | null | undefined;
  onlyChildIndexes?: Set<number>;
};

export function planPostImportLinkUpdates(
  args: PlanPostImportLinkUpdatesArgs
): ImportPostLinkUpdatePlan[] {
  if (!shouldRunPostImportLinking(args.mode) || !args.importedEntries.length) {
    return [];
  }

  let groups: ImportLinkingGroup[] = [];
  if (args.mode === 'same_id') {
    if (args.linkingColumnIndex == null) {
      return [];
    }
    groups = buildLinkingGroupsByKey(
      args.importedEntries.map(({ index }) => ({
        index,
        key: linkingKeyFromRowCell(args.rows[index] ?? [], args.linkingColumnIndex as number)
      }))
    );
  } else if (args.mode === 'same_address') {
    groups = buildLinkingGroupsByKey(
      args.importedEntries.map(({ index, input }) => ({
        index,
        key: linkingKeyFromContactInput(input)
      }))
    );
  } else if (args.mode === 'manual') {
    groups = buildManualLinkingGroups(args.manualAssignments);
  }

  if (!groups.length) {
    return [];
  }

  const byIndex = new Map(args.importedEntries.map((entry) => [entry.index, entry.input]));
  const plans: ImportPostLinkUpdatePlan[] = [];

  for (const group of groups) {
    const parentInput = byIndex.get(group.parentIndex);
    if (!parentInput) continue;
    const parentContactId = String(args.resolveContactId(parentInput) ?? '').trim();
    if (!parentContactId) continue;

    for (const childIndex of group.childIndexes) {
      if (args.onlyChildIndexes && !args.onlyChildIndexes.has(childIndex)) {
        continue;
      }
      const childInput = byIndex.get(childIndex);
      if (!childInput) continue;
      const childContactId = String(args.resolveContactId(childInput) ?? '').trim();
      if (!childContactId || childContactId === parentContactId) continue;
      plans.push({
        childRowIndex: childIndex,
        parentRowIndex: group.parentIndex,
        childContactId,
        parentContactId,
        childInput
      });
    }
  }

  return plans;
}
