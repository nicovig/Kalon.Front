import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { API_ENDPOINTS } from '../api/api.endpoints';
import { NotificationDashboardResponseApiModel } from '../api/backend-api.model';
import { UserStore } from '../auth/user.store';
import { isDemoMode } from '../demo/demo-mode';
import { DEMO_STORAGE_KEYS, DemoPersistenceService } from '../demo/demo-persistence.service';
import {
  createDemoNotificationsSeed,
  DemoNotificationsState
} from '../demo/demo-seed.data';

@Injectable({ providedIn: 'root' })
export class DashboardNotificationStore {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);
  private readonly demoPersistence = inject(DemoPersistenceService);

  private readonly contactsToRemindWrite = signal(0);
  private readonly taxReceiptsToSendWrite = signal(0);
  private readonly physicalLettersToSendWrite = signal(0);
  private readonly taxReceiptContactIdsWrite = signal<ReadonlySet<string>>(new Set<string>());
  private readonly taxReceiptPeriodFromWrite = signal<string | null>(null);
  private readonly taxReceiptPeriodToWrite = signal<string | null>(null);

  private readonly refreshSubject = new Subject<void>();

  readonly contactsToRemind = this.contactsToRemindWrite.asReadonly();
  readonly taxReceiptsToSend = this.taxReceiptsToSendWrite.asReadonly();
  readonly physicalLettersToSend = this.physicalLettersToSendWrite.asReadonly();
  readonly taxReceiptContactIds = this.taxReceiptContactIdsWrite.asReadonly();
  readonly taxReceiptPeriodFrom = this.taxReceiptPeriodFromWrite.asReadonly();
  readonly taxReceiptPeriodTo = this.taxReceiptPeriodToWrite.asReadonly();
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
          if (isDemoMode()) {
            this.applyDemoNotifications(
              this.demoPersistence.read(DEMO_STORAGE_KEYS.notifications, createDemoNotificationsSeed())
            );
            return of(undefined);
          }
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
                this.taxReceiptPeriodFromWrite.set(this.toDateInputValue(payload.taxReceiptPeriodFrom));
                this.taxReceiptPeriodToWrite.set(this.toDateInputValue(payload.taxReceiptPeriodTo));
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
    if (isDemoMode()) {
      this.applyDemoNotifications(
        this.demoPersistence.read(DEMO_STORAGE_KEYS.notifications, createDemoNotificationsSeed())
      );
      return;
    }
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
    this.taxReceiptPeriodFromWrite.set(null);
    this.taxReceiptPeriodToWrite.set(null);
  }

  private applyDemoNotifications(state: DemoNotificationsState): void {
    const remind = state.contactsToRemind ?? [];
    const receipts = state.contactsToSendTaxReceipts ?? [];
    this.contactsToRemindWrite.set(remind.length);
    this.taxReceiptsToSendWrite.set(receipts.length);
    this.physicalLettersToSendWrite.set(Number(state.physicalLettersToSendCount ?? 0));
    this.taxReceiptContactIdsWrite.set(new Set(receipts));
    this.taxReceiptPeriodFromWrite.set(state.taxReceiptPeriodFrom ?? null);
    this.taxReceiptPeriodToWrite.set(state.taxReceiptPeriodTo ?? null);
  }

  private toDateInputValue(value: unknown): string | null {
    if (value == null || value === '') {
      return null;
    }
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
