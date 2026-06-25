import { parseImportMatrix, resolveExcelSheetName } from './import-file-parse';

describe('import-file-parse sheet selection', () => {
  it('resolves preferred sheet when it exists', () => {
    expect(resolveExcelSheetName(['Feuille1', 'Données', 'Feuille3'], 'Données')).toBe('Données');
  });

  it('falls back to first sheet when preferred is missing', () => {
    expect(resolveExcelSheetName(['Feuille1', 'Feuille2'], 'Autre')).toBe('Feuille1');
  });

  it('parses matrix into headers and data rows', () => {
    const matrix = [
      ['Nom', 'Email'],
      ['Dupont', 'a@b.com'],
      ['', '']
    ];
    const parsed = parseImportMatrix(matrix, 'Test');
    expect(parsed.sheetName).toBe('Test');
    expect(parsed.headers).toEqual(['Nom', 'Email']);
    expect(parsed.rows).toEqual([['Dupont', 'a@b.com']]);
  });
});
