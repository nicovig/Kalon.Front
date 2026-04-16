import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserStore } from '../../core/auth/user.store';
import { API_ENDPOINTS } from '../../core/api/api.endpoints';
import {
  ContentBlockResponseApiModel,
  ContentBlockUpsertRequestApiModel,
  EmailTemplateResponseApiModel,
  EmailTemplateUpsertRequestApiModel
} from '../../core/api/backend-api.model';

export type MailTextBlockRole = 'signature' | 'text';

export type MailTextBlock = {
  id: string;
  label: string;
  content: string;
  addedAt: number;
  role: MailTextBlockRole;
};

export type MailImageAsset = {
  id: string;
  label: string;
  fileName: string;
  dataUrl: string;
  addedAt: number;
};

export type MailDocumentAsset = {
  id: string;
  label: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  addedAt: number;
};

export type FiscalReceiptTemplate = {
  id: string;
  label: string;
  body: string;
  footer: string;
  requiredMentions: string[];
  system: boolean;
  addedAt: number;
};

export type MailTemplate = {
  id: string;
  label: string;
  subject: string;
  body: string;
  emailTemplateType: string;
  addedAt: number;
};

const DEFAULT_RECEIPT_REQUIRED_MENTIONS = [
  "Identité de l'association bénéficiaire",
  'Coordonnées du donateur',
  'Date et nature du don',
  'Montant du don (ou valorisation)',
  'Référence fiscale / article applicable'
];

@Injectable({ providedIn: 'root' })
export class OrganizationCustomContentStore {
  private readonly http = inject(HttpClient);
  private readonly userStore = inject(UserStore);

  private readonly textBlocksWrite = signal<MailTextBlock[]>([]);
  private readonly imagesWrite = signal<MailImageAsset[]>([]);
  private readonly documentsWrite = signal<MailDocumentAsset[]>([]);
  private readonly emailTemplatesWrite = signal<MailTemplate[]>([]);
  private readonly fiscalReceiptTemplatesWrite = signal<FiscalReceiptTemplate[]>([]);
  private readonly loadedWrite = signal(false);

  readonly textBlocks = this.textBlocksWrite.asReadonly();
  readonly images = this.imagesWrite.asReadonly();
  readonly documents = this.documentsWrite.asReadonly();
  readonly emailTemplates = this.emailTemplatesWrite.asReadonly();
  readonly fiscalReceiptTemplates = this.fiscalReceiptTemplatesWrite.asReadonly();
  readonly loaded = this.loadedWrite.asReadonly();

  readonly hasTemplates = computed(() => this.fiscalReceiptTemplatesWrite().length > 0);

  ensureLoaded(): void {
    if (this.loadedWrite()) return;
    this.loadAll();
  }

  loadAll(): void {
    if (!this.userStore.isAuthenticated()) {
      this.loadedWrite.set(true);
      return;
    }
    const userId = this.userStore.userId;
    forkJoin({
      blocks: this.http.get<ContentBlockResponseApiModel[]>(API_ENDPOINTS.contentBlock.list({ userId })),
      templates: this.http.get<EmailTemplateResponseApiModel[]>(API_ENDPOINTS.emailTemplate.list({ userId }))
    })
      .pipe(
        map(({ blocks, templates }) => {
          this.mapContentBlocks(blocks ?? []);
          this.mapTemplates(templates ?? []);
          this.loadedWrite.set(true);
        }),
        catchError(() => {
          this.loadedWrite.set(true);
          return of(undefined);
        })
      )
      .subscribe();
  }

