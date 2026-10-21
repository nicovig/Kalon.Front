import {
  applyTagRenameMap,
  buildImportTagMappingDrafts,
  buildTagRenameMap,
  collectUniqueTagValuesFromRows,
  findTagsColumnIndex
} from './import-tags';

describe('import-tags', () => {
  it('collects unique tag values from a column', () => {
    const rows = [
      ['Jean', 'Adhésion principale'],
      ['Marie', 'Membre ponctuel'],
      ['Paul', 'Adhésion principale'],
      ['Luc', 'Membre ponctuel; VIP']
    ];
    expect(collectUniqueTagValuesFromRows(rows, 1)).toEqual([
      'Adhésion principale',
      'Membre ponctuel',
      'VIP'
    ]);
  });

  it('finds tags column index', () => {
    expect(findTagsColumnIndex(['email', 'tags', 'lastname'])).toBe(1);
    expect(findTagsColumnIndex(['email', 'lastname'])).toBe(-1);
  });

  it('builds drafts and marks existing tags', () => {
    const drafts = buildImportTagMappingDrafts(
      ['Adhérent', 'Nouveau'],
      (name) => (name.toLowerCase() === 'adhérent' ? 'Adhérent' : undefined)
    );
    expect(drafts).toEqual([
      { sourceValue: 'Adhérent', kalonName: 'Adhérent', alreadyExists: true },
      { sourceValue: 'Nouveau', kalonName: 'Nouveau', alreadyExists: false }
    ]);
  });

  it('applies rename map on import values', () => {
    const map = buildTagRenameMap([
      { sourceValue: 'Adhésion principale', kalonName: 'Adhérent', alreadyExists: false },
      { sourceValue: 'Membre ponctuel', kalonName: 'Membre', alreadyExists: false }
    ]);
    expect(applyTagRenameMap(['Adhésion principale', 'Membre ponctuel'], map)).toEqual([
      'Adhérent',
      'Membre'
    ]);
  });
});
