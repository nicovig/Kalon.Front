import { Routes } from '@angular/router';
import { ImportPageComponent } from './import.page';
import { importInProgressGuard } from './import-in-progress.guard';

export const IMPORT_ROUTES: Routes = [
  {
    path: '',
    component: ImportPageComponent,
    canDeactivate: [importInProgressGuard]
  }
];
