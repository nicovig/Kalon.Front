import { HttpInterceptorFn } from '@angular/common/http';

export const formDataInterceptor: HttpInterceptorFn = (request, next) => {
  if (!(request.body instanceof FormData)) {
    return next(request);
  }
  return next(
    request.clone({
      headers: request.headers.delete('Content-Type')
    })
  );
};
