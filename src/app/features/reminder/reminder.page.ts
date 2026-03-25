import {
  ChangeDetectionStrategy,
  Component,
  AfterViewInit,
  OnInit,
  ViewChild,
  inject,
  ChangeDetectorRef,
  computed,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { MailEditorComponent } from '../../layout/mail-editor/mail-editor.component';
import { IaAgentCore, ReminderTemplateTone } from '../../core/ia-agent/ia_agent.core';
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

@Component({
  selector: 'reminder-page',
  standalone: true,
  templateUrl: './reminder.page.html',
  styleUrls: ['./reminder.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ToastComponent,
    TopbarComponent,
    ButtonLabelComponent,
    FormSelectComponent,
    MailEditorComponent,
    FormTextareaComponent,
    RecipientSelectorComponent
  ]
})
export class ReminderPageComponent implements OnInit, AfterViewInit {
  private readonly iaAgent = inject(IaAgentCore);
  private readonly contactStore = inject(ContactStoreService);
  private readonly contactSettings = inject(ContactSettingsStore);
  constructor(private readonly cdr: ChangeDetectorRef) {}
  protected readonly contactsCount = computed(() => this.contactStore.contacts().length);

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

  protected readonly filteredcontacts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const quick = this.quickFilter();
    const monthsMin = this.appliedMonthsMin();
    const totalMin = this.appliedTotalDonationMin();
    const totalMax = this.appliedTotalDonationMax();
    const donationCountMin = this.appliedDonationCountMin();
    const departmentCodes = this.appliedDepartmentCodes();
    const horsFrance = this.appliedHorsFrance();
    const all = this.contactStore.contacts();

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

      if (monthsMin > 0) {
        const m = this.monthsSinceLast(d);
        if (m < monthsMin) return false;
      }

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
      const statusLabel = this.statusLabel(status).toLowerCase();
      return name.includes(q) || email.includes(q) || statusLabel.includes(q);
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
    this.selectedcontactsForPreview().map((d) => ({
      value: d.id,
      label: this.displayName(d)
    }))
  );

  protected readonly selectedcontactsForStep3Count = computed(() => this.selectedcontactsForPreview().length);
  protected readonly afterSendCount = computed(() =>
    Math.max(0, 300 - this.selectedcontactsForStep3Count())
  );

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
    this.cdr.markForCheck();
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

  protected readonly iaContextPlaceholders: Record<ReminderTemplateTone, string> = {
    douce:
      "Exemple : relance douce après 12 mois d'inactivité, mettre en avant l'impact concret des dons…",
    fidelisation:
      "Exemple : fidélisation, rappeler l'engagement passé et proposer un renouvellement…",
    remerciement: 'Exemple : remercier pour le dernier don et rappeler ce que cela a permis…',
    urgence: "Exemple : situation actuelle et pourquoi un geste maintenant aide vraiment…",
    saisonnier: 'Exemple : contexte de la période et prochaines actions à soutenir…'
  };
  protected iaContextPlaceholder = this.iaContextPlaceholders['douce'];
  protected activeStep: 1 | 2 | 3 = 1;
  protected mailSubject = 'Vous nous manquez, {{prenom}} 💛';
  protected mailBody = '<p>Bonjour {{prenom}},</p>';
  protected iaPrompt = '';

  @ViewChild(MailEditorComponent)
  private mailEditor?: MailEditorComponent;

  ngOnInit(): void {
    const w = window as any;
    w.selectPreset = this.selectPreset.bind(this);
    w.insertVar = this.insertVar.bind(this);
    w.generateMail = this.generateMail.bind(this);
    w.updatePreview = (v: string) => this.updatePreviewFromDom(v);
  }

  ngAfterViewInit(): void {
    this.syncPreviewIfNeeded();
  }

  protected goToStep(step: 1 | 2 | 3): void {
    this.activeStep = step;
    if (step === 3) {
      this.syncPreviewIfNeeded();
    }
  }

  protected displayName(d: IContact): string {
    return contactDisplayName(d);
  }

  protected initials(d: IContact): string {
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

  protected contactMetaLine(d: IContact): string {
    if (!d.lastDonation) {
      return `Aucun don enregistré · ${d.totalDonation} € au total`;
    }
    const when = d.lastDonation.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    return `Dernier don : ${when} · ${d.totalDonation} €`;
  }

  protected monthsSinceLast(d: IContact): number {
    if (!d.lastDonation) {
      return 0;
    }
    const now = new Date();
    const from = d.lastDonation;
    let m = (now.getFullYear() - from.getFullYear()) * 12;
    m += now.getMonth() - from.getMonth();
    return Math.max(0, m);
  }

  private statusOf(d: IContact): ContactStatus {
    return this.contactSettings.statusOf(d);
  }

  private statusLabel(status: ContactStatus): string {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'to_remind':
        return 'À relancer';
      case 'new':
        return 'Nouveau';
      case 'inactive':
        return 'Inactif';
      case 'out':
        return 'Sorti';
      default:
        return '';
    }
  }

  protected onPreviewcontactChange(v: string): void {
    if (!v) {
      this.previewcontactId.set(null);
      return;
    }
    this.previewcontactId.set(v);
    this.updatePreviewBody(v);
  }

  private updatePreviewFromDom(value: string): void {
    this.updatePreviewBody(value);
  }

  private syncPreviewIfNeeded(): void {
    if (this.activeStep !== 3) return;
    const options = this.selectedcontactsForPreview();
    const first = options[0];
    if (!first) {
      this.previewcontactId.set(null);
      return;
    }
    const current = this.previewcontactId();
    if (!current || !options.some((d) => d.id === current)) {
      this.previewcontactId.set(first.id);
      this.updatePreviewBody(first.id);
    }
  }

  toggleAdv(): void {
    const panel = document.getElementById('adv-panel');
    const arrow = document.getElementById('adv-arrow');
    panel?.classList.toggle('open');
    arrow?.classList.toggle('open');
  }

  syncSlider(val: string | number): void {
    const monthsVal = document.getElementById('months-val') as HTMLInputElement | null;
    if (monthsVal) monthsVal.value = String(val);

    const num = typeof val === 'string' ? Number(val) : val;
    const pct = ((num - 1) / 59) * 100;

    const slider = document.querySelector('.slider') as HTMLInputElement | null;
    if (slider) {
      slider.style.background = `linear-gradient(to right, var(--violet) 0%, var(--violet) ${pct}%, var(--ink-30) ${pct}%)`;
    }
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
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedcontactIds.set(next);
    this.syncPreviewIfNeeded();
  }

  protected selectAllFiltered(): void {
    const next = new Set(this.filteredcontacts().map((d) => d.id));
    this.selectedcontactIds.set(next);
    this.syncPreviewIfNeeded();
  }

  protected deselectAll(): void {
    this.selectedcontactIds.set(new Set());
    this.syncPreviewIfNeeded();
  }

  selectPreset(el: HTMLElement, tone: ReminderTemplateTone): void {
    document.querySelectorAll('.ia-preset').forEach((p) => p.classList.remove('sel'));
    el.classList.add('sel');

    const prompt = el.dataset['prompt'] ?? '';
    this.iaPrompt = prompt;

    this.iaContextPlaceholder = this.iaContextPlaceholders[tone] ?? this.iaContextPlaceholders['douce'];
    this.cdr.markForCheck();
  }

  applyFilters(): void {
    const months = (document.getElementById('months-val') as HTMLInputElement | null)?.value;
    if (months) {
      const num = Number(months);
      if (!Number.isNaN(num)) {
        this.appliedMonthsMin.set(num);
      }
    } else {
      this.appliedMonthsMin.set(0);
    }

    const montantInputs = document.querySelectorAll('.adv-montant .adv-minput') as NodeListOf<HTMLInputElement>;
    const minVal = montantInputs[0]?.value;
    const maxVal = montantInputs[1]?.value;
    this.appliedTotalDonationMin.set(minVal ? Number(minVal) : null);
    this.appliedTotalDonationMax.set(maxVal ? Number(maxVal) : null);

    const selects = document.querySelectorAll('.adv-panel .adv-select') as NodeListOf<HTMLSelectElement>;
    const donationSelect = selects[0];
    const label = donationSelect?.selectedOptions?.[0]?.textContent?.trim() ?? '';
    if (!label || label.toLowerCase().includes('peu importe')) {
      this.appliedDonationCountMin.set(null);
    } else {
      const m = label.match(/au moins\s+(\d+)/i);
      this.appliedDonationCountMin.set(m ? Number(m[1]) : null);
    }

    this.pageIndex.set(0);
    this.syncPreviewIfNeeded();
    this.cdr.markForCheck();
  }

  insertVar(v: string): void {
    this.mailEditor?.insertVariable(v);
  }

  async generateMail(): Promise<void> {
    const btn = document.getElementById('ia-btn') as HTMLButtonElement | null;
    const spinner = document.getElementById('spinner') as HTMLElement | null;
    const btnText = document.getElementById('ia-btn-text') as HTMLElement | null;
    if (!btn || !spinner || !btnText) return;

    spinner.style.display = 'block';
    btnText.textContent = 'Génération en cours…';
    btn.disabled = true;
    try {
      const presetEl = document.querySelector('.ia-preset.sel') as HTMLElement | null;
      const presetLabel = presetEl?.textContent?.trim() ?? '';
      const tone = this.resolveTone(presetLabel);
      const response = await firstValueFrom(
        this.iaAgent.generateReminderTemplate({ tone })
      );

      this.mailSubject = response.subject;
      this.mailBody = response.body;
      this.activeStep = 2;
      btnText.textContent = '✓ Mail généré — modifiez-le librement';
      btn.style.background = 'var(--mint-dk)';
    } finally {
      spinner.style.display = 'none';
      btn.disabled = false;
    }
  }

  private resolveTone(label: string): ReminderTemplateTone {
    const normalized = label.toLowerCase();
    if (normalized.includes('fidel') || normalized.includes('fidél')) return 'fidelisation';
    if (normalized.includes('remerci')) return 'remerciement';
    if (normalized.includes('urgence')) return 'urgence';
    if (normalized.includes('saisonnier')) return 'saisonnier';
    return 'douce';
  }

  private updatePreviewBody(contactId: string): void {
    const d = this.contactStore.contacts().find((x) => x.id === contactId);
    const container = document.getElementById('preview-body');
    if (!container || !d) {
      return;
    }

    const prenom =
      d.kind === 'company'
        ? (d.enterprise?.contactFirstname?.trim() || d.firstname || 'vous')
        : d.firstname.trim();
    const mois = d.lastDonation ? String(this.monthsSinceLast(d)) : '—';
    const dernier = `${d.totalDonation} €`;
    const nomAsso = 'votre association';

    const vars = container.querySelectorAll('.preview-var');
    if (vars[0]) vars[0].textContent = prenom;
    if (vars[1]) vars[1].textContent = d.lastDonation ? `${mois} mois` : mois;
    if (vars[2]) vars[2].textContent = dernier;
    if (vars[3]) vars[3].textContent = nomAsso;
  }
}

