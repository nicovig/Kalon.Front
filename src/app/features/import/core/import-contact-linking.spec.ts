import {
  buildLinkingGroupsByKey,
  buildManualLinkingGroups,
  isManualLinkingReady,
  linkingKeyFromContactInput,
  linkingKeyFromRowCell,
  normalizeLinkingStreetKey,
  planPostImportLinkUpdates,
  shouldRunPostImportLinking
} from './import-contact-linking';
import type { NewContactInput } from '../../contact/contact.store';

function individual(
  firstname: string,
  lastname: string,
  email: string,
  street = '1 rue Test',
  postalCode = '75001'
): NewContactInput {
  return {
    isEnterprise: false,
    firstname,
    lastname,
    email,
    address: {
      street,
      postalCode,
      city: 'Paris',
      country: 'France'
    }
  };
}

describe('import-contact-linking', () => {
  it('normalizes street and postal code keys', () => {
    expect(normalizeLinkingStreetKey('12 Rue de la Paix', '75002')).toBe(
      '12 rue de la paix|75002'
    );
    expect(normalizeLinkingStreetKey('12  Rue  de  la  Paix', '75 002')).toBe(
      '12 rue de la paix|75002'
    );
    expect(normalizeLinkingStreetKey('', '75002')).toBe('');
  });

  it('builds linking key from individual contact address', () => {
    expect(linkingKeyFromContactInput(individual('A', 'B', 'a@b.fr', '1 Avenue Test', '69001'))).toBe(
      '1 avenue test|69001'
    );
  });

  it('builds same_id groups with first row as parent', () => {
    const groups = buildLinkingGroupsByKey([
      { index: 0, key: 'fam-1' },
      { index: 1, key: 'fam-1' },
      { index: 2, key: 'fam-2' },
      { index: 3, key: 'fam-2' },
      { index: 4, key: 'alone' }
    ]);
    expect(groups).toEqual([
      { key: 'fam-1', parentIndex: 0, childIndexes: [1] },
      { key: 'fam-2', parentIndex: 2, childIndexes: [3] }
    ]);
  });

  it('reads linking key from row cell', () => {
    expect(linkingKeyFromRowCell(['FAM-A', 'Jean'], 0)).toBe('fam-a');
  });

  it('builds manual linking groups from assignments', () => {
    const groups = buildManualLinkingGroups({
      0: { role: 'parent' },
      1: { role: 'child', parentRowIndex: 0 },
      2: { role: 'independent' },
      3: { role: 'child', parentRowIndex: 0 }
    });
    expect(groups).toEqual([{ key: 'manual-0', parentIndex: 0, childIndexes: [1, 3] }]);
  });

  it('requires a valid parent for each child before import', () => {
    expect(
      isManualLinkingReady([0, 1], {
        0: { role: 'parent' },
        1: { role: 'child', parentRowIndex: 0 }
      })
    ).toBe(true);
    expect(
      isManualLinkingReady([0, 1], {
        0: { role: 'independent' },
        1: { role: 'child', parentRowIndex: 0 }
      })
    ).toBe(false);
    expect(
      isManualLinkingReady([0, 1], {
        0: { role: 'parent' },
        1: { role: 'child', parentRowIndex: null }
      })
    ).toBe(false);
  });
});