  upsertTextBlock(id: string | null, label: string, content: string, role: MailTextBlockRole = 'text'): void {
    const l = label.trim();
    const c = content.trim();
    if (!l || !c || !this.userStore.isAuthenticated()) return;
    const payload: ContentBlockUpsertRequestApiModel = {
      name: l,
      kind: role,
      content: c,
      mimeType: 'text/plain',
      usableInEmail: true,
      usableInReceipt: true
    };
    const userId = this.userStore.userId;
    const req = id
      ? this.http.put<ContentBlockResponseApiModel>(API_ENDPOINTS.contentBlock.update({ id, userId }), payload)
      : this.http.post<ContentBlockResponseApiModel>(API_ENDPOINTS.contentBlock.create({ userId }), payload);
    req.subscribe({ next: () => this.loadAll(), error: () => undefined });
  }

  removeTextBlock(id: string): void {
    if (!id || !this.userStore.isAuthenticated()) return;
    this.http.delete<void>(API_ENDPOINTS.contentBlock.remove({ id, userId: this.userStore.userId })).subscribe({
      next: () => this.loadAll(),
      error: () => undefined
    });
  }

  addImage(label: string, fileName: string, dataUrl: string): void {
    const l = label.trim() || fileName.trim();
    if (!l || !dataUrl.trim() || !this.userStore.isAuthenticated()) return;
    const payload: ContentBlockUpsertRequestApiModel = {
      name: l,
      kind: 'image',
      content: dataUrl,
      mimeType: this.mimeFromDataUrl(dataUrl) ?? 'image/*',
      usableInEmail: true,
      usableInReceipt: true
    };
    this.http
      .post<ContentBlockResponseApiModel>(API_ENDPOINTS.contentBlock.create({ userId: this.userStore.userId }), payload)
      .subscribe({ next: () => this.loadAll(), error: () => undefined });
  }

  removeImage(id: string): void {
    if (!id || !this.userStore.isAuthenticated()) return;
    this.http.delete<void>(API_ENDPOINTS.contentBlock.remove({ id, userId: this.userStore.userId })).subscribe({
      next: () => this.loadAll(),
      error: () => undefined
    });
  }

  addDocument(label: string, fileName: string, mimeType: string, dataUrl: string): void {
    const l = label.trim() || fileName.trim();
    if (!l || !dataUrl.trim() || !this.userStore.isAuthenticated()) return;
    const payload: ContentBlockUpsertRequestApiModel = {
      name: l,
      kind: 'document',
      content: dataUrl,
      mimeType: mimeType || this.mimeFromDataUrl(dataUrl) || 'application/octet-stream',
      usableInEmail: true,
      usableInReceipt: true
    };
    this.http
      .post<ContentBlockResponseApiModel>(API_ENDPOINTS.contentBlock.create({ userId: this.userStore.userId }), payload)
      .subscribe({ next: () => this.loadAll(), error: () => undefined });
  }

  removeDocument(id: string): void {
    if (!id || !this.userStore.isAuthenticated()) return;
    this.http.delete<void>(API_ENDPOINTS.contentBlock.remove({ id, userId: this.userStore.userId })).subscribe({
      next: () => this.loadAll(),
      error: () => undefined
    });
  }

  addFiscalReceiptTemplate(label: string, body: string, footer: string): void {
    const payload = this.toTemplatePayload(label, body, footer);
    if (!payload || !this.userStore.isAuthenticated()) return;
    this.http
      .post<EmailTemplateResponseApiModel>(API_ENDPOINTS.emailTemplate.create({ userId: this.userStore.userId }), payload)
      .subscribe({ next: () => this.loadAll(), error: () => undefined });
  }

  updateFiscalReceiptTemplate(id: string, label: string, body: string, footer: string): void {
    const payload = this.toTemplatePayload(label, body, footer);
    if (!id || !payload || !this.userStore.isAuthenticated()) return;
    this.http
      .put<EmailTemplateResponseApiModel>(API_ENDPOINTS.emailTemplate.update({ id, userId: this.userStore.userId }), payload)
      .subscribe({ next: () => this.loadAll(), error: () => undefined });
  }

