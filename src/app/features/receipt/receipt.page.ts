import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { FormTextareaComponent } from '../../layout/forms/textarea/form-textarea.component';
import { FormSelectComponent, FormSelectOption } from '../../layout/forms/select/form-select.component';
import { ContactStoreService } from '../contact/contact.store';
import { contactDisplayName, ContactStatus, IContact } from '../../core/models/contact.model';
import {
  AdvancedFilters,
  RecipientSelectorItem,
  QuickFilter,
  RecipientSelectorComponent
} from '../../layout/recipient-selector/recipient-selector.component';
import { ContactSettingsStore } from '../contact/settings/contact-settings.store';
import { AccountMailAssetsStore } from '../account/account-mail-assets.store';
import { DonationStoreService } from '../donation/donation.store';
import { ReceiptArchiveStore } from './receipt-archive.store';
import { MailAssetsSidebarComponent } from '../../layout/mail-assets-sidebar/mail-assets-sidebar.component';

@Component({
  selector: 'receipt-page',
  standalone: true,
  templateUrl: './receipt.page.html',
  styleUrls: ['./receipt.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TopbarComponent,
    ButtonLabelComponent,
    FormTextareaComponent,
    FormSelectComponent,
    RecipientSelectorComponent,
    MailAssetsSidebarComponent
  ]
})
export class ReceiptPageComponent implements OnInit {
  @ViewChild('receiptBodyTa') private receiptBodyTa?: FormTextareaComponent;
  @ViewChild('receiptFooterTa') private receiptFooterTa?: FormTextareaComponent;

  private readonly contactStore = inject(ContactStoreService);
  private readonly contactSettings = inject(ContactSettingsStore);
  private readonly accountMailAssetsStore = inject(AccountMailAssetsStore);
  private readonly donationStore = inject(DonationStoreService);
  private readonly receiptArchiveStore = inject(ReceiptArchiveStore);

  protected readonly contactsCount = computed(() =>
    this.contactStore.contacts().filter((c) => this.isEligibleForReceipt(c)).length
  );
  protected readonly itemsPerPage = 15;

  protected readonly quickFilter = signal<QuickFilter>('all');
  protected readonly searchQuery = signal('');
  protected readonly appliedMonthsMin = signal(0);
  protected readonly appliedTotalDonationMin = signal<number | null>(null);
  protected readonly appliedTotalDonationMax = signal<number | null>(null);
  protected readonly appliedDonationCountMin = signal<number | null>(null);
  protected readonly appliedDepartmentCodes = signal<string[] | null>(null);
  protected readonly appliedHorsFrance = signal(false);
  protected readonly pageIndex = signal(0);

  protected readonly selectedcontactIds = signal<Set<string>>(new Set());
  protected readonly selectedCount = computed(() => this.selectedcontactIds().size);
  protected readonly previewcontactId = signal<string | null>(null);

  protected activeStep: 1 | 2 | 3 = 1;
  protected readonly selectedDocumentKind = signal<'fiscal_receipt' | 'payment_certificate'>('fiscal_receipt');
  protected readonly selectedTemplateId = signal('');
  protected receiptBody = signal(
    'Nous vous remercions chaleureusement pour votre don. Ce reçu fiscal certifie votre contribution et vous permet de bénéficier des avantages fiscaux en vigueur.'
  );
  protected receiptFooter = signal("L'équipe de {{nom_association}}");
  protected readonly associationLogoUrl = signal('');
  protected readonly selectedReceiptSignatureId = signal('team');
  protected readonly receiptAssetInsertTarget = signal<'body' | 'footer'>('body');

  protected readonly signaturePresets = [
    {
      id: 'team',
      label: "L'équipe de l'association",
      value: "L'équipe de {{nom_association}}"
    },
    {
      id: 'president',
      label: 'Le président / la présidente',
      value: 'Le président / la présidente de {{nom_association}}'
    },
    {
      id: 'treasurer',
      label: 'Le trésorier / la trésorière',
      value: 'Le trésorier / la trésorière de {{nom_association}}'
    }
  ] as const;

  protected readonly signatureOptions = computed<FormSelectOption[]>(() =>
    this.signaturePresets.map((s) => ({ value: s.id, label: s.label }))
  );

  protected onReceiptSignatureChange(id: string): void {
    this.selectedReceiptSignatureId.set(id);
    const preset = this.signaturePresets.find((s) => s.id === id);
    if (preset) {
      this.receiptFooter.set(preset.value);
    }
  }

  protected onReceiptInsertText(text: string): void {
    const ta = this.receiptAssetInsertTarget() === 'body' ? this.receiptBodyTa : this.receiptFooterTa;
    ta?.insertAtCursor(text);
  }

