import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { StepTrailComponent, StepTrailItem } from '../../layout/step-trail/step-trail.component';
import { ChoiceCardItem, ChoiceCardsComponent } from '../../layout/choice-cards/choice-cards.component';
import { TableColumn, TableComponent } from '../../layout/table/table.component';
import { ToastComponent } from '../../layout/toast/toast.component';
import { ToastService } from '../../layout/toast/toast.service';
import { MailEditorComponent, MailEditorImageAsset, MailEditorSnippet } from '../../layout/mail-editor/mail-editor.component';
import { FloatingStepBarComponent } from '../../layout/floating-step-bar/floating-step-bar.component';
import {
    MailContactSelectorComponent,
    MailSelectorItem,

} from './mail-contact-selector/mail-contact-selector.component';
import { ContactStoreService } from '../contact/contact.store';
import { ContactSettingsStore } from '../contact/settings/contact-settings.store';
import { ContactStatus, IContact, contactDisplayName } from '../../core/models/contact.model';
import { FormSelectOption } from '../../layout/forms/select/form-select.component';
import { DonationStoreService } from '../donation/donation.store';
import { OrganizationCustomContentStore } from '../account/organization-custom-content.store';
import { IaAgentCore, ReminderTemplateTone } from '../../core/ia-agent/ia_agent.core';
import { FormTextareaComponent } from '../../layout/forms/textarea/form-textarea.component';

type SendTypeKey = 'choix_type' | 'choix_canal' | 'destinataires' | 'modele' | 'ecriture' | 'apercu';
type SendType = 'relance' | 'recu_fiscal' | 'attestation_cotisation';
type SendMethod = 'email' | 'courrier';
type TemplateChoiceSource = 'template' | 'ia' | null;
type ContactContributionSummary = {
  totalAmount: number;
  count: number;
  firstDate: Date | null;
  lastDate: Date | null;
  lastAmount: number | null;
  averageAmount: number | null;
};

@Component({
  selector: 'mail-page',
  standalone: true,
  templateUrl: './mail.page.html',
  styleUrls: ['./mail.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TopbarComponent,
    ToastComponent,
    StepTrailComponent,
    ChoiceCardsComponent,
    TableComponent,
    ButtonLabelComponent,
    MailEditorComponent,
    FloatingStepBarComponent,
    MailContactSelectorComponent,
    FormTextareaComponent,
    FormsModule
  ]
})
export class MailPageComponent {
  protected readonly contactStore = inject(ContactStoreService);
  private readonly contactSettings = inject(ContactSettingsStore);
  private readonly donationStore = inject(DonationStoreService);
  private readonly customContentStore = inject(OrganizationCustomContentStore);
  private readonly iaAgent = inject(IaAgentCore);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly steps: StepTrailItem[] = [
    { key: 'choix_type', label: 'Type' },
    { key: 'choix_canal', label: 'Par quel moyen ?' },
    { key: 'destinataires', label: 'Destinataires' },
    { key: 'modele', label: 'Modèle' },
    { key: 'ecriture', label: 'Écriture' },
    { key: 'apercu', label: 'Aperçu' }
  ];

  protected readonly activeStepKey = signal<SendTypeKey>('choix_type');
  protected readonly selectedSendType = signal<SendType | null>(null);
  protected readonly selectedSendMethod = signal<SendMethod | null>(null);
  protected readonly selectedContactIds = signal<Set<string>>(new Set());
  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly kindFilter = signal('all');
  protected readonly departmentFilter = signal('all');
  protected readonly includeWithChannel = signal(true);
  protected readonly includeWithoutChannel = signal(true);
  protected readonly monthsSinceLastDonationMin = signal(0);
  protected readonly totalDonationMin = signal('');
  protected readonly totalDonationMax = signal('');
  protected readonly donationCountMin = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly itemsPerPage = 12;

  protected readonly methodOptions: ChoiceCardItem[] = [
    {
      key: 'email',
      icon: '📧',
      title: 'Email',
      hint: 'L\'adresse email est requise'
    },
    {
      key: 'courrier',
      icon: '📬',
      title: 'Courrier papier',
      hint: 'L\'adresse postale est requise'
    }
  ];
  protected readonly typeOptions: ChoiceCardItem[] = [
    {
      key: 'relance',
      icon: '💌',
      title: 'Relance ou message personnalisé',
      hint: 'Envoyez une relance ou un message personnalisé à vos contacts.',
    },
    {
      key: 'recu_fiscal',
      icon: '🧾',
      title: 'Reçu fiscal (Cerfa)',
      hint: 'Envoyez un reçu fiscal à vos contacts.',
    },
    {
      key: 'attestation_cotisation',
      icon: '📄',
      title: 'Attestation de cotisation',
      hint: 'Envoyez une attestation de cotisation à vos contacts.',
    }
  ];

