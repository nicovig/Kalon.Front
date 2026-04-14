import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonLabelComponent } from '../../../layout/button/button-label/button-label.component';
import { FormTextComponent } from '../../../layout/forms/text/form-text.component';
import { FormTextareaComponent } from '../../../layout/forms/textarea/form-textarea.component';
import { CardComponent } from '../../../layout/card/card.component';
import { PopupShellComponent } from '../../../layout/popup/popup-shell.component';
import { AccountMailAssetsStore, MailTextBlock, MailTextBlockRole } from '../account-mail-assets.store';
import { ToastService } from '../../../layout/toast/toast.service';

@Component({
  selector: 'account-mail-manager',
  standalone: true,
  imports: [CommonModule, CardComponent, PopupShellComponent, ButtonLabelComponent, FormTextComponent, FormTextareaComponent],
  templateUrl: './account-mail-manager.component.html',
  styleUrls: ['./account-mail-manager.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountMailManagerComponent {
  private readonly store = inject(AccountMailAssetsStore);
  private readonly toast = inject(ToastService);

  protected readonly textBlocks = this.store.textBlocks;
  protected readonly images = this.store.images;
  protected readonly documents = this.store.documents;
  protected readonly fiscalReceiptTemplates = this.store.fiscalReceiptTemplates;

  protected readonly editingTextBlockId = signal<string | null>(null);
  protected readonly textBlockPopupOpen = signal(false);
  protected readonly textBlockDraftLabel = signal('');
  protected readonly textBlockDraftContent = signal('');
  protected readonly textBlockDraftRole = signal<MailTextBlockRole>('text');
  protected readonly newTextBlockLabel = signal('');
  protected readonly newTextBlockContent = signal('');
  protected readonly newTextBlockRole = signal<MailTextBlockRole>('text');
  protected readonly editingReceiptTemplateId = signal<string | null>(null);
  protected readonly receiptTemplateLabel = signal('');
  protected readonly receiptTemplateBody = signal('');
  protected readonly receiptTemplateFooter = signal('');
  protected readonly newReceiptTemplateLabel = signal('');
  protected readonly newReceiptTemplateBody = signal('');
  protected readonly newReceiptTemplateFooter = signal("L'équipe de {{nom_association}}");

  protected readonly imageLabel = signal('');
  protected readonly documentLabel = signal('');
  protected readonly imageSelectedFileName = signal<string>('');
  protected readonly documentSelectedFileName = signal<string>('');

  @ViewChild('imageInput', { static: false })
  private readonly imageInput?: ElementRef<HTMLInputElement>;

  @ViewChild('documentInput', { static: false })
  private readonly documentInput?: ElementRef<HTMLInputElement>;

  protected openImagePicker(): void {
    this.imageInput?.nativeElement?.click();
  }

  protected openDocumentPicker(): void {
    this.documentInput?.nativeElement?.click();
  }

  protected toggleTextBlockPanel(block: MailTextBlock): void {
    const current = this.editingTextBlockId();
    if (current === block.id && this.textBlockPopupOpen()) {
      this.cancelTextBlockEdit();
      return;
    }
    this.editingTextBlockId.set(block.id);
    this.textBlockDraftLabel.set(block.label);
    this.textBlockDraftContent.set(block.content);
    this.textBlockDraftRole.set(block.role);
    this.textBlockPopupOpen.set(true);
  }

  protected cancelTextBlockEdit(): void {
    this.textBlockPopupOpen.set(false);
    this.editingTextBlockId.set(null);
    this.textBlockDraftLabel.set('');
    this.textBlockDraftContent.set('');
    this.textBlockDraftRole.set('text');
  }

  protected saveTextBlock(): void {
    const id = this.editingTextBlockId();
    if (!id) return;
    this.store.upsertTextBlock(id, this.textBlockDraftLabel(), this.textBlockDraftContent(), this.textBlockDraftRole());
    this.toast.show('Bloc de texte enregistré.', 'success', 2500);
    this.cancelTextBlockEdit();
  }

  protected saveNewTextBlock(): void {
    this.store.upsertTextBlock(null, this.newTextBlockLabel(), this.newTextBlockContent());
    this.toast.show('Bloc de texte ajouté.', 'success', 2500);
    this.clearNewTextBlockForm();
  }

  protected clearNewTextBlockForm(): void {
    this.newTextBlockLabel.set('');
    this.newTextBlockContent.set('');
    this.newTextBlockRole.set('text');
  }

  protected async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    const dataUrl = await this.readAsDataUrl(file);
    this.store.addImage(this.imageLabel(), file.name, dataUrl);
    this.imageLabel.set('');
    this.imageSelectedFileName.set(file.name);
    if (input) input.value = '';
    this.toast.show('Image ajoutée.', 'success', 2500);
  }

  protected async onDocumentSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    const dataUrl = await this.readAsDataUrl(file);
    this.store.addDocument(this.documentLabel(), file.name, file.type || 'application/octet-stream', dataUrl);
    this.documentLabel.set('');
    this.documentSelectedFileName.set(file.name);
    if (input) input.value = '';
    this.toast.show('Document ajouté.', 'success', 2500);
  }

  protected removeImage(id: string): void {
    this.store.removeImage(id);
    this.toast.show('Image supprimée.', 'success', 2500);
  }

  protected removeDocument(id: string): void {
    this.store.removeDocument(id);
    this.toast.show('Document supprimé.', 'success', 2500);
  }

  protected removeTextBlock(id: string): void {
    this.store.removeTextBlock(id);
    this.toast.show('Bloc de texte supprimé.', 'success', 2500);
    if (this.editingTextBlockId() === id) this.cancelTextBlockEdit();
  }

  protected toggleReceiptTemplatePanel(id: string): void {
    if (this.editingReceiptTemplateId() === id) {
      this.cancelEditReceiptTemplate();
      return;
    }
    const tpl = this.fiscalReceiptTemplates().find((t) => t.id === id);
    if (!tpl) return;
    this.editingReceiptTemplateId.set(id);
    this.receiptTemplateLabel.set(tpl.label);
    this.receiptTemplateBody.set(tpl.body);
    this.receiptTemplateFooter.set(tpl.footer);
  }

  protected cancelEditReceiptTemplate(): void {
    this.editingReceiptTemplateId.set(null);
    this.receiptTemplateLabel.set('');
    this.receiptTemplateBody.set('');
    this.receiptTemplateFooter.set('');
  }

  protected saveReceiptTemplate(): void {
    const id = this.editingReceiptTemplateId();
    if (!id) return;
    this.store.updateFiscalReceiptTemplate(id, this.receiptTemplateLabel(), this.receiptTemplateBody(), this.receiptTemplateFooter());
    this.toast.show('Modèle de reçu mis à jour.', 'success', 2500);
    this.cancelEditReceiptTemplate();
  }

  protected addReceiptTemplate(): void {
    this.store.addFiscalReceiptTemplate(
      this.newReceiptTemplateLabel(),
      this.newReceiptTemplateBody(),
      this.newReceiptTemplateFooter()
    );
    this.toast.show('Modèle de reçu ajouté.', 'success', 2500);
    this.newReceiptTemplateLabel.set('');
    this.newReceiptTemplateBody.set('');
    this.newReceiptTemplateFooter.set("L'équipe de {{nom_association}}");
  }

  protected removeReceiptTemplate(id: string): void {
    this.store.removeFiscalReceiptTemplate(id);
    if (this.editingReceiptTemplateId() === id) this.cancelEditReceiptTemplate();
    this.toast.show('Modèle de reçu supprimé.', 'success', 2500);
  }

  protected formatAddedAt(ts: number): string {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  private readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