  protected onReceiptInsertImage(_dataUrl: string): void {
    const ta = this.receiptAssetInsertTarget() === 'body' ? this.receiptBodyTa : this.receiptFooterTa;
    ta?.insertAtCursor(' [Image] ');
  }

  protected onReceiptInsertDocument(payload: { fileName: string }): void {
    const ta = this.receiptAssetInsertTarget() === 'body' ? this.receiptBodyTa : this.receiptFooterTa;
    ta?.insertAtCursor(` 📎 ${payload.fileName} `);
  }

  protected readonly templateOptions = computed(() =>
    this.accountMailAssetsStore.fiscalReceiptTemplates().map((tpl) => ({
      id: tpl.id,
      emoji:
        tpl.label.toLowerCase().includes('sobre')
          ? '🧾'
          : tpl.label.toLowerCase().includes('déta')
            ? '📚'
            : '✨',
      title: tpl.label,
      description: 'Inclut les mentions obligatoires du reçu fiscal.'
    }))
  );

  protected readonly hasFiscalTemplates = computed(() => this.templateOptions().length > 0);

  protected readonly requiredMentions = computed(() => {
    if (this.selectedDocumentKind() === 'payment_certificate') {
      return [
        "Identité de l'association",
        'Identité du payeur',
        'Date de paiement',
        'Montant payé'
      ];
    }
    const selected = this.accountMailAssetsStore
      .fiscalReceiptTemplates()
      .find((tpl) => tpl.id === this.selectedTemplateId());
    return selected?.requiredMentions ?? [];
  });

  ngOnInit(): void {
    this.ensureSelectedFiscalTemplate();
  }

  private readonly eligiblecontactsForReceipt = computed(() =>
    this.contactStore.contacts().filter((c) => this.isEligibleForReceipt(c))
  );

  protected readonly filteredcontacts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const quick = this.quickFilter();
    const monthsMin = this.appliedMonthsMin();
    const totalMin = this.appliedTotalDonationMin();
    const totalMax = this.appliedTotalDonationMax();
    const donationCountMin = this.appliedDonationCountMin();
    const departmentCodes = this.appliedDepartmentCodes();
    const horsFrance = this.appliedHorsFrance();
    const all = this.eligiblecontactsForReceipt();

