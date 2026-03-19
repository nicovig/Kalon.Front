import { ChangeDetectionStrategy, Component, AfterViewInit, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { ButtonComponent } from '../../layout/button/button.component';
import { MailEditorComponent } from '../../layout/mail-editor/mail-editor.component';
import { IaAgentCore, ReminderTemplateTone } from '../../core/ia-agent/ia_agent.core';
import { KalonTextareaComponent } from '../../layout/forms/textarea/kalon-textarea.component';

@Component({
  selector: 'reminder-page',
  standalone: true,
  templateUrl: './reminder.page.html',
  styleUrls: ['./reminder.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ToastComponent, TopbarComponent, ButtonComponent, MailEditorComponent, KalonTextareaComponent]
})
export class ReminderPageComponent implements OnInit, AfterViewInit {
  private selectedCount = 0;
  private readonly iaAgent = inject(IaAgentCore);

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
    w.updatePreview = this.updatePreview.bind(this);
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
    this.updatePreview(this.getPreviewSelectedValue());
  }

  protected goToStep(step: 1 | 2 | 3): void {
    this.activeStep = step;
  }

  private getPreviewSelectedValue(): string {
    const select = document.querySelector('.preview-select') as HTMLSelectElement | null;
    return select?.value ?? 'ML';
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
    if (footerInfo) footerInfo.textContent = `${this.selectedCount} donateurs sélectionnés sur 34`;

    const recapStats = document.querySelectorAll('.recap-stat');
    const afterVal = recapStats[2]?.querySelector('.recap-val');
    if (afterVal) afterVal.textContent = String(211 - this.selectedCount);
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

  selectPreset(el: HTMLElement): void {
    document.querySelectorAll('.ia-preset').forEach((p) => p.classList.remove('sel'));
    el.classList.add('sel');

    const prompt = el.dataset['prompt'] ?? '';
    this.iaPrompt = prompt;

    const textarea = document.getElementById('ia-context-textarea') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = prompt;
      textarea.dispatchEvent(new Event('input'));
    }
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

  updatePreview(value: string): void {
    const container = document.getElementById('preview-body');
    if (!container) return;

    const previewById: Record<
      string,
      { prenom: string; mois: string; dernier: string; nomAsso: string }
    > = {
      ML: { prenom: 'Marie-Laure', mois: '14', dernier: '320 €', nomAsso: 'Asso Parents d\'élèves' },
      JD: { prenom: 'Jean', mois: '24', dernier: '80 €', nomAsso: 'Asso Parents d\'élèves' },
      CM: { prenom: 'Chloé', mois: '18', dernier: '50 €', nomAsso: 'Asso Parents d\'élèves' },
      PL: { prenom: 'Pierre', mois: '21', dernier: '150 €', nomAsso: 'Asso Parents d\'élèves' }
    };

    const data = previewById[value] ?? previewById['ML'];
    const vars = container.querySelectorAll('.preview-var');
    if (vars[0]) vars[0].textContent = data.prenom;
    if (vars[1]) vars[1].textContent = `${data.mois} mois`;
    if (vars[2]) vars[2].textContent = data.dernier;
    if (vars[3]) vars[3].textContent = data.nomAsso;
  }
}

