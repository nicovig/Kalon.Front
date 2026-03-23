import { Injectable, signal } from '@angular/core';
import { DonorStatus, IDonor } from '../../../core/models/donor.model';

export type DonorStatusSettings = {
  newForDays: number;
  toRemindAfterMonths: number;
  inactiveAfterMonths: number;
};

const STORAGE_KEY = 'kalon.donor.status.settings.v1';

const DEFAULT_SETTINGS: DonorStatusSettings = {
  newForDays: 30,
  toRemindAfterMonths: 12,
  inactiveAfterMonths: 24
};

@Injectable({ providedIn: 'root' })
export class DonorSettingsStore {
  private readonly settingsWrite = signal<DonorStatusSettings>(this.readStored());

  readonly settings = this.settingsWrite.asReadonly();

  update(next: DonorStatusSettings): void {
    const normalized = this.normalize(next);
    this.settingsWrite.set(normalized);
    this.writeStored(normalized);
  }

  reset(): void {
    this.update(DEFAULT_SETTINGS);
  }

  statusOf(donor: IDonor, now: Date = new Date()): DonorStatus {
    const rules = this.settingsWrite();
    const reference = donor.lastDonation ?? donor.creationDate;
    const daysSinceCreation = this.diffDays(donor.creationDate, now);
    const monthsSinceReference = this.diffMonths(reference, now);

    if (donor.donationCount <= 0 && daysSinceCreation <= rules.newForDays) {
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

  private normalize(s: DonorStatusSettings): DonorStatusSettings {
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

  private readStored(): DonorStatusSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw) as Partial<DonorStatusSettings>;
      return this.normalize({
        newForDays: Number(parsed.newForDays ?? DEFAULT_SETTINGS.newForDays),
        toRemindAfterMonths: Number(parsed.toRemindAfterMonths ?? DEFAULT_SETTINGS.toRemindAfterMonths),
        inactiveAfterMonths: Number(parsed.inactiveAfterMonths ?? DEFAULT_SETTINGS.inactiveAfterMonths)
      });
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private writeStored(s: DonorStatusSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
    }
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

