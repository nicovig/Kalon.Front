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

@Injectable({ providedIn: 'root' })
export class OrganizationDocumentsStore {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);

  private readonly generatedWrite = signal<GeneratedDocumentLightResponseApiModel[]>([]);
  private readonly mailLogsWrite = signal<MailLogListResponseApiModel[]>([]);
  private readonly loadedWrite = signal(false);

  readonly generatedDocuments = this.generatedWrite.asReadonly();
  readonly mailLogs = this.mailLogsWrite.asReadonly();
  readonly loaded = this.loadedWrite.asReadonly();

  readonly hasAny = computed(() => this.generatedWrite().length > 0 || this.mailLogsWrite().length > 0);

  load(): void {
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
    return this.http.get<MailLogDetailsResponseApiModel>(
      API_ENDPOINTS.organizationDocuments.getMailLogById({ id, light: false })
    );
  }

  confirmMailed(mailLogId: string): Observable<boolean> {
    const id = String(mailLogId ?? '').trim();
    if (!id) return of(false);
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
    return this.http
      .post(API_ENDPOINTS.organizationDocuments.regenerateGeneratedById({ id }), null, { responseType: 'blob' })
      .pipe(catchError(() => of(null)));
  }

  private tsOf(value?: string): number {
    if (!value) return 0;
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : 0;
  }
}

