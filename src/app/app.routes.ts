import { Routes } from '@angular/router';
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
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES)
      },
      {
        path: 'profils',
        loadChildren: () =>
          import('./features/contact/contact.routes').then((m) => m.CONTACT_ROUTES)
      },
      {
        path: 'carte',
        loadChildren: () =>
          import('./features/map/map.routes').then((m) => m.MAP_ROUTES)
      },
      {
        path: 'statistics',
        loadChildren: () =>
          import('./features/statistics/statistics.routes').then((m) => m.STATISTICS_ROUTES)
      },
      {
        path: 'import',
        loadChildren: () =>
          import('./features/import/import.routes').then((m) => m.IMPORT_ROUTES)
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
        path: 'recherche',
        loadChildren: () =>
          import('./features/search/search.routes').then((m) => m.SEARCH_ROUTES)
      },
      {
        path: 'account',
        loadChildren: () =>
          import('./features/account/account.routes').then((m) => m.ACCOUNT_ROUTES)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
