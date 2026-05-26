import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
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
import { ButtonCheckboxComponent } from '../../layout/button/checkbox/button-checkbox.component';
import {
  MailEditorComponent,
  MailEditorImageAsset,
  MailEditorSnippet,
  MailEditorVariableTag
} from '../../layout/mail-editor/mail-editor.component';
import { MailEditorVariableTagApiModel } from '../../core/api/backend-api.model';
import {
  ALL_ORGANIZATION_SEND_TYPES,
  parseAllowedSendTypesFromOrganization,
  serializeAllowedSendTypes
} from '../../core/organization-sending-preferences';

type AccountOrganizationInfo = {
  associationName: string;
  senderEmail: string;
  description: string;
  foundedYear: string;
  activitySector: string;
  audienceDescription: string;
};
type RemoveTarget =
  | { id: string; type: 'text' | 'signature' | 'emailTemplate'; label: string }
  | { type: 'logo'; label: string }
  | null;

@Component({
  selector: 'account-page',
  standalone: true,
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TopbarComponent,
    ButtonLabelComponent,
    ToastComponent,
    PopupShellComponent,
    ButtonCheckboxComponent,
    MailEditorComponent
  ]
})
export class AccountPageComponent {
  private readonly userStore = inject(UserStore);
  private readonly store = inject(OrganizationCustomContentStore);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected readonly organizationInfo = signal<AccountOrganizationInfo>({
    associationName: this.userStore.currentUser?.associationName?.trim() || 'Association',
    senderEmail: this.userStore.currentUser?.email?.trim() || '',
    description: '',
    foundedYear: '',
    activitySector: '',
    audienceDescription: ''
  });
  private readonly organizationRaw = signal<Record<string, unknown> | null>(null);

  protected readonly sendingPreferenceCards = [
    {
      key: 'message',
      icon: '💌',
      title: 'Relance ou message personnalisé',
      hint: 'Envoyez une relance ou un message personnalisé à vos contacts.'
    },
    {
      key: 'tax_receipt',
      icon: '🧾',
      title: 'Reçu fiscal',
      hint: 'Édition et envoi des reçus fiscaux.'
    },
    {
      key: 'payment_attestation',
      icon: '📄',
      title: 'Attestation de cotisation',
      hint: 'Envoyez une attestation de cotisation automatiquement générée à vos contacts.'
    },
    {
      key: 'membership_certificate',
      icon: '🏅',
      title: "Certificat d'adhésion",
      hint: 'Envoyez un certificat d\'adhésion automatiquement généré à vos contacts.'
    }
  ] as const;

  protected readonly sendingPreferencesSelected = signal<ReadonlySet<string>>(new Set(ALL_ORGANIZATION_SEND_TYPES));

  protected readonly textBlocks = computed(() => this.store.textBlocks().filter((item) => item.role === 'text'));
  protected readonly signatureBlocks = computed(() => this.store.textBlocks().filter((item) => item.role === 'signature'));
  protected readonly emailTemplates = this.store.emailTemplates;
  protected readonly logo = this.store.logo;

  protected readonly editorTextBlocks = computed<MailEditorSnippet[]>(() =>
    this.store.textBlocks().map((block) => ({
      id: block.id,
      label: block.label,
      text: block.content
    }))
  );
  protected readonly editorImages = computed<MailEditorImageAsset[]>(() =>
    this.store.images().map((image) => ({
      id: image.id,
      label: image.label,
      dataUrl: image.dataUrl
    }))
  );
  protected readonly selectedEditorTextBlockId = signal<string | null>(null);
  protected readonly selectedEditorImageId = signal<string | null>(null);
  private readonly editorVariableTagsWrite = signal<MailEditorVariableTag[]>([]);
  protected readonly editorVariableTags = computed(() => this.editorVariableTagsWrite());

  protected readonly textLabel = signal('');
  protected readonly textContent = signal('');
  protected readonly editingTextId = signal<string | null>(null);

