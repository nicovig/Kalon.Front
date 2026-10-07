import { getImportBusinessRules } from './import-business-rules';

describe('getImportBusinessRules', () => {
  it('includes contact and file rules for contacts mode', () => {
    const rules = getImportBusinessRules('contacts');
    expect(rules.some((section) => section.title.includes('Excel ou CSV'))).toBe(true);
    expect(rules.some((section) => section.title.includes('profil'))).toBe(true);
    expect(rules.some((section) => section.title.includes('Doublons'))).toBe(true);
  });

  it('includes donation rules for donations mode', () => {
    const rules = getImportBusinessRules('donations');
    expect(rules.some((section) => section.title.includes('contribution'))).toBe(true);
  });

  it('merges all sections for combined mode', () => {
    const rules = getImportBusinessRules('combined');
    expect(rules.some((section) => section.title.includes('profil'))).toBe(true);
    expect(rules.some((section) => section.title.includes('contribution'))).toBe(true);
    expect(rules.some((section) => section.title.includes('même ligne'))).toBe(true);
  });
});
