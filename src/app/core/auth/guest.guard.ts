import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { isDemoMode } from '../demo/demo-mode';
import { AuthService } from './auth.service';

export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
  if (!isDemoMode()) {
    return true;
  }
  const authService = inject(AuthService);
  const router = inject(Router);
  authService.ensureDemoSession();
  return router.parseUrl('/');
};
