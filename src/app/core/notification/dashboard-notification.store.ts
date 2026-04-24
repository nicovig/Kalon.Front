import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
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
  private readonly taxReceiptContactIdsWrite = signal<ReadonlySet<string>>(new Set<string>());

  private readonly refreshSubject = new Subject<void>();

  readonly contactsToRemind = this.contactsToRemindWrite.asReadonly();
  readonly taxReceiptsToSend = this.taxReceiptsToSendWrite.asReadonly();
  readonly physicalLettersToSend = this.physicalLettersToSendWrite.asReadonly();
  readonly taxReceiptContactIds = this.taxReceiptContactIdsWrite.asReadonly();
  readonly hasAnyPending = computed(
    () =>
      this.contactsToRemind() > 0 ||
      this.taxReceiptsToSend() > 0 ||
      this.physicalLettersToSend() > 0
  );

  constructor() {
    this.refreshSubject
      .pipe(
        debounceTime(0),
        switchMap(() => {
          if (!this.userStore.isAuthenticated()) {
            this.reset();
            return of(undefined);
          }
          return this.http
            .get<NotificationDashboardResponseApiModel>(API_ENDPOINTS.notification.dashboard())
            .pipe(
              tap((payload) => {
                this.contactsToRemindWrite.set(payload.contactsToRemind?.length ?? 0);
                this.taxReceiptsToSendWrite.set(payload.contactsToSendTaxReceipts?.length ?? 0);
                this.physicalLettersToSendWrite.set(Number(payload.physicalLettersToSendCount ?? 0));
                const ids = new Set<string>();
                for (const item of payload.contactsToSendTaxReceipts ?? []) {
                  const id = item.contactId;
                  if (id) {
                    ids.add(id);
                  }
                }
                this.taxReceiptContactIdsWrite.set(ids);
              }),
              catchError(() => {
                this.reset();
                return of(undefined);
              })
            );
        })
      )
      .subscribe();
  }

  refresh(): void {
    if (!this.userStore.isAuthenticated()) {
      this.reset();
      return;
    }
    this.refreshSubject.next();
  }

  reset(): void {
    this.contactsToRemindWrite.set(0);
    this.taxReceiptsToSendWrite.set(0);
    this.physicalLettersToSendWrite.set(0);
    this.taxReceiptContactIdsWrite.set(new Set());
  }
}