  protected readonly signatureLabel = signal('');
  protected readonly signatureContent = signal('');
  protected readonly editingSignatureId = signal<string | null>(null);

  protected readonly emailTemplateLabel = signal('');
  protected readonly emailTemplateSubject = signal('');
  protected readonly emailTemplateBody = signal('');
  protected readonly editingEmailTemplateId = signal<string | null>(null);
  protected readonly emailTemplateSaving = signal(false);
  protected readonly emailTemplateSaveDisabled = computed(
    () => this.emailTemplateSaving() || !this.emailTemplateLabel().trim() || !this.emailTemplateBody().trim()
  );

  protected readonly imageDataUrl = signal('');
  protected readonly imageMimeType = signal('image/*');
  protected readonly imageChosenFileName = signal('');
  protected readonly logoPreviewSrc = computed(() => this.imageDataUrl().trim() || this.store.logo()?.dataUrl || '');
  protected readonly saveLogoDisabled = computed(() => {
    const draft = this.imageDataUrl().trim();
    if (!draft) return true;
    const server = this.store.logo()?.dataUrl?.trim() ?? '';
    if (!server) return false;
    return draft === server && !this.imageChosenFileName().trim();
  });
  protected readonly imageFileHint = computed(() => {
    const name = this.imageChosenFileName().trim();
    if (name) return name;
    const draft = this.imageDataUrl().trim();
    const server = this.store.logo()?.dataUrl ?? '';
    if (draft && server && draft === server) return 'Logo actuel';
    return 'Aucun fichier choisi';
  });
  protected readonly removeTarget = signal<RemoveTarget>(null);

  private lastImageFileInput: HTMLInputElement | null = null;

  constructor() {
    this.store.ensureLoaded();
    void this.loadOrganizationInfo();
    this.loadMailEditorTags();
    effect(() => {
      if (!this.selectedEditorTextBlockId() && this.editorTextBlocks().length) {
        this.selectedEditorTextBlockId.set(this.editorTextBlocks()[0]?.id ?? null);
      }
      if (!this.selectedEditorImageId() && this.editorImages().length) {
        this.selectedEditorImageId.set(this.editorImages()[0]?.id ?? null);
      }
    });
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

  protected editEmailTemplate(id: string): void {
    const row = this.emailTemplates().find((item) => item.id === id);
    if (!row) return;
    this.editingEmailTemplateId.set(row.id);
    this.emailTemplateLabel.set(row.label);
    this.emailTemplateSubject.set(row.subject);
    this.emailTemplateBody.set(row.body);
  }

  protected saveEmailTemplate(): void {
    if (this.emailTemplateSaveDisabled()) return;
    this.emailTemplateSaving.set(true);
    this.store
      .upsertEmailTemplate(
        this.editingEmailTemplateId(),
        this.emailTemplateLabel(),
        this.emailTemplateSubject(),
        this.emailTemplateBody()
      )
      .subscribe({
        next: () => {
          this.cancelEmailTemplateEdit();
          this.toast.show('Modèle d’email enregistré.', 'success');
          this.emailTemplateSaving.set(false);
        },
        error: () => {
          this.toast.show('Impossible d’enregistrer le modèle d’email.', 'alert');
          this.emailTemplateSaving.set(false);
        }
      });
  }

  protected requestRemoveEmailTemplate(id: string): void {
    const row = this.emailTemplates().find((item) => item.id === id);
    if (!row) return;
    this.removeTarget.set({ id, type: 'emailTemplate', label: row.label });
  }

  protected cancelEmailTemplateEdit(): void {
    this.editingEmailTemplateId.set(null);
    this.emailTemplateLabel.set('');
    this.emailTemplateSubject.set('');
    this.emailTemplateBody.set('');
  }

  protected emailTemplatePreviewText(html: string): string {
    const raw = String(html ?? '').trim();
    if (!raw) return '';
    const text = raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 160 ? `${text.slice(0, 160)}…` : text;
  }

  protected removeTargetMessage(target: RemoveTarget): string {
    if (!target) return '';
    if (target.type === 'logo') return 'Supprimer le logo ?';
    if (target.type === 'emailTemplate') return `Supprimer le modèle « ${target.label} » ?`;
    if (target.type === 'signature') return `Supprimer la signature « ${target.label} » ?`;
    return `Supprimer le bloc « ${target.label} » ?`;
  }

  protected pickImageFile(input: HTMLInputElement): void {
    input.click();
  }

  protected async onImageFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    this.lastImageFileInput = input;
    const file = input?.files?.[0];
    if (!file) {
      this.imageChosenFileName.set('');
      return;
    }
    const dataUrl = await this.readAsDataUrl(file);
    this.imageChosenFileName.set(file.name);
    this.imageDataUrl.set(dataUrl);
    this.imageMimeType.set(file.type || 'image/*');
  }

