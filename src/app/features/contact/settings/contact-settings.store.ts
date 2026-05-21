import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { ContactStatus, IContact } from '../../../core/models/contact.model';
import { UserStore } from '../../../core/auth/user.store';
import { API_ENDPOINTS } from '../../../core/api/api.endpoints';
import { ContactStatusSettingsApiModel } from '../../../core/api/backend-api.model';
import { isDemoMode } from '../../../core/demo/demo-mode';

export type ContactStatusSettings = {
  newForDays: number;
  toRemindAfterMonths: number;
  inactiveAfterMonths: number;
};

const STORAGE_KEY = 'kalon.contact.status.settings.v1';

const DEFAULT_SETTINGS: ContactStatusSettings = {
  newForDays: 30,
  toRemindAfterMonths: 12,
  inactiveAfterMonths: 24
};

@Injectable({ providedIn: 'root' })
export class ContactSettingsStore {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);
  private readonly settingsWrite = signal<ContactStatusSettings>(this.readStored());
  private readonly settingsApiSnapshotWrite = signal<Record<string, unknown> | null>(null);

  readonly settings = this.settingsWrite.asReadonly();

  loadFromApi(): Observable<ContactStatusSettings> {
    if (isDemoMode() || !this.userStore.isAuthenticated()) {
      return of(this.settingsWrite());
    }
    const url = API_ENDPOINTS.contactStatusSettings.get();
    return this.http.get<ContactStatusSettingsApiModel>(url).pipe(
      map((payload) => this.fromApi(payload)),
      tap((settings) => {
        this.settingsWrite.set(settings);
        this.writeStored(settings);
      })
    );
  }

  updateAsync(next: ContactStatusSettings): Observable<ContactStatusSettings> {
    const normalized = this.normalize(next);
    this.settingsWrite.set(normalized);
    this.writeStored(normalized);
    if (isDemoMode() || !this.userStore.isAuthenticated()) {
      return of(normalized);
    }
    const url = API_ENDPOINTS.contactStatusSettings.update();
    return this.http.put<ContactStatusSettingsApiModel>(url, this.toApi(normalized)).pipe(
      map((payload) => this.fromApi(payload)),
      tap((settings) => {
        this.settingsWrite.set(settings);
        this.writeStored(settings);
      })
    );
  }

  resetAsync(): Observable<ContactStatusSettings> {
    if (isDemoMode() || !this.userStore.isAuthenticated()) {
      this.update(DEFAULT_SETTINGS);
      return of(this.settingsWrite());
    }
    const url = API_ENDPOINTS.contactStatusSettings.reset();
    return this.http.post<ContactStatusSettingsApiModel>(url, {}).pipe(
      map((payload) => this.fromApi(payload)),
      tap((settings) => {
        this.settingsWrite.set(settings);
        this.writeStored(settings);
      })
    );
  }

  update(next: ContactStatusSettings): void {
    this.updateAsync(next).subscribe({ error: () => undefined });
  }

  reset(): void {
    this.resetAsync().subscribe({ error: () => undefined });
  }

  statusOf(contact: IContact, now: Date = new Date()): ContactStatus {
    if (contact.status === 'out') {
      return 'out';
    }
    const rules = this.settingsWrite();
    const reference = contact.lastDonation ?? contact.creationDate;
    const daysSinceCreation = this.diffDays(contact.creationDate, now);
    const monthsSinceReference = this.diffMonths(reference, now);

    if (contact.donationCount <= 0 && daysSinceCreation <= rules.newForDays) {
      return 'new';
    }
    if (monthsSinceReference >= rules.inactiveAfterMonths) {
      return 'inactive';
    }
    if (monthsSinceReference >= rules.toRemindAfterMonths) {
      return 'to_remind';
    }
    return 'active';
  }

  private normalize(s: ContactStatusSettings): ContactStatusSettings {
    const toRemind = Math.max(1, Math.min(120, Math.floor(s.toRemindAfterMonths || 1)));
    const inactiveRaw = Math.max(toRemind + 1, Math.floor(s.inactiveAfterMonths || toRemind + 1));
    const inactive = Math.min(240, inactiveRaw);
    const newForDays = Math.max(1, Math.min(365, Math.floor(s.newForDays || 1)));
    return {
      newForDays,
      toRemindAfterMonths: toRemind,
      inactiveAfterMonths: inactive
    };
  }

  private readStored(): ContactStatusSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw) as Partial<ContactStatusSettings>;
      return this.normalize({
        newForDays: Number(parsed.newForDays ?? DEFAULT_SETTINGS.newForDays),
        toRemindAfterMonths: Number(parsed.toRemindAfterMonths ?? DEFAULT_SETTINGS.toRemindAfterMonths),
        inactiveAfterMonths: Number(parsed.inactiveAfterMonths ?? DEFAULT_SETTINGS.inactiveAfterMonths)
      });
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private writeStored(s: ContactStatusSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
    }
  }

  private toApi(s: ContactStatusSettings): Record<string, unknown> {
    const snapshot = this.settingsApiSnapshotWrite();
    const snapshotWithoutUserId = snapshot
      ? Object.fromEntries(Object.entries(snapshot).filter(([key]) => key !== 'userId'))
      : {};
    return {
      ...snapshotWithoutUserId,
      newDurationDays: s.newForDays,
      toRemindAfterMonths: s.toRemindAfterMonths,
      inactiveAfterMonths: s.inactiveAfterMonths
    };
  }

  private fromApi(payload: ContactStatusSettingsApiModel): ContactStatusSettings {
    this.settingsApiSnapshotWrite.set(payload as unknown as Record<string, unknown>);
    return this.normalize({
      newForDays: Number(payload.newDurationDays ?? DEFAULT_SETTINGS.newForDays),
      toRemindAfterMonths: Number(payload.toRemindAfterMonths ?? DEFAULT_SETTINGS.toRemindAfterMonths),
      inactiveAfterMonths: Number(payload.inactiveAfterMonths ?? DEFAULT_SETTINGS.inactiveAfterMonths)
    });
  }

  private diffDays(from: Date, to: Date): number {
    const ms = Math.max(0, to.getTime() - from.getTime());
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  private diffMonths(from: Date, to: Date): number {
    let m = (to.getFullYear() - from.getFullYear()) * 12;
    m += to.getMonth() - from.getMonth();
    return Math.max(0, m);
  }
}

