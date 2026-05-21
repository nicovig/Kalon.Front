import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { isDemoMode } from '../demo/demo-mode';

function isApiRequest(url: string): boolean {
  const base = API_BASE_URL.replace(/\/$/, '');
  return url.startsWith(base) || url.includes('/api/');
}

export const demoInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isDemoMode()) {
    return next(request);
  }
  if (isApiRequest(request.url)) {
    return of(new HttpResponse({ status: 204, body: null }));
  }
  return next(request);
};