  protected readonly statusOptions: FormSelectOption[] = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'active', label: 'Actif' },
    { value: 'to_remind', label: 'À relancer' },
    { value: 'new', label: 'Nouveau' },
    { value: 'inactive', label: 'Inactif' },
    { value: 'out', label: 'Sorti' }
  ];

  protected readonly kindOptions: FormSelectOption[] = [
    { value: 'all', label: 'Tous les types' },
    { value: 'donor', label: 'Donateur' },
    { value: 'member', label: 'Membre' },
    { value: 'helper', label: 'Bénévole' },
    { value: 'company', label: 'Entreprise' }
  ];

  protected readonly departmentOptions = computed<FormSelectOption[]>(() => {
    const codes = new Set<string>();
    for (const c of this.contactStore.contacts()) {
      const dept = this.departmentOf(c);
      if (dept) codes.add(dept);
    }
    return [
      { value: 'all', label: 'Tous les départements' },
      ...Array.from(codes)
        .sort((a, b) => a.localeCompare(b, 'fr'))
        .map((code) => ({ value: code, label: code }))
    ];
  });

  private readonly donationStatsByContact = computed(() => {
    const stats = new Map<string, ContactContributionSummary>();
    for (const donation of this.donationStore.donations()) {
      if (!donation.contactId) continue;
      const amount = this.parseNumberish(donation.amount) ?? 0;
      const date = this.toValidDate(donation.date);
      const current =
        stats.get(donation.contactId) ??
        { totalAmount: 0, count: 0, firstDate: null, lastDate: null, lastAmount: null, averageAmount: null };
      current.totalAmount += amount;
      current.count += 1;
      if (date && (!current.firstDate || date < current.firstDate)) {
        current.firstDate = date;
      }
      if (date && (!current.lastDate || date > current.lastDate)) {
        current.lastDate = date;
        current.lastAmount = amount;
      }
      current.averageAmount = current.count > 0 ? current.totalAmount / current.count : null;
      stats.set(donation.contactId, current);
    }
    return stats;
  });

  protected readonly filteredContacts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const kind = this.kindFilter();
    const dept = this.departmentFilter();
    const includeWithChannel = this.includeWithChannel();
    const includeWithoutChannel = this.includeWithoutChannel();
    const monthsMin = this.monthsSinceLastDonationMin();
    const totalMin = this.parseOptionalNumber(this.totalDonationMin());
    const totalMax = this.parseOptionalNumber(this.totalDonationMax());
    const donationCountMin = this.parseOptionalNumber(this.donationCountMin());
    return this.contactStore.contacts().filter((c) => {
      const hasChannel = this.hasSelectedChannel(c);
      if (!includeWithChannel && !includeWithoutChannel) return false;
      const computedStatus = this.contactSettings.statusOf(c);
      if (status !== 'all' && computedStatus !== status) return false;
      if (kind !== 'all' && c.kind !== kind) return false;
      if (dept !== 'all' && this.departmentOf(c) !== dept) return false;
      if (!includeWithChannel && hasChannel) return false;
      if (!includeWithoutChannel && !hasChannel) return false;
      if (monthsMin > 0 && !this.matchesLastDonationMonths(c, monthsMin)) return false;
      const stats = this.contactContributionSummary(c);
      const totalDonation = this.parseNumberish(stats.totalAmount);
      const donationCount = this.parseNumberish(stats.count);
      if (totalMin != null && (totalDonation == null || totalDonation < totalMin)) return false;
      if (totalMax != null && (totalDonation == null || totalDonation > totalMax)) return false;
      if (donationCountMin != null && (donationCount == null || donationCount < donationCountMin)) return false;
      if (!q) return true;
      const haystack = [
        contactDisplayName(c),
        c.firstname,
        c.lastname,
        c.enterprise?.name,
        c.email,
        c.address?.city,
        c.address?.postalCode,
        c.enterprise?.address?.city,
        c.enterprise?.address?.postalCode,
        this.contactKindLabel(c.kind),
        this.formatAmount(c.totalDonation),
        c.lastDonationAmount == null ? '' : this.formatAmount(c.lastDonationAmount),
        c.averageDonationAmount == null ? '' : this.formatAmount(c.averageDonationAmount)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  protected readonly contactsCount = computed(() => this.contactStore.contacts().length);
  protected readonly hasTemplateStep = computed(() => this.selectedSendType() === 'relance');

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredContacts().length / this.itemsPerPage))
  );

  protected readonly pagedContacts = computed(() => {
    const start = this.pageIndex() * this.itemsPerPage;
    return this.filteredContacts().slice(start, start + this.itemsPerPage);
  });

  protected readonly recipientItems = computed<MailSelectorItem[]>(() =>
    this.pagedContacts().map((c) => {
      const status = this.contactSettings.statusOf(c);
      const warningText = this.hasSelectedChannel(c)
        ? ''
        : this.selectedSendMethod() === 'courrier'
          ? 'Adresse postale manquante pour un envoi papier'
          : 'Adresse email manquante pour un envoi email';
      return {
        id: c.id,
        title: contactDisplayName(c),
        subtitle: this.contactSubtitle(c),
        avatarText: this.initials(c),
        badgeText: this.statusLabel(status),
        badgeClass: status === 'active' || status === 'new' ? 'db-actif' : 'db-relance',
        infoText: this.contactInfoLine(c),
        detailText: this.contactContributionDetailLine(c),
        warningText: warningText || undefined
      };
    })
  );

  protected readonly selectedCount = computed(() => this.selectedContactIds().size);
  protected readonly selectedRecipients = computed(() => {
    const selectedIds = this.selectedContactIds();
    return this.contactStore
      .contacts()
      .filter((c) => selectedIds.has(c.id))
      .map((c) => ({
        id: c.id,
        name: contactDisplayName(c),
        subtitle: this.contactSubtitle(c)
      }));
  });

  protected readonly invalidSelectedContacts = computed(() =>
    this.contactStore
      .contacts()
      .filter((c) => this.selectedContactIds().has(c.id) && !this.hasSelectedChannel(c))
  );

  protected readonly recipientAlertMessage = computed(() => {
    const invalid = this.invalidSelectedContacts();
    if (!invalid.length) return null;
    const names = invalid.slice(0, 3).map((c) => contactDisplayName(c)).join(', ');
    const suffix = invalid.length > 3 ? ` et ${invalid.length - 3} autre(s)` : '';
    return this.selectedSendMethod() === 'courrier'
      ? `Attention, ${names}${suffix} n'ont pas leur adresse postale renseignée.`
      : `Attention, ${names}${suffix} n'ont pas leur adresse email renseignée.`;
  });

  constructor() {
    this.contactStore.loadContactsFromApi().subscribe({ error: () => undefined });
    this.donationStore.loadDonationsFromApi().subscribe({ error: () => undefined });
    this.customContentStore.ensureLoaded();
    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      const type = this.parseSendType(params.get('type'));
      const method = this.parseSendMethod(params.get('canal'));
      const contactIds = (params.get('contactIds') ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const step = params.get('step');

      if (type) {
        this.selectedSendType.set(type);
      }
      if (method) {
        this.selectedSendMethod.set(method);
      }
      if (contactIds.length) {
        this.selectedContactIds.set(new Set(contactIds));
      }

      if (step === 'modele') {
        this.activeStepKey.set(type === 'relance' ? 'modele' : 'ecriture');
        return;
      }
      if (step === 'ecriture') {
        this.activeStepKey.set('ecriture');
        return;
      }
      if (step === 'destinataires') {
        this.activeStepKey.set('destinataires');
      }
    });
  }

  protected chooseType(kind: SendType): void {
    this.selectedSendType.set(kind);
  }

  protected chooseMethod(kind: SendMethod): void {
    this.selectedSendMethod.set(kind);
  }

  protected goToMethodStep(): void {
    if (!this.selectedSendType()) return;
    this.activeStepKey.set('choix_canal');
  }

  protected goToRecipientsStep(): void {
    if (!this.selectedSendMethod()) return;
    this.activeStepKey.set('destinataires');
  }

  protected goToTemplateStep(): void {
    if (!this.selectedContactIds().size) return;
    this.activeStepKey.set(this.hasTemplateStep() ? 'modele' : 'ecriture');
  }

  protected readonly signatureBlocks = computed(() => this.customContentStore.textBlocks().filter((b) => b.role === 'signature'));
  protected readonly emailTemplates = computed(() => this.customContentStore.emailTemplates());
  protected readonly emailTemplateColumns: TableColumn[] = [
    { key: 'label', header: 'Nom', searchable: true },
    { key: 'subject', header: 'Objet', searchable: true }
  ];
  protected readonly emailTemplateRows = computed(() =>
    this.emailTemplates().map((tpl) => ({
      id: tpl.id,
      label: tpl.label,
      subject: tpl.subject || '—',
      raw: tpl
    }))
  );
  protected readonly editorTextBlocks = computed<MailEditorSnippet[]>(() =>
    this.customContentStore.textBlocks().map((block) => ({
      id: block.id,
      label: block.label,
      text: block.content
    }))
  );
  protected readonly editorImages = computed<MailEditorImageAsset[]>(() =>
    this.customContentStore.images().map((image) => ({
      id: image.id,
      label: image.label,
      dataUrl: image.dataUrl
    }))
  );
  protected readonly selectedEditorTextBlockId = signal<string | null>(null);
  protected readonly selectedEditorImageId = signal<string | null>(null);

  protected readonly aiToneCards: Array<{ key: ReminderTemplateTone; icon: string; label: string }> = [
    { key: 'douce', icon: '😌', label: 'Relance douce' },
    { key: 'fidelisation', icon: '🤝', label: 'Fidélisation' },
    { key: 'remerciement', icon: '🙏', label: 'Remerciement' },
    { key: 'urgence', icon: '🚨', label: 'Urgence' },
    { key: 'saisonnier', icon: '🎄', label: 'Saisonnier' },
    { key: 'adhesion_renewal', icon: '♻️', label: "Renouvellement d'adhésion" }
  ];
  protected readonly iaContextPlaceholders: Record<ReminderTemplateTone, string> = {
    douce: "Exemple : relance douce après 12 mois d'inactivité, mettre en avant l'impact concret des dons…",
    fidelisation: "Exemple : fidélisation, rappeler l'engagement passé et proposer un renouvellement…",
    remerciement: 'Exemple : remercier pour le dernier don et rappeler ce que cela a permis…',
    urgence: "Exemple : situation actuelle et pourquoi un geste maintenant aide vraiment…",
    saisonnier: 'Exemple : contexte de la période et prochaines actions à soutenir…',
    adhesion_renewal: "Exemple : nouvelle saison, bénéfices pour les membres, renouvellement d'adhésion…"
  };

  protected readonly selectedSignatureBlockId = signal<string | null>(null);
  protected readonly selectedEmailTemplateId = signal<string | null>(null);

  protected readonly selectedAiTone = signal<ReminderTemplateTone>('douce');
  protected readonly iaPrompt = signal('');
  protected readonly templateChoiceSource = signal<TemplateChoiceSource>(null);
  protected readonly iaGenerationState = signal<'idle' | 'loading' | 'done'>('idle');
  protected readonly generatedSubject = signal('');
  protected readonly generatedBody = signal('');
  protected readonly canContinueFromTemplateStep = computed(() => {
    if (!this.hasTemplateStep()) return true;
    if (this.templateChoiceSource() === 'template') return !!this.getSelectedEmailTemplate();
    if (this.templateChoiceSource() === 'ia') return this.iaGenerationState() === 'done' && !!this.generatedBody();
    return false;
  });

  private readonly syncSelectedSignatureBlockEffect = effect(() => {
    if (!this.selectedSignatureBlockId() && this.signatureBlocks().length) {
      this.selectedSignatureBlockId.set(this.signatureBlocks()[0]?.id ?? null);
    }
  });
  private readonly syncSelectedEmailTemplateEffect = effect(() => {
    if (!this.selectedEmailTemplateId() && this.emailTemplates().length) {
      this.selectedEmailTemplateId.set(this.emailTemplates()[0]?.id ?? null);
    }
  });
  private readonly syncEditorAssetsEffect = effect(() => {
    if (!this.selectedEditorTextBlockId() && this.editorTextBlocks().length) {
      this.selectedEditorTextBlockId.set(this.editorTextBlocks()[0]?.id ?? null);
    }
    if (!this.selectedEditorImageId() && this.editorImages().length) {
      this.selectedEditorImageId.set(this.editorImages()[0]?.id ?? null);
    }
  });

  protected getSelectedSignatureContent(): string {
    const id = this.selectedSignatureBlockId();
    if (!id) return '';
    return this.signatureBlocks().find((b) => b.id === id)?.content ?? '';
  }

  protected getSelectedEmailTemplate(): { id: string; label: string; subject: string; body: string; emailTemplateType: string; addedAt: number } | null {
    const id = this.selectedEmailTemplateId();
    if (!id) return null;
    return this.emailTemplates().find((t) => t.id === id) ?? null;
  }

  protected onSelectSignatureBlock(id: string): void {
    this.selectedSignatureBlockId.set(id);
  }

  protected onSelectEmailTemplate(id: string): void {
    this.selectedEmailTemplateId.set(id);
    this.templateChoiceSource.set('template');
  }

  protected onEmailTemplateRowClick(row: unknown): void {
    const id = typeof row === 'object' && row ? String((row as { id?: string }).id ?? '') : '';
    if (!id) return;
    this.onSelectEmailTemplate(id);
  }

  protected async generateAiText(): Promise<void> {
    const tone = this.selectedAiTone();
    const signatureText = this.getSelectedSignatureContent().trim();
    const signatureHtml = signatureText ? `<p>${signatureText}</p>` : `<p>L'équipe de {{nom_association}}</p>`;

    this.iaGenerationState.set('loading');
    try {
      const response = await firstValueFrom(this.iaAgent.generateReminderTemplate({ tone }));
      const body = response.body.includes('{{signature_footer}}')
        ? response.body.replace('{{signature_footer}}', signatureHtml)
        : response.body + signatureHtml;
      const method = this.selectedSendMethod();

      this.generatedSubject.set(response.subject);
      this.generatedBody.set(method === 'courrier' ? body : body);
      this.templateChoiceSource.set('ia');
      this.iaGenerationState.set('done');
      this.toast.show('Texte généré.', 'success');
    } catch {
      this.iaGenerationState.set('idle');
    }
  }

  protected onAiPrimaryAction(): void {
    if (this.iaGenerationState() === 'loading') {
      return;
    }
    if (this.iaGenerationState() === 'done' && this.generatedBody()) {
      this.templateChoiceSource.set('ia');
      this.toast.show('Texte IA sélectionné.', 'info', 1800);
      return;
    }
    void this.generateAiText();
  }

  protected selectAiTone(value: ReminderTemplateTone): void {
    this.selectedAiTone.set(value);
  }

  protected templateChoiceLabel(): string {
    if (this.templateChoiceSource() === 'template') {
      return this.getSelectedEmailTemplate()?.label
        ? `Modèle stocké : ${this.getSelectedEmailTemplate()?.label}`
        : 'Modèle stocké';
    }
    if (this.templateChoiceSource() === 'ia') {
      return 'Génération par IA';
    }
    return 'Aucun choix sélectionné';
  }

  protected iaButtonLabel(): string {
    if (this.iaGenerationState() === 'loading') return 'Génération en cours...';
    if (this.iaGenerationState() === 'done' && this.templateChoiceSource() === 'ia') return 'Utiliser le texte généré';
    if (this.iaGenerationState() === 'done') return 'Utiliser le texte généré';
    return '✨ Générer un texte';
  }

  protected goToPreviousStep(): void {
    const current = this.activeStepKey();
    if (current === 'choix_canal') {
      this.activeStepKey.set('choix_type');
      return;
    }
    if (current === 'destinataires') {
      this.activeStepKey.set('choix_canal');
      return;
    }
    if (current === 'modele') {
      this.activeStepKey.set('destinataires');
      return;
    }
    if (current === 'ecriture') {
      this.activeStepKey.set(this.hasTemplateStep() ? 'modele' : 'destinataires');
      return;
    }
    if (current === 'apercu') {
      this.activeStepKey.set('ecriture');
      return;
    }
  }

  protected goToWritingStep(): void {
    if (!this.canContinueFromTemplateStep()) return;
    if (this.hasTemplateStep() && this.templateChoiceSource() === 'template') {
      const template = this.getSelectedEmailTemplate();
      if (template) {
        this.generatedSubject.set(template.subject);
        this.generatedBody.set(template.body);
      }
    }
    this.activeStepKey.set('ecriture');
  }

  protected goToPreviewStep(): void {
    this.activeStepKey.set('apercu');
  }

  protected onSearchQueryChange(value: string): void {
    this.searchQuery.set(value);
    this.pageIndex.set(0);
  }

  protected onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.pageIndex.set(0);
  }

  protected onKindFilterChange(value: string): void {
    this.kindFilter.set(value);
    this.pageIndex.set(0);
  }

  protected onDepartmentFilterChange(value: string): void {
    this.departmentFilter.set(value);
    this.pageIndex.set(0);
  }

  protected onIncludeWithChannelChange(value: boolean): void {
    this.includeWithChannel.set(value);
    this.pageIndex.set(0);
  }

  protected onIncludeWithoutChannelChange(value: boolean): void {
    this.includeWithoutChannel.set(value);
    this.pageIndex.set(0);
  }

  protected onMonthsSinceLastDonationMinChange(value: number): void {
    this.monthsSinceLastDonationMin.set(value);
    this.pageIndex.set(0);
  }

  protected onTotalDonationMinChange(value: string): void {
    this.totalDonationMin.set(value);
    this.pageIndex.set(0);
  }

  protected onTotalDonationMaxChange(value: string): void {
    this.totalDonationMax.set(value);
    this.pageIndex.set(0);
  }

  protected onDonationCountMinChange(value: string): void {
    this.donationCountMin.set(value);
    this.pageIndex.set(0);
  }

  protected toggleContact(id: string): void {
    const next = new Set(this.selectedContactIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedContactIds.set(next);
  }

  protected selectAllFiltered(): void {
    this.selectedContactIds.set(new Set(this.filteredContacts().map((c) => c.id)));
  }

  protected deselectAll(): void {
    this.selectedContactIds.set(new Set());
  }

  protected removeSelectedContact(id: string): void {
    const next = new Set(this.selectedContactIds());
    if (!next.delete(id)) return;
    this.selectedContactIds.set(next);
    if (!next.size && this.activeStepKey() !== 'destinataires') {
      this.activeStepKey.set('destinataires');
    }
  }

  protected prevPage(): void {
    this.pageIndex.set(Math.max(0, this.pageIndex() - 1));
  }

  protected nextPage(): void {
    this.pageIndex.set(Math.min(this.totalPages() - 1, this.pageIndex() + 1));
  }

  private hasSelectedChannel(c: IContact): boolean {
    if (this.selectedSendMethod() === 'courrier') {
      return Boolean(
        c.address?.street?.trim() ||
        c.address?.postalCode?.trim() ||
        c.address?.city?.trim() ||
        c.enterprise?.address?.street?.trim() ||
        c.enterprise?.address?.postalCode?.trim() ||
        c.enterprise?.address?.city?.trim()
      );
    }
    return Boolean(c.email?.trim() || c.enterprise?.contactEmail?.trim());
  }

  protected selectedSendTypeLabel(): string {
    const value = this.selectedSendType();
    if (value === 'relance') return 'Relance / message personnalisé';
    if (value === 'recu_fiscal') return 'Reçu fiscal';
    if (value === 'attestation_cotisation') return 'Attestation de cotisation';
    return '—';
  }

  protected selectedSendMethodLabel(): string {
    const value = this.selectedSendMethod();
    if (value === 'email') return 'Email';
    if (value === 'courrier') return 'Courrier papier';
    return '—';
  }

  protected selectedTemplateSourceLabel(): string {
    if (!this.hasTemplateStep()) {
      return 'Sans modèle';
    }
    if (this.templateChoiceSource() === 'template') {
      const selectedLabel = this.getSelectedEmailTemplate()?.label?.trim();
      return selectedLabel ? `Modèle : ${selectedLabel}` : 'Modèle stocké';
    }
    if (this.templateChoiceSource() === 'ia') {
      return 'Source : IA';
    }
    return 'Source non choisie';
  }

  private departmentOf(c: IContact): string | null {
    const raw = c.address?.postalCode?.trim() || c.enterprise?.address?.postalCode?.trim();
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 2) return null;
    if ((digits.startsWith('97') || digits.startsWith('98')) && digits.length >= 3) return digits.slice(0, 3);
    if (digits.startsWith('20')) {
      const third = digits[2] ?? '';
      return third === '0' || third === '1' ? '2A' : '2B';
    }
    return digits.slice(0, 2);
  }

  private contactSubtitle(c: IContact): string {
    const pieces = [];
    if (c.email?.trim() || c.enterprise?.contactEmail?.trim()) {
      pieces.push(c.email?.trim() || c.enterprise?.contactEmail?.trim() || '');
    }
    if (c.address?.city?.trim() || c.enterprise?.address?.city?.trim()) {
      pieces.push(c.address?.city?.trim() || c.enterprise?.address?.city?.trim() || '');
    }
    return pieces.join(' · ') || 'Aucune coordonnée principale';
  }

  private contactInfoLine(c: IContact): string {
    const summary = this.contactContributionSummary(c);
    const pieces = [this.contactKindLabel(c.kind)];
    const department = this.departmentOf(c);
    if (department) pieces.push(`Département ${department}`);
    pieces.push(`${summary.count} contribution${summary.count > 1 ? 's' : ''}`);
    pieces.push(`${this.formatAmount(summary.totalAmount)} cumulés`);
    return pieces.join(' · ');
  }

  private contactContributionDetailLine(c: IContact): string {
    const summary = this.contactContributionSummary(c);
    const pieces = [];
    if (summary.lastDate) {
      const lastAmount = summary.lastAmount == null ? '' : ` · ${this.formatAmount(summary.lastAmount)} €`;
      pieces.push(`Dernier don : ${this.formatShortDate(summary.lastDate)}${lastAmount}`);
    }
    if (summary.averageAmount != null && summary.count > 0) {
      pieces.push(`Don moyen : ${this.formatAmount(summary.averageAmount)} €`);
    }
    return pieces.join(' · ');
  }

  private statusLabel(status: ContactStatus): string {
    if (status === 'to_remind') return 'À relancer';
    if (status === 'new') return 'Nouveau';
    if (status === 'inactive') return 'Inactif';
    if (status === 'out') return 'Sorti';
    return 'Actif';
  }

  private initials(c: IContact): string {
    if (c.kind === 'company' && c.enterprise?.name) {
      const parts = c.enterprise.name.trim().split(/\s+/).filter(Boolean);
      const a = parts[0]?.[0] ?? '';
      const b = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
      return `${a}${b}`.toUpperCase() || '?';
    }
    return `${c.firstname?.[0] ?? ''}${c.lastname?.[0] ?? ''}`.toUpperCase() || '?';
  }

  private matchesLastDonationMonths(c: IContact, monthsMin: number): boolean {
    const lastDonation = this.contactContributionSummary(c).lastDate;
    if (!lastDonation) return false;
    return this.diffMonths(lastDonation, new Date()) >= monthsMin;
  }

  private contactContributionSummary(c: IContact): ContactContributionSummary {
    const aggregated = this.donationStatsByContact().get(c.id);
    const contactTotal = this.parseNumberish(c.totalDonation);
    const contactCount = this.parseNumberish(c.donationCount);
    const contactFirstDate = this.toValidDate(c.firstDonationAt);
    const contactLastDate = this.toValidDate(c.lastDonation);
    const contactLastAmount = this.parseNumberish(c.lastDonationAmount);
    const contactAverageAmount = this.parseNumberish(c.averageDonationAmount);
    return {
      totalAmount: contactTotal ?? aggregated?.totalAmount ?? 0,
      count: contactCount ?? aggregated?.count ?? 0,
      firstDate: contactFirstDate ?? aggregated?.firstDate ?? null,
      lastDate: contactLastDate ?? aggregated?.lastDate ?? null,
      lastAmount: contactLastAmount ?? aggregated?.lastAmount ?? null,
      averageAmount: contactAverageAmount ?? aggregated?.averageAmount ?? null
    };
  }

  private contactKindLabel(kind: IContact['kind']): string {
    if (kind === 'company') return 'Entreprise';
    if (kind === 'member') return 'Membre';
    if (kind === 'helper') return 'Bénévole';
    return 'Donateur';
  }

  private parseOptionalNumber(value: string): number | null {
    return this.parseNumberish(value);
  }

  private parseNumberish(value: unknown): number | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const normalized = raw.replace(/\s+/g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  private toValidDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  private formatShortDate(value: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(value);
  }

  private diffMonths(from: Date, to: Date): number {
    let m = (to.getFullYear() - from.getFullYear()) * 12;
    m += to.getMonth() - from.getMonth();
    return Math.max(0, m);
  }

  private parseSendType(value: string | null): SendType | null {
    if (value === 'relance' || value === 'recu_fiscal' || value === 'attestation_cotisation') {
      return value;
    }
    return null;
  }

  private parseSendMethod(value: string | null): SendMethod | null {
    if (value === 'email' || value === 'courrier') {
      return value;
    }
    return null;
  }
}

