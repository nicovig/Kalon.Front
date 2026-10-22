import { CanActivateFn } from '@angular/router';

export const SEARCH_FEATURE_KEY = 'recherche_mecenes';

export const planGuard: CanActivateFn = () => {
  return true;
};
