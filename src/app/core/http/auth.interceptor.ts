import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

const PUBLIC_AUTH_PATH_SUFFIXES = [
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password'
];

function isPublicAuthRequest(url: string): boolean {
  const lower = url.toLowerCase();
  return PUBLIC_AUTH_PATH_SUFFIXES.some((suffix) => lower.includes(suffix));
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (isPublicAuthRequest(request.url)) {
    return next(request);
  }
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (!token) {
    return next(request);
  }
  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    })
  );
};
