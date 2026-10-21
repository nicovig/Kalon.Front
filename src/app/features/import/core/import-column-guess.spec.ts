import { guessFieldForHeader, guessMappingForHeaders } from './import-column-guess';

describe('guessMappingForHeaders', () => {
  it('keeps first occurrence per field and skips later duplicates', () => {
    const headers = ['Identifiant', 'Nom Membre', 'Email Membre', 'Fixe Membre', 'Mobile Membre'];
    const m = guessMappingForHeaders(headers);
    expect(m[0]).toBe('skip');
    expect(m[1]).toBe('lastname');
    expect(m[2]).toBe('email');
    expect(m[3]).toBe('landlinePhone');
    expect(m[4]).toBe('mobilePhone');
  });

  it('detects mobile and landline phone headers', () => {
    expect(guessFieldForHeader('Téléphone mobile')).toBe('mobilePhone');
    expect(guessFieldForHeader('Portable')).toBe('mobilePhone');
    expect(guessFieldForHeader('Téléphone fixe')).toBe('landlinePhone');
    expect(guessFieldForHeader('Téléphone')).toBe('mobilePhone');
  });

  it('does not clear all mappings after one pass', () => {
    const headers = ['Nom', 'Prénom', 'Email'];
    const m = guessMappingForHeaders(headers);
    expect(m.some((x) => x !== 'skip')).toBe(true);
    expect(guessFieldForHeader('Nom')).toBe('lastname');
    expect(guessFieldForHeader('Prénom')).toBe('firstname');
    expect(guessFieldForHeader('Email')).toBe('email');
  });

  it('detects combined full name headers', () => {
    expect(guessFieldForHeader('Nom et prénom')).toBe('fullName');
    expect(guessFieldForHeader('Nom Prenom')).toBe('fullName');
    const headers = ['Nom et prénom', 'Email'];
    const m = guessMappingForHeaders(headers);
    expect(m[0]).toBe('fullName');
    expect(m[1]).toBe('email');
  });

  it('detects membership and tags headers', () => {
    expect(guessFieldForHeader('Adhésion familiale')).toBe('isFamilyMembership');
    expect(guessFieldForHeader('Date début adhésion')).toBe('lastMembershipDate');
    expect(guessFieldForHeader('Date fin adhésion')).toBe('membershipEndDate');
    expect(guessFieldForHeader('Tags')).toBe('tags');
    expect(guessFieldForHeader('Type adhésion')).toBe('tags');
    expect(guessFieldForHeader('Nature adhésion')).toBe('tags');
    expect(guessFieldForHeader('État membre')).toBe('tags');
    expect(guessFieldForHeader('Entité')).toBe('tags');
    expect(guessFieldForHeader('Genre')).toBe('gender');
  });
});
