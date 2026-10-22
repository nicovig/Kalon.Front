import { UserStore } from './user.store';
import type { AuthUser } from './auth-user.model';

function user(partial: Partial<AuthUser> = {}): AuthUser {
  return {
    firstname: 'A',
    lastname: 'B',
    email: 'a@b.fr',
    associationName: 'Asso',
    plan: 'free',
    ...partial
  };
}

describe('UserStore.hasFeature', () => {
  it('returns true when feature flag is enabled', () => {
    const store = new UserStore();
    store.setSession('token', user({ features: { recherche_mecenes: 'true' } }));
    expect(store.hasFeature('recherche_mecenes')).toBe(true);
  });

  it('falls back to premium plan for recherche_mecenes', () => {
    const store = new UserStore();
    store.setSession('token', user({ plan: 'premium' }));
    expect(store.hasFeature('recherche_mecenes')).toBe(true);
  });

  it('returns false for basic plan without feature', () => {
    const store = new UserStore();
    store.setSession('token', user({ plan: 'basic' }));
    expect(store.hasFeature('recherche_mecenes')).toBe(false);
  });

  it('returns false when feature is explicitly disabled', () => {
    const store = new UserStore();
    store.setSession(
      'token',
      user({ plan: 'premium', features: { recherche_mecenes: 'false' } })
    );
    expect(store.hasFeature('recherche_mecenes')).toBe(false);
  });
});