  protected saveLogo(): void {
    const dataUrl = this.imageDataUrl().trim();
    if (!dataUrl) return;
    const fileName = this.imageChosenFileName().trim() || this.store.logo()?.fileName || 'logo.png';
    this.store.upsertLogo(dataUrl, this.imageMimeType(), fileName).subscribe({
      next: () => {
        this.resetImageFileInputValue();
        this.cancelImageEdit();
        this.toast.show('Logo enregistré.', 'success');
      },
      error: () => {
        this.toast.show("Impossible d'enregistrer le logo. Vérifiez le fichier ou votre connexion.", 'alert');
      }
    });
  }

  protected requestRemoveLogo(): void {
    this.removeTarget.set({ type: 'logo', label: 'Logo' });
  }

  protected cancelImageEdit(): void {
    this.resetImageFileInputValue();
    this.imageChosenFileName.set('');
    this.imageDataUrl.set('');
    this.imageMimeType.set('image/*');
  }

  private resetImageFileInputValue(): void {
    const el = this.lastImageFileInput;
    if (el) el.value = '';
  }

  protected cancelRemove(): void {
    this.removeTarget.set(null);
  }

  protected confirmRemove(): void {
    const target = this.removeTarget();
    if (!target) return;
    if (target.type === 'logo') {
      this.store.removeLogo().subscribe({
        next: () => {
          this.cancelImageEdit();
          this.toast.show('Logo supprimé.', 'success');
          this.removeTarget.set(null);
        },
        error: () => {
          this.toast.show('Impossible de supprimer le logo.', 'alert');
        }
      });
      return;
    }
    if (target.type === 'emailTemplate') {
      this.store.removeEmailTemplate(target.id).subscribe({
        next: () => {
          if (this.editingEmailTemplateId() === target.id) this.cancelEmailTemplateEdit();
          this.toast.show('Modèle d’email supprimé.', 'success');
          this.removeTarget.set(null);
        },
        error: () => {
          this.toast.show('Impossible de supprimer le modèle d’email.', 'alert');
        }
      });
      return;
    }
    this.store.removeTextBlock(target.id);
    if (target.type === 'text' && this.editingTextId() === target.id) this.cancelTextEdit();
    if (target.type === 'signature' && this.editingSignatureId() === target.id) this.cancelSignatureEdit();
    this.toast.show(target.type === 'signature' ? 'Signature supprimée.' : 'Bloc texte supprimé.', 'success');
    this.removeTarget.set(null);
  }

  protected onOrganizationFieldChange<K extends keyof AccountOrganizationInfo>(key: K, value: string): void {
    this.organizationInfo.update((current) => ({ ...current, [key]: String(value ?? '') }));
  }

  protected sendingPreferenceChecked(key: string): boolean {
    return this.sendingPreferencesSelected().has(key);
  }

