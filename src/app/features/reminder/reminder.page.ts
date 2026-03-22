import {
  ChangeDetectionStrategy,
  Component,
  AfterViewInit,
  OnInit,
  ViewChild,
  inject,
  ChangeDetectorRef,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { MailEditorComponent } from '../../layout/mail-editor/mail-editor.component';
import { IaAgentCore, ReminderTemplateTone } from '../../core/ia-agent/ia_agent.core';
import { FormTextareaComponent } from '../../layout/forms/textarea/form-textarea.component';
import { EmptyDonorsWelcomeComponent } from '../donor/empty-donors-welcome/empty-donors-welcome.component';
import { DonorStoreService } from '../donor/donor.store';
import { donorDisplayName, IDonor } from '../../core/models/donor.model';

@Component({
  selector: 'reminder-page',
  standalone: true,
  templateUrl: './reminder.page.html',
  styleUrls: ['./reminder.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ToastComponent,
    TopbarComponent,
    ButtonLabelComponent,
    MailEditorComponent,
    FormTextareaComponent,
    EmptyDonorsWelcomeComponent
  ]
})
export class ReminderPageComponent implements OnInit, AfterViewInit {
  private selectedCount = 0;
  private readonly iaAgent = inject(IaAgentCore);
  private readonly donorStore = inject(DonorStoreService);
  constructor(private readonly cdr: ChangeDetectorRef) {}

  protected readonly donors = computed(() => this.donorStore.donors());

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
    w.toggleAdv = this.toggleAdv.bind(this);
    w.syncSlider = this.syncSlider.bind(this);
    w.toggleQF = this.toggleQF.bind(this);
    w.toggleDonor = this.toggleDonor.bind(this);
    w.selectAll = this.selectAll.bind(this);
    w.selectPreset = this.selectPreset.bind(this);
    w.applyFilters = this.applyFilters.bind(this);
    w.insertVar = this.insertVar.bind(this);
    w.generateMail = this.generateMail.bind(this);
    w.updatePreview = (v: string) => this.updatePreviewFromDom(v);
  }

  ngAfterViewInit(): void {
    const monthsVal = document.getElementById('months-val') as HTMLInputElement | null;
    const monthsSlider = document.getElementById('months-slider') as HTMLInputElement | null;
    if (monthsVal && monthsSlider) {
      monthsVal.addEventListener('input', () => {
        monthsSlider.value = monthsVal.value;
        this.syncSlider(monthsVal.value);
      });
      this.syncSlider(monthsVal.value);
    }
    this.updateCounts();
    const first = this.donorStore.donors()[0];
    if (first) {
      this.updatePreviewBody(first.id);
    }
  }

  protected goToStep(step: 1 | 2 | 3): void {
    this.activeStep = step;
  }

  protected displayName(d: IDonor): string {
    return donorDisplayName(d);
  }

  protected initials(d: IDonor): string {
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

  protected donorMetaLine(d: IDonor): string {
    if (!d.lastDonation) {
      return `Aucun don enregistré · ${d.totalDonation} € au total`;
    }
    const when = d.lastDonation.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    return `Dernier don : ${when} · ${d.totalDonation} €`;
  }

  protected monthsSinceLast(d: IDonor): number {
    if (!d.lastDonation) {
      return 0;
    }
    const now = new Date();
    const from = d.lastDonation;
    let m = (now.getFullYear() - from.getFullYear()) * 12;
    m += now.getMonth() - from.getMonth();
    return Math.max(0, m);
  }

  protected onPreviewDonorChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    this.updatePreviewBody(v);
  }

  private updatePreviewFromDom(value: string): void {
    this.updatePreviewBody(value);
  }

  private updateCounts(): void {
    const checked = document.querySelectorAll('.donor-item.checked').length;
    this.selectedCount = checked;

    const selCount = document.getElementById('sel-count');
    if (selCount) selCount.textContent = `${this.selectedCount} sélectionnés`;

    const sendCount = document.getElementById('send-count');
    if (sendCount) sendCount.textContent = String(this.selectedCount);

    const sendCount2 = document.getElementById('send-count-2');
    if (sendCount2) sendCount2.textContent = String(this.selectedCount);

    const recapDest = document.getElementById('recap-dest');
    if (recapDest) recapDest.textContent = String(this.selectedCount);

    const footerInfo = document.getElementById('footer-info');
    const total = this.donorStore.donors().length;
    if (footerInfo) footerInfo.textContent = `${this.selectedCount} donateurs sélectionnés sur ${total}`;

    const recapStats = document.querySelectorAll('.recap-stat');
    const afterVal = recapStats[2]?.querySelector('.recap-val');
    const planMails = 300;
    if (afterVal) afterVal.textContent = String(Math.max(0, planMails - this.selectedCount));
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

  toggleQF(el: HTMLElement): void {
    document.querySelectorAll('.qf').forEach((q) => q.classList.remove('on'));
    el.classList.add('on');
  }

  toggleDonor(el: HTMLElement): void {
    el.classList.toggle('checked');
    const check = el.querySelector('.d-check') as HTMLElement | null;
    if (el.classList.contains('checked')) {
      if (check) check.textContent = '✓';
    } else {
      if (check) check.textContent = '';
    }
    this.updateCounts();
  }

  selectAll(): void {
    document.querySelectorAll('.donor-item').forEach((item) => {
      item.classList.add('checked');
      const check = item.querySelector('.d-check') as HTMLElement | null;
      if (check) check.textContent = '✓';
    });
    this.updateCounts();
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
      console.log(`Filtre: dernier don > ${months} mois`);
    }
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

  private updatePreviewBody(donorId: string): void {
    const d = this.donorStore.donors().find((x) => x.id === donorId);
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

