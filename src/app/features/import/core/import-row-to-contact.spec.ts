import { mapRowToNewContactInput } from './import-row-to-contact';
import { ImportFieldKey } from './model/import-field.model';

describe('mapRowToNewContactInput', () => {
  const emailNameBindings: ImportFieldKey[] = ['email', 'firstname', 'lastname'];

  it('creates a donor when email and name are present', () => {
    const input = mapRowToNewContactInput(
      ['jean@example.com', 'Jean', 'Dupont'],
      emailNameBindings
    );
    expect(input).not.toBeNull();
    expect(input?.kind).toBe('donor');
    if (input?.kind !== 'donor') {
      return;
    }
    expect(input.email).toBe('jean@example.com');
    expect(input.firstname).toBe('Jean');
    expect(input.lastname).toBe('Dupont');
  });

  it('creates a donor with address only when postal data is sufficient', () => {
    const bindings: ImportFieldKey[] = ['firstname', 'lastname', 'addressLine'];
    const input = mapRowToNewContactInput(
      ['Jean', 'Dupont', '12 rue de la Paix 75002 Paris'],
      bindings
    );
    expect(input).not.toBeNull();
    if (input?.kind !== 'donor') {
      return;
    }
    expect(input.email).toBe('');
    expect(input.address?.street).toBe('12 rue de la Paix 75002 Paris');
  });

  it('returns null when neither email nor address is present', () => {
    const bindings: ImportFieldKey[] = ['firstname', 'lastname'];
    const input = mapRowToNewContactInput(['Jean', 'Dupont'], bindings);
    expect(input).toBeNull();
  });

  it('returns null when name is missing', () => {
    const input = mapRowToNewContactInput(['jean@example.com', '', ''], emailNameBindings);
    expect(input).toBeNull();
  });

  it('splits fullName into firstname and lastname', () => {
    const bindings: ImportFieldKey[] = ['email', 'fullName'];
    const input = mapRowToNewContactInput(
      ['jean@example.com', 'Jean Dupont'],
      bindings
    );
    expect(input).not.toBeNull();
    if (input?.kind !== 'donor') {
      return;
    }
    expect(input.firstname).toBe('Jean');
    expect(input.lastname).toBe('Dupont');
  });

  it('splits fullName with lastname-firstname order', () => {
    const bindings: ImportFieldKey[] = ['email', 'fullName'];
    const input = mapRowToNewContactInput(
      ['jean@example.com', 'Dupont Jean'],
      bindings,
      undefined,
      { fullNameOrder: 'lastname-firstname' }
    );
    expect(input).not.toBeNull();
    if (input?.kind !== 'donor') {
      return;
    }
    expect(input.firstname).toBe('Jean');
    expect(input.lastname).toBe('Dupont');
  });

  it('creates a company contact when enterprise fields are mapped', () => {
    const bindings: ImportFieldKey[] = [
      'email',
      'enterpriseName',
      'siret',
      'contactFirstname',
      'contactLastname'
    ];
    const input = mapRowToNewContactInput(
      ['contact@acme.fr', 'ACME', '12345678901234', 'Jean', 'Dupont'],
      bindings
    );
    expect(input?.kind).toBe('company');
    if (input?.kind !== 'company') {
      return;
    }
    expect(input.enterprise?.name).toBe('ACME');
    expect(input.enterprise?.siret).toBe('12345678901234');
  });

  it('applies overrides from ignored-line corrections', () => {
    const input = mapRowToNewContactInput(
      ['', 'Jean', 'Dupont'],
      emailNameBindings,
      { email: 'fixed@example.com' }
    );
    expect(input?.email).toBe('fixed@example.com');
  });
});