  protected toggleSendingPreference(key: string): void {
    this.sendingPreferencesSelected.update((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) {
          return prev;
        }
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  protected async saveAccountDetailsBlock(): Promise<void> {
    await this.persistOrganizationUpdate(
      'Informations de compte mises à jour.',
      "Impossible de mettre à jour les informations de compte."
    );
  }

  protected async saveSendingPreferencesBlock(): Promise<void> {
    await this.persistOrganizationUpdate(
      'Paramètres d’envoi enregistrés.',
      "Impossible d'enregistrer les paramètres d'envoi."
    );
  }

  private async persistOrganizationUpdate(successMessage: string, errorMessage: string): Promise<void> {
    const info = this.organizationInfo();
    const base = this.organizationRaw() ?? {};
    const foundedYearRaw = String(info.foundedYear ?? '').trim();
    const parsedFoundedYear = Number.parseInt(foundedYearRaw, 10);
    const payload: Record<string, unknown> = {
      ...base,
      name: info.associationName.trim(),
      email: info.senderEmail.trim(),
      senderEmail: info.senderEmail.trim(),
      description: info.description.trim() || null,
      foundedYear: Number.isFinite(parsedFoundedYear) ? parsedFoundedYear : null,
      activitySector: info.activitySector.trim() || null,
      audienceDescription: info.audienceDescription.trim() || null,
      sendingPreferences: serializeAllowedSendTypes(this.sendingPreferencesSelected())
    };
    try {
      const response = await firstValueFrom(this.http.put<Record<string, unknown>>(API_ENDPOINTS.organization.update(), payload));
      this.organizationRaw.set(response ?? payload);
      this.organizationInfo.set({
        associationName: String(response?.['name'] ?? payload['name'] ?? info.associationName).trim() || 'Association',
        senderEmail: String(response?.['senderEmail'] ?? response?.['email'] ?? payload['senderEmail'] ?? '').trim(),
        description: String(response?.['description'] ?? payload['description'] ?? '').trim(),
        foundedYear: this.normalizeFoundedYear(response?.['foundedYear'] ?? payload['foundedYear']),
        activitySector: String(response?.['activitySector'] ?? payload['activitySector'] ?? '').trim(),
        audienceDescription: String(response?.['audienceDescription'] ?? payload['audienceDescription'] ?? '').trim()
      });
      this.sendingPreferencesSelected.set(
        parseAllowedSendTypesFromOrganization(response?.['sendingPreferences'] ?? payload['sendingPreferences'])
      );
      this.toast.show(successMessage, 'success');
    } catch {
      this.toast.show(errorMessage, 'alert');
    }
  }

  private async loadOrganizationInfo(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<Record<string, unknown>>(API_ENDPOINTS.organization.get()));
      this.organizationRaw.set(response ?? null);
      const associationName = String(response?.['name'] ?? this.organizationInfo().associationName).trim() || 'Association';
      const senderEmail = String(response?.['senderEmail'] ?? response?.['email'] ?? this.organizationInfo().senderEmail).trim();
      const description = String(response?.['description'] ?? '').trim();
      const foundedYear = this.normalizeFoundedYear(response?.['foundedYear']);
      const activitySector = String(response?.['activitySector'] ?? '').trim();
      const audienceDescription = String(response?.['audienceDescription'] ?? '').trim();
      this.organizationInfo.set({
        associationName,
        senderEmail,
        description,
        foundedYear,
        activitySector,
        audienceDescription
      });
      this.sendingPreferencesSelected.set(parseAllowedSendTypesFromOrganization(response?.['sendingPreferences']));
    } catch {
    }
  }

  private normalizeFoundedYear(value: unknown): string {
    if (value == null) return '';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '';
    return String(Math.trunc(numeric));
  }

  private loadMailEditorTags(): void {
    this.http
      .get<MailEditorVariableTagApiModel[]>(
        API_ENDPOINTS.sending.mailEditorTags({ hasCompanyRecipient: true })
      )
      .subscribe({
        next: (tags) => {
          const normalized = (tags ?? [])
            .map((tag) => ({
              id: String(tag?.id ?? '').trim(),
              label: String(tag?.label ?? '').trim(),
              token: String(tag?.token ?? '').trim()
            }))
            .filter((tag) => tag.id && tag.label && tag.token);
          this.editorVariableTagsWrite.set(normalized);
        },
        error: () => {
          this.editorVariableTagsWrite.set([]);
        }
      });
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

