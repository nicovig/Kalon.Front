import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_ENDPOINTS } from '../../core/api/api.endpoints';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { UserStore } from '../../core/auth/user.store';
import { OrganizationCustomContentStore } from './organization-custom-content.store';
import { ToastComponent } from '../../layout/toast/toast.component';
import { ToastService } from '../../layout/toast/toast.service';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { PopupShellComponent } from '../../layout/popup/popup-shell.component';

type AccountOrganizationInfo = {
  associationName: string;
  senderEmail: string;
  cerfaModel: string;
};
type RemoveTarget = { id: string; type: 'text' | 'signature' | 'image'; label: string } | null;

@Component({
  selector: 'account-page',
  standalone: true,
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TopbarComponent, ButtonLabelComponent, ToastComponent, PopupShellComponent]
})
export class AccountPageComponent {
  private readonly userStore = inject(UserStore);
  private readonly store = inject(OrganizationCustomContentStore);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly organizationInfo = signal<AccountOrganizationInfo>({
    associationName: this.userStore.currentUser?.associationName?.trim() || 'Association',
    senderEmail: this.userStore.currentUser?.email?.trim() || '—',
    cerfaModel: String((this.userStore.currentUser as { cerfaModel?: string } | null)?.cerfaModel ?? '').trim() || '11580'
  });
  protected readonly cerfaLabel = computed(() => {
    const value = String(this.organizationInfo().cerfaModel ?? '').trim();
    if (!value) return 'Non concerné';
    return value.startsWith('CERFA') ? value : `CERFA ${value}`;
  });

  protected readonly textBlocks = computed(() => this.store.textBlocks().filter((item) => item.role === 'text'));
  protected readonly signatureBlocks = computed(() => this.store.textBlocks().filter((item) => item.role === 'signature'));
  protected readonly images = this.store.images;

  protected readonly textLabel = signal('');
  protected readonly textContent = signal('');
  protected readonly editingTextId = signal<string | null>(null);

  protected readonly signatureLabel = signal('');
  protected readonly signatureContent = signal('');
  protected readonly editingSignatureId = signal<string | null>(null);

  protected readonly imageLabel = signal('');
  protected readonly imageDataUrl = signal('');
  protected readonly imageMimeType = signal('image/*');
  protected readonly imageEditingId = signal<string | null>(null);
  protected readonly removeTarget = signal<RemoveTarget>(null);

  constructor() {
    this.store.ensureLoaded();
    void this.loadOrganizationInfo();
  }

  protected editTextBlock(id: string): void {
    const row = this.textBlocks().find((item) => item.id === id);
    if (!row) return;
    this.editingTextId.set(row.id);
    this.textLabel.set(row.label);
    this.textContent.set(row.content);
  }

  protected saveTextBlock(): void {
    this.store.upsertTextBlock(this.editingTextId(), this.textLabel(), this.textContent(), 'text');
    this.cancelTextEdit();
    this.toast.show('Bloc texte enregistré.', 'success');
  }

  protected requestRemoveTextBlock(id: string): void {
    const row = this.textBlocks().find((item) => item.id === id);
    if (!row) return;
    this.removeTarget.set({ id, type: 'text', label: row.label });
  }

  protected cancelTextEdit(): void {
    this.editingTextId.set(null);
    this.textLabel.set('');
    this.textContent.set('');
  }

  protected editSignatureBlock(id: string): void {
    const row = this.signatureBlocks().find((item) => item.id === id);
    if (!row) return;
    this.editingSignatureId.set(row.id);
    this.signatureLabel.set(row.label);
    this.signatureContent.set(row.content);
  }

  protected saveSignatureBlock(): void {
    this.store.upsertTextBlock(this.editingSignatureId(), this.signatureLabel(), this.signatureContent(), 'signature');
    this.cancelSignatureEdit();
    this.toast.show('Signature enregistrée.', 'success');
  }

  protected requestRemoveSignatureBlock(id: string): void {
    const row = this.signatureBlocks().find((item) => item.id === id);
    if (!row) return;
    this.removeTarget.set({ id, type: 'signature', label: row.label });
  }

  protected cancelSignatureEdit(): void {
    this.editingSignatureId.set(null);
    this.signatureLabel.set('');
    this.signatureContent.set('');
  }

  protected async onImageFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    const dataUrl = await this.readAsDataUrl(file);
    this.imageLabel.set(file.name.replace(/\.[^.]+$/, ''));
    this.imageDataUrl.set(dataUrl);
    this.imageMimeType.set(file.type || 'image/*');
    this.imageEditingId.set(null);
  }

  protected editImage(id: string): void {
    const row = this.images().find((item) => item.id === id);
    if (!row) return;
    this.imageEditingId.set(row.id);
    this.imageLabel.set(row.label);
    this.imageDataUrl.set(row.dataUrl);
    this.imageMimeType.set(this.mimeFromDataUrl(row.dataUrl));
  }

  protected saveImage(): void {
    this.store.upsertImage(this.imageEditingId(), this.imageLabel(), this.imageDataUrl(), this.imageMimeType());
    this.cancelImageEdit();
    this.toast.show('Image enregistrée.', 'success');
  }

  protected requestRemoveImage(id: string): void {
    const row = this.images().find((item) => item.id === id);
    if (!row) return;
    this.removeTarget.set({ id, type: 'image', label: row.label });
  }

  protected cancelImageEdit(): void {
    this.imageEditingId.set(null);
    this.imageLabel.set('');
    this.imageDataUrl.set('');
    this.imageMimeType.set('image/*');
  }

  protected cancelRemove(): void {
    this.removeTarget.set(null);
  }

  protected confirmRemove(): void {
    const target = this.removeTarget();
    if (!target) return;
    if (target.type === 'image') {
      this.store.removeImage(target.id);
      if (this.imageEditingId() === target.id) this.cancelImageEdit();
      this.toast.show('Image supprimée.', 'success');
    } else {
      this.store.removeTextBlock(target.id);
      if (target.type === 'text' && this.editingTextId() === target.id) this.cancelTextEdit();
      if (target.type === 'signature' && this.editingSignatureId() === target.id) this.cancelSignatureEdit();
      this.toast.show(target.type === 'signature' ? 'Signature supprimée.' : 'Bloc texte supprimé.', 'success');
    }
    this.removeTarget.set(null);
  }

  private async loadOrganizationInfo(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<Record<string, unknown>>(API_ENDPOINTS.organization.get()));
      const associationName = String(response?.['name'] ?? this.organizationInfo().associationName).trim() || 'Association';
      const senderEmail = String(response?.['senderEmail'] ?? response?.['email'] ?? this.organizationInfo().senderEmail).trim() || '—';
      const cerfaModel = String(response?.['cerfaModel'] ?? this.organizationInfo().cerfaModel).trim() || '11580';
      this.organizationInfo.set({ associationName, senderEmail, cerfaModel });
    } catch {
    }
  }

  private readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private mimeFromDataUrl(dataUrl: string): string {
    const m = String(dataUrl ?? '').match(/^data:([^;,]+)[;,]/i);
    return m?.[1] || 'image/*';
  }
}

