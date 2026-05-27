import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, forkJoin, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { UserStore } from '../../core/auth/user.store';
import { API_BASE_URL } from '../../core/config/api.config';
import { API_ENDPOINTS } from '../../core/api/api.endpoints';
import {
  ContentBlockResponseApiModel,
  ContentBlockUpsertRequestApiModel,
  EmailTemplateResponseApiModel,
  EmailTemplateUpsertRequestApiModel,
  OrganizationLogoResponseApiModel,
  OrganizationLogoUpsertRequestApiModel
} from '../../core/api/backend-api.model';

export type MailTextBlockRole = 'signature' | 'text';

export type MailTextBlock = {
  id: string;
  label: string;
  content: string;
  imageUrl: string;
  imageMimeType: string;
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
  private readonly logoWrite = signal<MailImageAsset | null>(null);
  private readonly documentsWrite = signal<MailDocumentAsset[]>([]);
  private readonly emailTemplatesWrite = signal<MailTemplate[]>([]);
  private readonly fiscalReceiptTemplatesWrite = signal<FiscalReceiptTemplate[]>([]);
  private readonly loadedWrite = signal(false);

  readonly textBlocks = this.textBlocksWrite.asReadonly();
  readonly logo = this.logoWrite.asReadonly();
  readonly images = computed(() => {
    const row = this.logoWrite();
    return row ? [row] : [];
  });
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
    forkJoin({
      blocks: this.http.get<ContentBlockResponseApiModel[]>(API_ENDPOINTS.contentBlock.list()),
      templates: this.http.get<EmailTemplateResponseApiModel[]>(API_ENDPOINTS.emailTemplate.list()),
      logo: this.http.get<OrganizationLogoResponseApiModel>(API_ENDPOINTS.organizationCustomContent.logo()).pipe(
        catchError(() => of(null))
      )
    })
      .pipe(
        map(({ blocks, templates, logo }) => {
          this.mapContentBlocks(blocks ?? []);
          this.mapTemplates(templates ?? []);
          this.applyLogoResponse(logo);
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
    const req = id
      ? this.http.put<ContentBlockResponseApiModel>(API_ENDPOINTS.contentBlock.update({ id }), payload)
      : this.http.post<ContentBlockResponseApiModel>(API_ENDPOINTS.contentBlock.create(), payload);
    req.subscribe({ next: () => this.loadAll(), error: () => undefined });
  }

  upsertSignatureBlock(
    id: string | null,
    label: string,
    content: string,
    imageDataUrl: string,
    imageMimeType: string
  ): void {
    const name = label.trim();
    const text = content.trim();
    const image = imageDataUrl.trim();
    if (!name || (!text && !image) || !this.userStore.isAuthenticated()) return;
    const mime = image ? (imageMimeType.trim() || this.mimeFromDataUrl(image) || 'image/png') : null;
    const payload: ContentBlockUpsertRequestApiModel = {
      name,
      kind: 'signature',
      content: text || null,
      storedPath: image || null,
      mimeType: mime,
      usableInEmail: true,
      usableInReceipt: true
    };
    const req = id
      ? this.http.put<ContentBlockResponseApiModel>(API_ENDPOINTS.contentBlock.update({ id }), payload)
      : this.http.post<ContentBlockResponseApiModel>(API_ENDPOINTS.contentBlock.createSignature(), payload);
    req.subscribe({ next: () => this.loadAll(), error: () => undefined });
  }

  removeTextBlock(id: string): void {
    if (!id || !this.userStore.isAuthenticated()) return;
    this.http.delete<void>(API_ENDPOINTS.contentBlock.remove({ id })).subscribe({
      next: () => this.loadAll(),
      error: () => undefined
    });
  }

  upsertLogo(dataUrl: string, mimeType: string, fileName: string): Observable<OrganizationLogoResponseApiModel> {
    const raw = dataUrl.trim();
    if (!raw || !this.userStore.isAuthenticated()) return EMPTY;
    const name = (fileName.trim() || 'logo.png').replace(/^.*[/\\]/, '') || 'logo.png';
    const mime = (mimeType.trim() || this.mimeFromDataUrl(raw) || 'image/png').trim();
    const payload: OrganizationLogoUpsertRequestApiModel = {
      fileName: name,
      mimeType: mime,
      fileSizeBytes: this.dataUrlByteLength(raw),
      storedPath: raw,
      content: raw
    };
    const url = API_ENDPOINTS.organizationCustomContent.logo();
    const existingId = this.logoWrite()?.id;
    const req = existingId
      ? this.http.put<OrganizationLogoResponseApiModel>(url, payload)
      : this.http.post<OrganizationLogoResponseApiModel>(url, payload);
    return req.pipe(tap(() => this.loadAll()));
  }

  removeLogo(): Observable<void> {
    if (!this.userStore.isAuthenticated()) return EMPTY;
    return this.http.delete<void>(API_ENDPOINTS.organizationCustomContent.logo()).pipe(tap(() => this.loadAll()));
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
      .post<ContentBlockResponseApiModel>(API_ENDPOINTS.contentBlock.create(), payload)
      .subscribe({ next: () => this.loadAll(), error: () => undefined });
  }

  removeDocument(id: string): void {
    if (!id || !this.userStore.isAuthenticated()) return;
    this.http.delete<void>(API_ENDPOINTS.contentBlock.remove({ id })).subscribe({
      next: () => this.loadAll(),
      error: () => undefined
    });
  }

  upsertEmailTemplate(
    id: string | null,
    label: string,
    subject: string,
    body: string,
    emailTemplateType = 'message'
  ): Observable<EmailTemplateResponseApiModel> {
    const name = label.trim();
    const subjectTrim = subject.trim();
    const bodyTrim = body.trim();
    if (!name || !bodyTrim || !this.userStore.isAuthenticated()) {
      return EMPTY;
    }
    const payload: EmailTemplateUpsertRequestApiModel = {
      name,
      subject: subjectTrim,
      body: bodyTrim,
      emailTemplateType: emailTemplateType.trim() || 'message'
    };
    const req = id
      ? this.http.put<EmailTemplateResponseApiModel>(API_ENDPOINTS.emailTemplate.update({ id }), payload)
      : this.http.post<EmailTemplateResponseApiModel>(API_ENDPOINTS.emailTemplate.create(), payload);
    return req.pipe(tap(() => this.loadAll()));
  }

  removeEmailTemplate(id: string): Observable<void> {
    if (!id || !this.userStore.isAuthenticated()) {
      return EMPTY;
    }
    return this.http.delete<void>(API_ENDPOINTS.emailTemplate.remove({ id })).pipe(tap(() => this.loadAll()));
  }

  addFiscalReceiptTemplate(label: string, body: string, footer: string): void {
    const payload = this.toTemplatePayload(label, body, footer);
    if (!payload || !this.userStore.isAuthenticated()) return;
    this.http
      .post<EmailTemplateResponseApiModel>(API_ENDPOINTS.emailTemplate.create(), payload)
      .subscribe({ next: () => this.loadAll(), error: () => undefined });
  }

  updateFiscalReceiptTemplate(id: string, label: string, body: string, footer: string): void {
    const payload = this.toTemplatePayload(label, body, footer);
    if (!id || !payload || !this.userStore.isAuthenticated()) return;
    this.http
      .put<EmailTemplateResponseApiModel>(API_ENDPOINTS.emailTemplate.update({ id }), payload)
      .subscribe({ next: () => this.loadAll(), error: () => undefined });
  }

  removeFiscalReceiptTemplate(id: string): void {
    if (!id || !this.userStore.isAuthenticated()) return;
    this.http.delete<void>(API_ENDPOINTS.emailTemplate.remove({ id })).subscribe({
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
    const documents: MailDocumentAsset[] = [];
    for (const item of items) {
      const id = String(item.id ?? '');
      if (!id) continue;
      const kind = String(item.kind ?? '').toLowerCase();
      const label = String(item.name ?? '').trim() || 'Bloc';
      const content = String(item.content ?? '');
      const storedPath = String(item.storedPath ?? '').trim();
      const mimeType = String(item.mimeType ?? '').trim();
      const addedAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      if (kind === 'image') {
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
      const imageUrl = role === 'signature' ? this.resolveSignatureImageUrl(content, storedPath) : '';
      textBlocks.push({
        id,
        label,
        content: role === 'signature' && this.isSignatureImageContent(content) ? '' : content,
        imageUrl,
        imageMimeType: role === 'signature' && imageUrl ? mimeType : '',
        role,
        addedAt
      });
    }
    this.textBlocksWrite.set(textBlocks);
    this.documentsWrite.set(documents);
  }

  private applyLogoResponse(resp: OrganizationLogoResponseApiModel | null): void {
    if (!resp?.id) {
      this.logoWrite.set(null);
      return;
    }
    const id = String(resp.id);
    const fileName = String(resp.fileName ?? 'Logo').trim() || 'Logo';
    const inline = String(resp.content ?? '').trim();
    const sp = String(resp.storedPath ?? '').trim();
    let dataUrl = '';
    if (inline.startsWith('data:')) {
      dataUrl = inline;
    } else if (inline) {
      dataUrl = inline;
    } else if (sp.startsWith('data:')) {
      dataUrl = sp;
    } else if (sp) {
      dataUrl = this.resolveAssetUrl(sp);
    }
    if (!dataUrl) {
      this.logoWrite.set(null);
      return;
    }
    this.logoWrite.set({
      id,
      label: fileName,
      fileName,
      dataUrl,
      addedAt: resp.createdAt ? new Date(resp.createdAt).getTime() : 0
    });
  }

  private resolveAssetUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = API_BASE_URL.replace(/\/$/, '');
    return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
  }

  private resolveSignatureImageUrl(content: string, storedPath: string): string {
    if (storedPath.startsWith('data:')) return storedPath;
    if (storedPath) return this.resolveAssetUrl(storedPath);
    if (this.isSignatureImageContent(content)) return content.trim();
    return '';
  }

  private isSignatureImageContent(content: string): boolean {
    const raw = String(content ?? '').trim();
    if (!raw) return false;
    return raw.startsWith('data:image/') || raw.startsWith('http://') || raw.startsWith('https://');
  }

  private dataUrlByteLength(dataUrl: string): number {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return 0;
    const b64 = dataUrl.slice(comma + 1);
    const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
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