describe('post-import linking updates (critical: PUT only when linking is enabled)', () => {
  const parent = individual('Parent', 'Fam', 'parent@test.fr');
  const child = individual('Child', 'Fam', 'child@test.fr');
  const other = individual('Solo', 'Alone', 'solo@test.fr', '9 autre', '69000');

  const importedEntries = [
    { index: 0, input: parent },
    { index: 1, input: child },
    { index: 2, input: other }
  ];

  const rows = [
    ['FAM-1', 'Parent'],
    ['FAM-1', 'Child'],
    ['SOLO', 'Solo']
  ];

  const resolveContactId = (input: NewContactInput) => {
    if (input.email === parent.email) return 'id-parent';
    if (input.email === child.email) return 'id-child';
    if (input.email === other.email) return 'id-other';
    return null;
  };

  it('shouldRunPostImportLinking is false only for none', () => {
    expect(shouldRunPostImportLinking('none')).toBe(false);
    expect(shouldRunPostImportLinking('same_id')).toBe(true);
    expect(shouldRunPostImportLinking('same_address')).toBe(true);
    expect(shouldRunPostImportLinking('manual')).toBe(true);
  });

  it('mode none: zero post-import link updates even when family keys match', () => {
    const plans = planPostImportLinkUpdates({
      mode: 'none',
      importedEntries,
      rows,
      linkingColumnIndex: 0,
      manualAssignments: {
        0: { role: 'parent' },
        1: { role: 'child', parentRowIndex: 0 }
      },
      resolveContactId
    });
    expect(plans).toEqual([]);
  });

  it('same_id: plans PUT only for children of matched groups', () => {
    const plans = planPostImportLinkUpdates({
      mode: 'same_id',
      importedEntries,
      rows,
      linkingColumnIndex: 0,
      manualAssignments: {},
      resolveContactId
    });
    expect(plans).toEqual([
      {
        childRowIndex: 1,
        parentRowIndex: 0,
        childContactId: 'id-child',
        parentContactId: 'id-parent',
        childInput: child
      }
    ]);
  });

  it('same_id without column: zero updates', () => {
    const plans = planPostImportLinkUpdates({
      mode: 'same_id',
      importedEntries,
      rows,
      linkingColumnIndex: null,
      manualAssignments: {},
      resolveContactId
    });
    expect(plans).toEqual([]);
  });

  it('same_address: plans PUT for same street+postalCode children only', () => {
    const plans = planPostImportLinkUpdates({
      mode: 'same_address',
      importedEntries,
      rows,
      linkingColumnIndex: null,
      manualAssignments: {},
      resolveContactId
    });
    expect(plans).toEqual([
      {
        childRowIndex: 1,
        parentRowIndex: 0,
        childContactId: 'id-child',
        parentContactId: 'id-parent',
        childInput: child
      }
    ]);
  });

  it('manual: plans PUT only for assigned children', () => {
    const plans = planPostImportLinkUpdates({
      mode: 'manual',
      importedEntries,
      rows,
      linkingColumnIndex: null,
      manualAssignments: {
        0: { role: 'parent' },
        1: { role: 'child', parentRowIndex: 0 },
        2: { role: 'independent' }
      },
      resolveContactId
    });
    expect(plans).toEqual([
      {
        childRowIndex: 1,
        parentRowIndex: 0,
        childContactId: 'id-child',
        parentContactId: 'id-parent',
        childInput: child
      }
    ]);
  });

  it('never plans an update for the parent itself', () => {
    const plans = planPostImportLinkUpdates({
      mode: 'same_id',
      importedEntries,
      rows,
      linkingColumnIndex: 0,
      manualAssignments: {},
      resolveContactId
    });
    expect(plans.every((plan) => plan.childContactId !== plan.parentContactId)).toBe(true);
    expect(plans.every((plan) => plan.childRowIndex !== plan.parentRowIndex)).toBe(true);
  });

  it('skips unresolved contacts (no PUT without known ids after bulk+get)', () => {
    const plans = planPostImportLinkUpdates({
      mode: 'same_id',
      importedEntries,
      rows,
      linkingColumnIndex: 0,
      manualAssignments: {},
      resolveContactId: () => null
    });
    expect(plans).toEqual([]);
  });

  it('singleton groups produce zero post-import updates', () => {
    const plans = planPostImportLinkUpdates({
      mode: 'same_id',
      importedEntries: [{ index: 0, input: parent }, { index: 2, input: other }],
      rows,
      linkingColumnIndex: 0,
      manualAssignments: {},
      resolveContactId
    });
    expect(plans).toEqual([]);
  });
});
