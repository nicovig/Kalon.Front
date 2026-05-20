import { guessFieldForHeader, guessMappingForHeaders } from './import-column-guess';

describe('guessMappingForHeaders', () => {
  it('keeps first occurrence per field and skips later duplicates', () => {
    const headers = ['Identifiant', 'Nom Membre', 'Email Membre', 'Fixe Membre', 'Mobile Membre'];
    const m = guessMappingForHeaders(headers);
    expect(m[0]).toBe('skip');
    expect(m[1]).toBe('lastname');
    expect(m[2]).toBe('email');
    expect(m[3]).toBe('phone');
    expect(m[4]).toBe('skip');
  });

  it('does not clear all mappings after one pass', () => {
    const headers = ['Nom', 'Prénom', 'Email'];
    const m = guessMappingForHeaders(headers);
    expect(m.some((x) => x !== 'skip')).toBe(true);
    expect(guessFieldForHeader('Nom')).toBe('lastname');
    expect(guessFieldForHeader('Prénom')).toBe('firstname');
    expect(guessFieldForHeader('Email')).toBe('email');
  });
});
