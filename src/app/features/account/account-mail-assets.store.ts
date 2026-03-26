import { Injectable, signal } from '@angular/core';

export type MailTextBlock = {
  id: string;
  label: string;
  content: string;
  addedAt: number;
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

const STORAGE_KEY = 'kalon.account.mail.assets.v1';

type StoredMailAssets = {
  textBlocks: MailTextBlock[];
  images: MailImageAsset[];
  documents: MailDocumentAsset[];
};

const DEFAULT_TEXT_BLOCKS: MailTextBlock[] = [
  { id: 'team', label: "L'équipe de l'association", content: "L'équipe de {{nom_association}}", addedAt: 0 },
  { id: 'president', label: 'Présidence', content: 'Le président / la présidente de {{nom_association}}', addedAt: 0 },
  {
    id: 'address',
    label: 'Adresse de l’association',
    content: '{{nom_association}} · 12 rue des Associations · 75000 Paris',
    addedAt: 0
  }
];

@Injectable({ providedIn: 'root' })
export class AccountMailAssetsStore {
  private readonly textBlocksWrite = signal<MailTextBlock[]>(this.readStored().textBlocks);
  private readonly imagesWrite = signal<MailImageAsset[]>(this.readStored().images);
  private readonly documentsWrite = signal<MailDocumentAsset[]>(this.readStored().documents);

  readonly textBlocks = this.textBlocksWrite.asReadonly();
  readonly images = this.imagesWrite.asReadonly();
  readonly documents = this.documentsWrite.asReadonly();

  upsertTextBlock(id: string | null, label: string, content: string): void {
    const l = label.trim();
    const c = content.trim();
    if (!l || !c) return;
    const list = this.textBlocksWrite();
    if (id) {
      this.textBlocksWrite.set(list.map((b) => (b.id === id ? { ...b, label: l, content: c } : b)));
    } else {
      this.textBlocksWrite.set([{ id: this.newId('txt'), label: l, content: c, addedAt: Date.now() }, ...list]);
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

  private persist(): void {
    try {
      const data: StoredMailAssets = {
        textBlocks: this.textBlocksWrite(),
        images: this.imagesWrite(),
        documents: this.documentsWrite()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
    }
  }

  private readStored(): StoredMailAssets {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { textBlocks: DEFAULT_TEXT_BLOCKS, images: [], documents: [] };
      const parsed = JSON.parse(raw) as Partial<StoredMailAssets>;
      return {
        textBlocks:
          Array.isArray(parsed.textBlocks) && parsed.textBlocks.length
            ? parsed.textBlocks.map((b: any) => ({
                id: String(b?.id ?? this.newId('txt')),
                label: String(b?.label ?? '').trim(),
                content: String(b?.content ?? '').trim(),
                addedAt: typeof b?.addedAt === 'number' ? b.addedAt : 0
              }))
            : DEFAULT_TEXT_BLOCKS,
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
          : []
      };
    } catch {
      return { textBlocks: DEFAULT_TEXT_BLOCKS, images: [], documents: [] };
    }
  }

  private newId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