    return all.filter((d) => {
      const status = this.statusOf(d);
      if (quick !== 'all') {
        const match =
          quick === 'to_remind'
            ? status === 'to_remind'
            : quick === 'new'
              ? status === 'new'
              : quick === 'active'
                ? status === 'active'
                : status === 'inactive';
        if (!match) return false;
      }

      if (monthsMin > 0 && this.monthsSinceLast(d) < monthsMin) return false;
      if (typeof totalMin === 'number' && !Number.isNaN(totalMin) && d.totalDonation < totalMin) return false;
      if (typeof totalMax === 'number' && !Number.isNaN(totalMax) && d.totalDonation > totalMax) return false;
      if (typeof donationCountMin === 'number' && !Number.isNaN(donationCountMin) && d.donationCount < donationCountMin) return false;

      if (!horsFrance && this.isOutsideFrance(d)) return false;

      if (departmentCodes?.length) {
        const dept = this.departmentOf(d);
        if (!dept || !departmentCodes.includes(dept)) return false;
      }

      if (!q) return true;
      const name = contactDisplayName(d).toLowerCase();
      const email = (d.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  });

  protected readonly filteredcontactsLength = computed(() => this.filteredcontacts().length);
  protected readonly pagedcontacts = computed(() => {
    const start = this.pageIndex() * this.itemsPerPage;
    return this.filteredcontacts().slice(start, start + this.itemsPerPage);
  });

  protected readonly pagedRecipientItems = computed<RecipientSelectorItem[]>(() =>
    this.pagedcontacts().map((d) => {
      const status = this.statusOf(d);
      const badgeText =
        status === 'to_remind' && d.lastDonation
          ? `${this.monthsSinceLast(d)} mois`
          : status === 'active'
            ? 'Actif'
            : status === 'new'
              ? 'Nouveau'
              : status === 'inactive'
                ? 'Inactif'
                : undefined;
      const badgeClass =
        status === 'active' || status === 'new'
          ? 'db-actif'
          : status === 'to_remind' || status === 'inactive'
            ? 'db-relance'
            : '';

      return {
        id: d.id,
        title: contactDisplayName(d),
        subtitle: this.contactMetaLine(d),
        avatarText: this.initials(d),
        badgeText,
        badgeClass
      };
    })
  );

  protected readonly totalPages = computed(() => {
    const len = this.filteredcontacts().length;
    return Math.max(1, Math.ceil(len / this.itemsPerPage));
  });

  protected readonly selectedcontactsForPreview = computed(() => {
    const selected = this.selectedcontactIds();
    return this.filteredcontacts().filter((d) => selected.has(d.id));
  });

  protected readonly previewcontactOptions = computed<FormSelectOption[]>(() =>
    this.selectedcontactsForPreview().map((d) => ({ value: d.id, label: contactDisplayName(d) }))
  );

  protected readonly selectedcontactsForStep3Count = computed(() => this.selectedcontactsForPreview().length);
  protected readonly selectedcontactsWithoutEmail = computed(() =>
    this.selectedcontactsForPreview().filter((c) => !String(c.email ?? '').trim())
  );
  protected readonly paperLettersCount = computed(() => this.selectedcontactsWithoutEmail().length);
  protected readonly emailDispatchCount = computed(() =>
    Math.max(0, this.selectedcontactsForStep3Count() - this.paperLettersCount())
  );

  protected goToStep(step: 1 | 2 | 3): void {
    this.activeStep = step;
    if (step === 3) this.syncPreviewIfNeeded();
  }

  protected setTemplate(id: string): void {
    this.selectedTemplateId.set(id);
    const tpl = this.accountMailAssetsStore.fiscalReceiptTemplates().find((x) => x.id === id);
    if (!tpl) return;
    this.receiptBody.set(tpl.body);
    this.receiptFooter.set(tpl.footer);
  }

  protected setDocumentKind(kind: 'fiscal_receipt' | 'payment_certificate'): void {
    this.selectedDocumentKind.set(kind);
    if (kind === 'payment_certificate') {
      this.receiptBody.set(
        'Cette attestation confirme la réception du paiement de {{montant_don}} effectué le {{date_don}} au profit de {{nom_association}}.'
      );
      this.receiptFooter.set("Service comptable de {{nom_association}}");
      return;
    }
    this.ensureSelectedFiscalTemplate();
    const tpl = this.accountMailAssetsStore.fiscalReceiptTemplates().find((x) => x.id === this.selectedTemplateId());
    if (!tpl) return;
    this.receiptBody.set(tpl.body);
    this.receiptFooter.set(tpl.footer);
  }

  protected setQuickFilter(v: QuickFilter): void {
    this.quickFilter.set(v);
    this.pageIndex.set(0);
    this.syncPreviewIfNeeded();
  }

  protected onSearchInput(v: string): void {
    this.searchQuery.set(v);
    this.pageIndex.set(0);
    this.syncPreviewIfNeeded();
  }

  protected togglecontact(id: string): void {
    const next = new Set(this.selectedcontactIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedcontactIds.set(next);
    this.syncPreviewIfNeeded();
  }

  protected selectAllFiltered(): void {
    this.selectedcontactIds.set(new Set(this.filteredcontacts().map((d) => d.id)));
    this.syncPreviewIfNeeded();
  }

  protected deselectAll(): void {
    this.selectedcontactIds.set(new Set());
    this.syncPreviewIfNeeded();
  }

  protected prevPage(): void {
    const p = this.pageIndex();
    if (p <= 0) return;
    this.pageIndex.set(p - 1);
  }

  protected nextPage(): void {
    const p = this.pageIndex();
    const max = this.totalPages() - 1;
    if (p >= max) return;
    this.pageIndex.set(p + 1);
  }

  protected onAdvancedFiltersApplied(filters: AdvancedFilters): void {
    this.appliedMonthsMin.set(filters.monthsMin);
    this.appliedTotalDonationMin.set(filters.totalDonationMin);
    this.appliedTotalDonationMax.set(filters.totalDonationMax);
    this.appliedDonationCountMin.set(filters.donationCountMin);
    this.appliedDepartmentCodes.set(filters.departmentCodes);
    this.appliedHorsFrance.set(filters.horsFrance);
    this.pageIndex.set(0);
    this.syncPreviewIfNeeded();
  }

  private departmentOf(d: IContact): string | null {
    const raw = d.address?.postalCode?.trim();
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 2) return null;
    if ((digits.startsWith('97') || digits.startsWith('98')) && digits.length >= 3) {
      return digits.slice(0, 3);
    }
    if (digits.startsWith('20')) {
      const third = digits[2] ?? '';
      return third === '0' || third === '1' ? '2A' : '2B';
    }
    return digits.slice(0, 2);
  }

  private isOutsideFrance(d: IContact): boolean {
    const c = d.address?.country?.trim().toLowerCase();
    if (!c) return true;
    return c !== 'france';
  }

  protected onPreviewcontactChange(v: string): void {
    this.previewcontactId.set(v || null);
  }

  protected contactPreviewName(): string {
    const id = this.previewcontactId();
    if (!id) return '—';
    const d = this.contactStore.contacts().find((x) => x.id === id);
    return d ? contactDisplayName(d) : '—';
  }

  protected contactPreviewAmount(): string {
    const id = this.previewcontactId();
    if (!id) return '—';
    const d = this.contactStore.contacts().find((x) => x.id === id);
    return d ? `${d.totalDonation.toLocaleString('fr-FR')} €` : '—';
  }

  protected currentTemplateTitle(): string {
    if (this.selectedDocumentKind() === 'payment_certificate') return 'Attestation de paiement';
    return this.templateOptions().find((x) => x.id === this.selectedTemplateId())?.title ?? 'Modèle';
  }

  protected sendEmailsNow(): void {
    const recipients = this.selectedcontactsForPreview().filter((c) => String(c.email ?? '').trim().length > 0);
    if (!recipients.length) return;
    this.receiptArchiveStore.appendBatch(
      recipients.map((c) => ({ id: c.id, name: contactDisplayName(c) })),
      'email',
      this.selectedDocumentKind(),
      this.currentTemplateTitle()
    );
    window.alert(`Simulation d'envoi: ${recipients.length} email(s) vont etre envoyes.`);
  }

  protected printPaperLetters(): void {
    const recipients = this.selectedcontactsWithoutEmail();
    if (!recipients.length) return;
    this.receiptArchiveStore.appendBatch(
      recipients.map((c) => ({ id: c.id, name: contactDisplayName(c) })),
      'paper',
      this.selectedDocumentKind(),
      this.currentTemplateTitle()
    );
    const logo = this.associationLogoUrl();
    const subject =
      this.selectedDocumentKind() === 'fiscal_receipt'
        ? `Recu fiscal - ${this.currentTemplateTitle()}`
        : 'Attestation de paiement';
    const body = this.receiptBody();
    const footer = this.receiptFooter();

    const win = window.open('', '_blank');
    if (!win) return;

    const letters = recipients
      .map((c) => {
        const recipientName = this.escapeHtml(contactDisplayName(c));
        const recipientAddress = this.escapeHtml(this.postalAddressOf(c));
        const renderedBody = this.escapeHtml(this.applyContactTokens(body, c)).replace(/\n/g, '<br/>');
        const renderedFooter = this.escapeHtml(this.applyContactTokens(footer, c));
        const renderedSubject = this.escapeHtml(this.applyContactTokens(subject, c));
        const logoHtml = logo ? `<img src="${this.escapeHtml(logo)}" alt="Logo" class="logo" />` : '';
        return `
          <section class="letter">
            <div class="head">
              <div class="sender">${logoHtml}<div class="sender-name">${renderedFooter}</div></div>
              <div class="recipient"><div>${recipientName}</div><div>${recipientAddress}</div></div>
            </div>
            <div class="subject">Objet : ${renderedSubject}</div>
            <div class="body">${renderedBody}</div>
            <div class="sign">${renderedFooter}</div>
          </section>
        `;
      })
      .join('');

    win.document.write(`
      <html>
        <head>
          <title>Lettres papier - Recus</title>
          <style>
            body{font-family:Arial,sans-serif;margin:0;padding:0;background:#fff;color:#222}
            .letter{padding:32px 40px;min-height:100vh;box-sizing:border-box;page-break-after:always}
            .head{display:flex;justify-content:space-between;align-items:flex-start}
            .sender{max-width:45%}
            .recipient{max-width:45%;text-align:right;white-space:pre-line}
            .logo{max-width:140px;height:auto;display:block;margin-bottom:8px}
            .subject{text-align:center;margin:26px 0 20px;font-weight:700}
            .body{line-height:1.6}
            .sign{margin-top:34px}
          </style>
        </head>
        <body>${letters}</body>
      </html>
    `);
    win.document.close();
    win.focus();
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private postalAddressOf(c: IContact): string {
    const street = c.address?.street ?? '';
    const postalCode = c.address?.postalCode ?? '';
    const city = c.address?.city ?? '';
    const country = c.address?.country ?? '';
    return [street, `${postalCode} ${city}`.trim(), country].filter(Boolean).join('\n');
  }

  private applyContactTokens(template: string, c: IContact): string {
    const firstname = c.firstname?.trim() || 'Madame, Monsieur';
    const lastname = c.lastname?.trim() || '';
    return String(template ?? '')
      .replace(/\{\{prenom\}\}/g, firstname)
      .replace(/\{\{nom\}\}/g, lastname)
      .replace(/\{\{nom_association\}\}/g, 'votre association');
  }

  private isEligibleForReceipt(contact: IContact): boolean {
    if (contact.status === 'out') return false;
    const donations = this.donationStore
      .donations()
      .filter((d) => d.contactId === contact.id)
      .map((d) => new Date(d.date).getTime())
      .filter((ts) => !Number.isNaN(ts))
      .sort((a, b) => b - a);
    if (!donations.length) return false;

    const frequency = contact.preferredFrequencySendingReceipt ?? 'yearly';
    const now = new Date();

    if (frequency === 'instantly') {
      const latestDonationAt = donations[0];
      const lastSent = this.receiptArchiveStore.lastSentAt(contact.id, 'fiscal_receipt');
      return !lastSent || latestDonationAt > lastSent;
    }

    const bounds = this.currentPeriodBounds(now, frequency);
    const nowMs = now.getTime();
    const hasDonationInPeriod = donations.some((ts) => ts >= bounds.start && ts <= nowMs);
    if (!hasDonationInPeriod) return false;
    return !this.receiptArchiveStore.hasSentInPeriod(contact.id, 'fiscal_receipt', bounds.start, nowMs);
  }

  private currentPeriodBounds(
    now: Date,
    frequency: 'monthly' | 'quarterly' | 'semesterly' | 'yearly'
  ): { start: number; end: number } {
    const year = now.getFullYear();
    const month = now.getMonth();

    if (frequency === 'monthly') {
      const start = new Date(year, month, 1, 0, 0, 0, 0).getTime();
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
      return { start, end };
    }

    if (frequency === 'quarterly') {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, quarterStartMonth, 1, 0, 0, 0, 0).getTime();
      const end = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999).getTime();
      return { start, end };
    }

    if (frequency === 'semesterly') {
      const semesterStartMonth = month < 6 ? 0 : 6;
      const start = new Date(year, semesterStartMonth, 1, 0, 0, 0, 0).getTime();
      const end = new Date(year, semesterStartMonth + 6, 0, 23, 59, 59, 999).getTime();
      return { start, end };
    }

    const start = new Date(year, 0, 1, 0, 0, 0, 0).getTime();
    const end = new Date(year, 12, 0, 23, 59, 59, 999).getTime();
    return { start, end };
  }

