import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url.includes('/api/auth/login')) {
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

