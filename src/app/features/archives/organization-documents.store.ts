import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_ENDPOINTS } from '../../core/api/api.endpoints';
import {
  ConfirmMailedResponseApiModel,
  GeneratedDocumentLightResponseApiModel,
  MailLogDetailsResponseApiModel,
  MailLogListResponseApiModel
} from '../../core/api/backend-api.model';
import { UserStore } from '../../core/auth/user.store';
import { isDemoMode } from '../../core/demo/demo-mode';
import { DEMO_STORAGE_KEYS, DemoPersistenceService } from '../../core/demo/demo-persistence.service';
import { createDemoMailLogsSeed } from '../../core/demo/demo-seed.data';

@Injectable({ providedIn: 'root' })
export class OrganizationDocumentsStore {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);
  private readonly demoPersistence = inject(DemoPersistenceService);

  private readonly generatedWrite = signal<GeneratedDocumentLightResponseApiModel[]>([]);
  private readonly mailLogsWrite = signal<MailLogListResponseApiModel[]>([]);
  private readonly loadedWrite = signal(false);

  readonly generatedDocuments = this.generatedWrite.asReadonly();
  readonly mailLogs = this.mailLogsWrite.asReadonly();
  readonly loaded = this.loadedWrite.asReadonly();

  readonly hasAny = computed(() => this.generatedWrite().length > 0 || this.mailLogsWrite().length > 0);

  load(): void {
    if (isDemoMode()) {
      const logs = this.demoPersistence.read(DEMO_STORAGE_KEYS.mailLogs, createDemoMailLogsSeed());
      const generated = this.demoPersistence.read<GeneratedDocumentLightResponseApiModel[]>(
        DEMO_STORAGE_KEYS.generatedDocuments,
        []
      );
      this.mailLogsWrite.set(logs.slice().sort((a, b) => this.tsOf(b.date) - this.tsOf(a.date)));
      this.generatedWrite.set(generated.slice().sort((a, b) => this.tsOf(b.createdAt) - this.tsOf(a.createdAt)));
      this.loadedWrite.set(true);
      return;
    }
    if (!this.userStore.isAuthenticated()) {
      this.loadedWrite.set(true);
      this.generatedWrite.set([]);
      this.mailLogsWrite.set([]);
      return;
    }
    forkJoin({
      generated: this.http.get<GeneratedDocumentLightResponseApiModel[]>(
        API_ENDPOINTS.organizationDocuments.listGenerated()
      ),
      logs: this.http.get<MailLogListResponseApiModel[]>(
        API_ENDPOINTS.organizationDocuments.listMailLogs()
      )
    })
      .pipe(
        map(({ generated, logs }) => {
          this.generatedWrite.set((generated ?? []).slice().sort((a, b) => this.tsOf(b.createdAt) - this.tsOf(a.createdAt)));
          this.mailLogsWrite.set((logs ?? []).slice().sort((a, b) => this.tsOf(b.date) - this.tsOf(a.date)));
          this.loadedWrite.set(true);
        }),
        catchError(() => {
          this.loadedWrite.set(true);
          return of(undefined);
        })
      )
      .subscribe();
  }

  pendingPaperConfirmationsCount(): number {
    return this.mailLogsWrite().filter(
      (r) => r.isEmail === false && String(r.status ?? '').toLowerCase() === 'printed'
    ).length;
  }

  getMailLogById(mailLogId: string): Observable<MailLogDetailsResponseApiModel> {
    const id = String(mailLogId ?? '').trim();
    if (isDemoMode()) {
      const row = this.mailLogsWrite().find((log) => String(log.id ?? '') === id);
      if (!row) {
        return of({ id });
      }
      return of({
        id,
        isEmail: row.isEmail ?? false,
        status: row.status ?? null,
        subject: row.type ?? null,
        createdAt: row.date,
        printedAt: row.isEmail === false ? row.date : null,
        mailedAt: String(row.status ?? '').toLowerCase() === 'mailed' ? row.date : null
      });
    }
    return this.http.get<MailLogDetailsResponseApiModel>(
      API_ENDPOINTS.organizationDocuments.getMailLogById({ id, light: false })
    );
  }

  confirmMailed(mailLogId: string): Observable<boolean> {
    const id = String(mailLogId ?? '').trim();
    if (!id) return of(false);
    if (isDemoMode()) {
      this.mailLogsWrite.update((logs) =>
        logs.map((log) =>
          String(log.id ?? '') === id
            ? {
                ...log,
                status: 'mailed',
                date: log.date ?? new Date().toISOString()
              }
            : log
        )
      );
      this.persistDemoMailLogs();
      return of(true);
    }
    return this.http
      .patch<ConfirmMailedResponseApiModel>(API_ENDPOINTS.sending.confirmMailed({ mailLogId: id }), null)
      .pipe(
        map(() => {
          this.mailLogsWrite.update((logs) =>
            logs.map((log) =>
              String(log.id ?? '') === id
                ? {
                    ...log,
                    status: 'mailed',
                    mailedAt: new Date().toISOString()
                  }
                : log
            )
          );
          return true;
        }),
        catchError(() => of(false))
      );
  }

  regenerateGeneratedDocument(generatedDocumentId: string): Observable<Blob | null> {
    const id = String(generatedDocumentId ?? '').trim();
    if (!id) return of(null);
    if (isDemoMode()) {
      return of(new Blob(['%PDF-1.4 demo'], { type: 'application/pdf' }));
    }
    return this.http
      .post(API_ENDPOINTS.organizationDocuments.regenerateGeneratedById({ id }), null, { responseType: 'blob' })
      .pipe(catchError(() => of(null)));
  }

  private persistDemoMailLogs(): void {
    if (!isDemoMode()) {
      return;
    }
    this.demoPersistence.write(DEMO_STORAGE_KEYS.mailLogs, this.mailLogsWrite());
  }

  private tsOf(value?: string): number {
    if (!value) return 0;
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : 0;
  }
}

