import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { API_ENDPOINTS } from '../../core/api/api.endpoints';
import { UserStore } from '../../core/auth/user.store';
import {
  ContactLinkingMode,
  normalizeContactLinkingMode
} from '../../core/models/contact-linking.model';

@Injectable({ providedIn: 'root' })
export class OrganizationLinkingStore {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);
  private readonly modeSignal = signal<ContactLinkingMode>('none');
  private readonly noteSignal = signal('');
  private loaded = false;
  private organizationRaw: Record<string, unknown> | null = null;

  mode(): ContactLinkingMode {
    return this.modeSignal();
  }

  note(): string {
    return this.noteSignal();
  }

  isLinkingEnabled(): boolean {
    return this.modeSignal() !== 'none';
  }

  ensureLoaded(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    this.load().subscribe({ error: () => undefined });
  }

  load(): Observable<{ mode: ContactLinkingMode; note: string }> {
    if (!this.userStore.isAuthenticated()) {
      return of({ mode: this.modeSignal(), note: this.noteSignal() });
    }
    return this.http.get<Record<string, unknown>>(API_ENDPOINTS.organization.get()).pipe(
      map((response) => this.applyOrganizationPayload(response)),
      tap((state) => {
        this.modeSignal.set(state.mode);
        this.noteSignal.set(state.note);
      })
    );
  }

  save(mode: ContactLinkingMode, note: string): Observable<{ mode: ContactLinkingMode; note: string }> {
    if (!this.userStore.isAuthenticated()) {
      this.modeSignal.set(mode);
      this.noteSignal.set(note);
      return of({ mode, note });
    }
    const base = this.organizationRaw ?? {};
    const payload: Record<string, unknown> = {
      ...base,
      contactLinkingMode: mode,
      contactLinkingNote: note.trim() || null
    };
    return this.http.put<Record<string, unknown>>(API_ENDPOINTS.organization.update(), payload).pipe(
      map((response) => this.applyOrganizationPayload(response ?? payload)),
      tap((state) => {
        this.modeSignal.set(state.mode);
        this.noteSignal.set(state.note);
      })
    );
  }

  hydrateFromOrganization(response: Record<string, unknown> | null | undefined): void {
    if (!response) {
      return;
    }
    const state = this.applyOrganizationPayload(response);
    this.modeSignal.set(state.mode);
    this.noteSignal.set(state.note);
    this.loaded = true;
  }

  private applyOrganizationPayload(response: Record<string, unknown>): {
    mode: ContactLinkingMode;
    note: string;
  } {
    this.organizationRaw = response;
    return {
      mode: normalizeContactLinkingMode(response['contactLinkingMode']),
      note: String(response['contactLinkingNote'] ?? '').trim()
    };
  }
}
