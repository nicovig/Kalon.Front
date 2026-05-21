import { Injectable } from '@angular/core';

export const DEMO_STORAGE_KEYS = {
  contacts: 'kalon.demo.contacts.v1',
  donations: 'kalon.demo.donations.v1',
  customContent: 'kalon.demo.custom-content.v1',
  organization: 'kalon.demo.organization.v1',
  mailLogs: 'kalon.demo.mail-logs.v1',
  generatedDocuments: 'kalon.demo.generated-documents.v1',
  notifications: 'kalon.demo.notifications.v1'
} as const;

@Injectable({ providedIn: 'root' })
export class DemoPersistenceService {
  read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  write<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
    }
  }

  clear(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
    }
  }
}