  private ensureSelectedFiscalTemplate(): void {
    const templates = this.accountMailAssetsStore.fiscalReceiptTemplates();
    if (!templates.length) {
      this.selectedTemplateId.set('');
      return;
    }
    const selectedId = this.selectedTemplateId();
    const existing = templates.find((x) => x.id === selectedId);
    const chosen = existing ?? templates[0];
    this.selectedTemplateId.set(chosen.id);
    if (this.selectedDocumentKind() === 'fiscal_receipt') {
      this.receiptBody.set(chosen.body);
      this.receiptFooter.set(chosen.footer);
    }
  }

  private syncPreviewIfNeeded(): void {
    const options = this.selectedcontactsForPreview();
    const first = options[0];
    if (!first) {
      this.previewcontactId.set(null);
      return;
    }
    const current = this.previewcontactId();
    if (!current || !options.some((d) => d.id === current)) {
      this.previewcontactId.set(first.id);
    }
  }

  private statusOf(d: IContact): ContactStatus {
    return this.contactSettings.statusOf(d);
  }

  private contactMetaLine(d: IContact): string {
    if (!d.lastDonation) {
      return `Aucun don enregistré · ${d.totalDonation} € au total`;
    }
    const when = d.lastDonation.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    return `Dernier don : ${when} · ${d.totalDonation} €`;
  }

  private monthsSinceLast(d: IContact): number {
    if (!d.lastDonation) return 0;
    const now = new Date();
    const from = d.lastDonation;
    let m = (now.getFullYear() - from.getFullYear()) * 12;
    m += now.getMonth() - from.getMonth();
    return Math.max(0, m);
  }

  private initials(d: IContact): string {
    if (d.kind === 'company' && d.enterprise?.name) {
      const parts = d.enterprise.name.trim().split(/\s+/).filter(Boolean);
      const a = parts[0]?.[0] ?? '';
      const b = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
      return `${a}${b}`.toUpperCase().slice(0, 2) || '?';
    }
    const a = d.firstname?.trim()?.[0] ?? '';
    const b = d.lastname?.trim()?.[0] ?? '';
    return `${a}${b}`.toUpperCase() || '?';
  }
}

