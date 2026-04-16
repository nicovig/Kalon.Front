import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_ENDPOINTS } from '../../core/api/api.endpoints';
import {
  GeneratedDocumentLightResponseApiModel,
  MailLogLightResponseApiModel
} from '../../core/api/backend-api.model';
import { UserStore } from '../../core/auth/user.store';

@Injectable({ providedIn: 'root' })
export class OrganizationDocumentsStore {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);

  private readonly generatedWrite = signal<GeneratedDocumentLightResponseApiModel[]>([]);
  private readonly mailLogsWrite = signal<MailLogLightResponseApiModel[]>([]);
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
    const userId = this.userStore.userId;
    forkJoin({
      generated: this.http.get<GeneratedDocumentLightResponseApiModel[]>(
        API_ENDPOINTS.organizationDocuments.listGenerated({ userId })
      ),
      logs: this.http.get<MailLogLightResponseApiModel[]>(
        API_ENDPOINTS.organizationDocuments.listMailLogs({ userId })
      )
    })
      .pipe(
        map(({ generated, logs }) => {
          this.generatedWrite.set((generated ?? []).slice().sort((a, b) => this.tsOf(b.createdAt) - this.tsOf(a.createdAt)));
          this.mailLogsWrite.set((logs ?? []).slice().sort((a, b) => this.tsOf(b.createdAt) - this.tsOf(a.createdAt)));
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

  private tsOf(value?: string): number {
    if (!value) return 0;
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : 0;
  }
}

