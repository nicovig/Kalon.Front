import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { API_ENDPOINTS } from '../api/api.endpoints';
import { NotificationDashboardResponseApiModel } from '../api/backend-api.model';
import { UserStore } from '../auth/user.store';

@Injectable({ providedIn: 'root' })
export class DashboardNotificationStore {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);

  private readonly contactsToRemindWrite = signal(0);
  private readonly taxReceiptsToSendWrite = signal(0);
  private readonly physicalLettersToSendWrite = signal(0);

  readonly contactsToRemind = this.contactsToRemindWrite.asReadonly();
  readonly taxReceiptsToSend = this.taxReceiptsToSendWrite.asReadonly();
  readonly physicalLettersToSend = this.physicalLettersToSendWrite.asReadonly();
  readonly hasAnyPending = computed(
    () =>
      this.contactsToRemind() > 0 ||
      this.taxReceiptsToSend() > 0 ||
      this.physicalLettersToSend() > 0
  );

  refresh(): void {
    if (!this.userStore.isAuthenticated()) {
      this.reset();
      return;
    }
    this.http
      .get<NotificationDashboardResponseApiModel>(API_ENDPOINTS.notification.dashboard())
      .pipe(
        tap((payload) => {
          this.contactsToRemindWrite.set(payload.contactsToRemind?.length ?? 0);
          this.taxReceiptsToSendWrite.set(Number(payload.taxReceiptsToSendCount ?? 0));
          this.physicalLettersToSendWrite.set(Number(payload.physicalLettersToSendCount ?? 0));
        }),
        catchError(() => {
          this.reset();
          return of(undefined);
        })
      )
      .subscribe();
  }

  reset(): void {
    this.contactsToRemindWrite.set(0);
    this.taxReceiptsToSendWrite.set(0);
    this.physicalLettersToSendWrite.set(0);
  }
}
