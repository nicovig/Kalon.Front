import { Routes } from '@angular/router';
import { planGuard, SEARCH_FEATURE_KEY } from '../../core/auth/plan.guard';
import { SearchPageComponent } from './search.page';

export const SEARCH_ROUTES: Routes = [
  {
    path: '',
    component: SearchPageComponent,
    canActivate: [planGuard],
    data: { requiredFeature: SEARCH_FEATURE_KEY }
  }
];
