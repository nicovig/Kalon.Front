import { getImportBusinessRules } from './import-business-rules';

describe('getImportBusinessRules', () => {
  it('includes contact and file rules for contacts mode', () => {
    const rules = getImportBusinessRules('contacts');
    expect(rules.some((section) => section.title.includes('Fichier'))).toBe(true);
    expect(rules.some((section) => section.title.includes('Profils'))).toBe(true);
    expect(rules.some((section) => section.title.includes('Doublons'))).toBe(true);
  });

  it('includes donation rules for donations mode', () => {
    const rules = getImportBusinessRules('donations');
    expect(rules.some((section) => section.title.includes('Contributions'))).toBe(true);
  });

  it('merges all sections for combined mode', () => {
    const rules = getImportBusinessRules('combined');
    expect(rules.some((section) => section.title.includes('Profils'))).toBe(true);
    expect(rules.some((section) => section.title.includes('Contributions'))).toBe(true);
    expect(rules.some((section) => section.title.includes('combiné'))).toBe(true);
  });
});
