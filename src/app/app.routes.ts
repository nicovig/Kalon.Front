import { Routes } from '@angular/router';
import { App } from './app';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login.page').then((m) => m.LoginPageComponent)
      }
    ]
  },
  {
    path: '',
    component: App,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES)
      },
      {
        path: 'donateurs',
        loadChildren: () =>
          import('./features/donor/donor.routes').then((m) => m.DONOR_ROUTES)
      },
      {
        path: 'relances',
        loadChildren: () =>
          import('./features/reminder/reminder.routes').then((m) => m.REMINDER_ROUTES)
      },
      {
        path: 'recus',
        loadChildren: () =>
          import('./features/receipt/receipt.routes').then((m) => m.RECEIPT_ROUTES)
      },
      {
        path: 'import',
        loadChildren: () =>
          import('./features/import/import.routes').then((m) => m.IMPORT_ROUTES)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
