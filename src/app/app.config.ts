import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { demoInterceptor } from './core/http/demo.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { DemoBootstrapService } from './core/demo/demo-bootstrap.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([demoInterceptor, authInterceptor, errorInterceptor])),
    provideAnimations(),
    provideAppInitializer(() => inject(DemoBootstrapService).init())
  ]
};
