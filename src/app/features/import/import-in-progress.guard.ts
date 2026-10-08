import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { ToastService } from '../../layout/toast/toast.service';
import { ImportPageComponent } from './import.page';

export const importInProgressGuard: CanDeactivateFn<ImportPageComponent> = (component) => {
  if (!component.isImportInProgress()) {
    return true;
  }
  inject(ToastService).show(
    'Import encore en cours. Attendez la fin de toutes les réponses avant de quitter.',
    'alert',
    4500
  );
  return false;
};
