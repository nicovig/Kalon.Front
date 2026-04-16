import { Injectable, signal } from '@angular/core';

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

const STORAGE_KEY = 'kalon.account.mail.assets.v1';

type StoredMailAssets = {
  textBlocks: MailTextBlock[];
  images: MailImageAsset[];
  documents: MailDocumentAsset[];
  fiscalReceiptTemplates: FiscalReceiptTemplate[];
};



const DEFAULT_RECEIPT_REQUIRED_MENTIONS: string[] = [];

@Injectable({ providedIn: 'root' })
export class AccountMailAssetsStore {
  private readonly textBlocksWrite = signal<MailTextBlock[]>(this.readStored().textBlocks);
  private readonly imagesWrite = signal<MailImageAsset[]>(this.readStored().images);
  private readonly documentsWrite = signal<MailDocumentAsset[]>(this.readStored().documents);
  private readonly fiscalReceiptTemplatesWrite = signal<FiscalReceiptTemplate[]>(this.readStored().fiscalReceiptTemplates);

  readonly textBlocks = this.textBlocksWrite.asReadonly();
  readonly images = this.imagesWrite.asReadonly();
  readonly documents = this.documentsWrite.asReadonly();
  readonly fiscalReceiptTemplates = this.fiscalReceiptTemplatesWrite.asReadonly();

  upsertTextBlock(id: string | null, label: string, content: string, role: MailTextBlockRole = 'text'): void {
    const l = label.trim();
    const c = content.trim();
    if (!l || !c) return;
    const list = this.textBlocksWrite();
    if (id) {
      this.textBlocksWrite.set(
        list.map((b) => (b.id === id ? { ...b, label: l, content: c, role } : b))
      );
    } else {
      this.textBlocksWrite.set([
        { id: this.newId('txt'), label: l, content: c, addedAt: Date.now(), role },
        ...list
      ]);
    }
    this.persist();
  }

  removeTextBlock(id: string): void {
    this.textBlocksWrite.set(this.textBlocksWrite().filter((b) => b.id !== id));
    this.persist();
  }

  addImage(label: string, fileName: string, dataUrl: string): void {
    const l = label.trim() || fileName.trim();
    if (!l || !dataUrl.trim()) return;
    this.imagesWrite.set([{ id: this.newId('img'), label: l, fileName, dataUrl, addedAt: Date.now() }, ...this.imagesWrite()]);
    this.persist();
  }

  removeImage(id: string): void {
    this.imagesWrite.set(this.imagesWrite().filter((i) => i.id !== id));
    this.persist();
  }

  addDocument(label: string, fileName: string, mimeType: string, dataUrl: string): void {
    const l = label.trim() || fileName.trim();
    if (!l || !dataUrl.trim()) return;
    this.documentsWrite.set(
      [{ id: this.newId('doc'), label: l, fileName, mimeType, dataUrl, addedAt: Date.now() }, ...this.documentsWrite()]
    );
    this.persist();
  }

  removeDocument(id: string): void {
    this.documentsWrite.set(this.documentsWrite().filter((d) => d.id !== id));
    this.persist();
  }

  addFiscalReceiptTemplate(label: string, body: string, footer: string): void {
    const l = label.trim();
    const b = body.trim();
    const f = footer.trim();
    if (!l || !b || !f) return;
    this.fiscalReceiptTemplatesWrite.set([
      {
        id: this.newId('receipt'),
        label: l,
        body: b,
        footer: f,
        requiredMentions: DEFAULT_RECEIPT_REQUIRED_MENTIONS,
        system: false,
        addedAt: Date.now()
      },
      ...this.fiscalReceiptTemplatesWrite()
    ]);
    this.persist();
  }

  updateFiscalReceiptTemplate(id: string, label: string, body: string, footer: string): void {
    const l = label.trim();
    const b = body.trim();
    const f = footer.trim();
    if (!id || !l || !b || !f) return;
    this.fiscalReceiptTemplatesWrite.set(
      this.fiscalReceiptTemplatesWrite().map((tpl) =>
        tpl.id === id ? { ...tpl, label: l, body: b, footer: f } : tpl
      )
    );
    this.persist();
  }

  removeFiscalReceiptTemplate(id: string): void {
    if (!id) return;
    this.fiscalReceiptTemplatesWrite.set(
      this.fiscalReceiptTemplatesWrite().filter((tpl) => tpl.id !== id || tpl.system)
    );
    this.persist();
  }

  private persist(): void {
    try {
      const data: StoredMailAssets = {
        textBlocks: this.textBlocksWrite(),
        images: this.imagesWrite(),
        documents: this.documentsWrite(),
        fiscalReceiptTemplates: this.fiscalReceiptTemplatesWrite()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
    }
  }

  private readStored(): StoredMailAssets {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          textBlocks: [],
          images: [],
          documents: [],
          fiscalReceiptTemplates: []
        };
      }
      const parsed = JSON.parse(raw) as Partial<StoredMailAssets>;
      return {
        textBlocks:
          Array.isArray(parsed.textBlocks) && parsed.textBlocks.length
            ? parsed.textBlocks.map((b: any) => {
                const id = String(b?.id ?? this.newId('txt'));
                const roleRaw = b?.role;
                const role: MailTextBlockRole =
                  roleRaw === 'signature'
                    ? 'signature'
                    : roleRaw === 'text'
                      ? 'text'
                      : id === 'team' || id === 'president'
                        ? 'signature'
                        : 'text';
                return {
                  id,
                  label: String(b?.label ?? '').trim(),
                  content: String(b?.content ?? '').trim(),
                  addedAt: typeof b?.addedAt === 'number' ? b.addedAt : 0,
                  role
                };
              })
            : [],
        images: Array.isArray(parsed.images) ? (parsed.images as any[]).map((i) => ({
          id: String(i?.id ?? this.newId('img')),
          label: String(i?.label ?? '').trim(),
          fileName: String(i?.fileName ?? '').trim(),
          dataUrl: String(i?.dataUrl ?? ''),
          addedAt: typeof i?.addedAt === 'number' ? i.addedAt : 0
        })) : [],
        documents: Array.isArray(parsed.documents)
          ? (parsed.documents as any[]).map((d) => ({
              id: String(d?.id ?? this.newId('doc')),
              label: String(d?.label ?? '').trim(),
              fileName: String(d?.fileName ?? '').trim(),
              mimeType: String(d?.mimeType ?? ''),
              dataUrl: String(d?.dataUrl ?? ''),
              addedAt: typeof d?.addedAt === 'number' ? d.addedAt : 0
            }))
          : [],
        fiscalReceiptTemplates:
          Array.isArray(parsed.fiscalReceiptTemplates) && parsed.fiscalReceiptTemplates.length
            ? (parsed.fiscalReceiptTemplates as any[]).map((tpl) => ({
                id: String(tpl?.id ?? this.newId('receipt')),
                label: String(tpl?.label ?? '').trim(),
                body: String(tpl?.body ?? '').trim(),
                footer: String(tpl?.footer ?? '').trim(),
                requiredMentions:
                  Array.isArray(tpl?.requiredMentions) && tpl.requiredMentions.length
                    ? tpl.requiredMentions.map((m: unknown) => String(m))
                    : [],
                system: Boolean(tpl?.system),
                addedAt: typeof tpl?.addedAt === 'number' ? tpl.addedAt : 0
              }))
            : []
      };
    } catch {
      return {
        textBlocks: [],
        images: [],
        documents: [],
        fiscalReceiptTemplates: []
      };
    }
  }

  private newId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