  removeFiscalReceiptTemplate(id: string): void {
    if (!id || !this.userStore.isAuthenticated()) return;
    this.http.delete<void>(API_ENDPOINTS.emailTemplate.remove({ id, userId: this.userStore.userId })).subscribe({
      next: () => this.loadAll(),
      error: () => undefined
    });
  }

  private toTemplatePayload(label: string, body: string, footer: string): EmailTemplateUpsertRequestApiModel | null {
    const l = label.trim();
    const b = body.trim();
    const f = footer.trim();
    if (!l || !b || !f) return null;
    return {
      name: l,
      subject: '',
      body: JSON.stringify({ body: b, footer: f }),
      emailTemplateType: 'fiscal_receipt'
    };
  }

  private mapContentBlocks(items: ContentBlockResponseApiModel[]): void {
    const textBlocks: MailTextBlock[] = [];
    const images: MailImageAsset[] = [];
    const documents: MailDocumentAsset[] = [];
    for (const item of items) {
      const id = String(item.id ?? '');
      if (!id) continue;
      const kind = String(item.kind ?? '').toLowerCase();
      const label = String(item.name ?? '').trim() || 'Bloc';
      const content = String(item.content ?? '');
      const addedAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      if (kind === 'image') {
        images.push({
          id,
          label,
          fileName: label,
          dataUrl: content,
          addedAt
        });
        continue;
      }
      if (kind === 'document') {
        documents.push({
          id,
          label,
          fileName: label,
          mimeType: String(item.mimeType ?? 'application/octet-stream'),
          dataUrl: content,
          addedAt
        });
        continue;
      }
      const role: MailTextBlockRole = kind === 'signature' ? 'signature' : 'text';
      textBlocks.push({ id, label, content, role, addedAt });
    }
    this.textBlocksWrite.set(textBlocks);
    this.imagesWrite.set(images);
    this.documentsWrite.set(documents);
  }

  private mapTemplates(items: EmailTemplateResponseApiModel[]): void {
    const emailTemplates = items
      .filter((t) => String(t.emailTemplateType ?? '').toLowerCase() !== 'fiscal_receipt')
      .map((t): MailTemplate => {
        const parsed = this.parseTemplateBody(String(t.body ?? ''));
        return {
          id: String(t.id ?? ''),
          label: String(t.name ?? 'Modele'),
          subject: String(t.subject ?? '').trim(),
          body: parsed.body,
          emailTemplateType: String(t.emailTemplateType ?? '').trim(),
          addedAt: t.createdAt ? new Date(t.createdAt).getTime() : 0
        };
      })
      .filter((t) => !!t.id);
    const templates = items
      .filter((t) => String(t.emailTemplateType ?? '').toLowerCase() === 'fiscal_receipt')
      .map((t): FiscalReceiptTemplate => {
        const parsed = this.parseTemplateBody(String(t.body ?? ''));
        return {
          id: String(t.id ?? ''),
          label: String(t.name ?? 'Modèle'),
          body: parsed.body,
          footer: parsed.footer,
          requiredMentions: DEFAULT_RECEIPT_REQUIRED_MENTIONS,
          system: false,
          addedAt: t.createdAt ? new Date(t.createdAt).getTime() : 0
        };
      })
      .filter((t) => !!t.id);
    this.emailTemplatesWrite.set(emailTemplates);
    this.fiscalReceiptTemplatesWrite.set(templates);
  }

  private parseTemplateBody(raw: string): { body: string; footer: string } {
    try {
      const parsed = JSON.parse(raw) as { body?: string; footer?: string };
      return {
        body: String(parsed.body ?? '').trim(),
        footer: String(parsed.footer ?? "L'équipe de {{nom_association}}").trim()
      };
    } catch {
      return {
        body: raw,
        footer: "L'équipe de {{nom_association}}"
      };
    }
  }

  private mimeFromDataUrl(dataUrl: string): string | null {
    const m = dataUrl.match(/^data:([^;,]+)[;,]/i);
    return m?.[1] ?? null;
  }
}

