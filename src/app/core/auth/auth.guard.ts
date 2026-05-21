import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { isDemoMode } from '../demo/demo-mode';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (isDemoMode()) {
    authService.ensureDemoSession();
    return true;
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/auth/login');
};

