import { ChangeDetectionStrategy, Component, AfterViewInit, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastComponent } from '../../layout/toast/toast.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { ButtonComponent } from '../../layout/button/button.component';
import { MailEditorComponent } from '../../layout/mail-editor/mail-editor.component';

type MailTemplate = { objet: string; body: string };

@Component({
  selector: 'reminder-page',
  standalone: true,
  templateUrl: './reminder.page.html',
  styleUrls: ['./reminder.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ToastComponent, TopbarComponent, ButtonComponent, MailEditorComponent]
})
export class ReminderPageComponent implements OnInit, AfterViewInit {
  private selectedCount = 0;

  private readonly mails: Record<string, MailTemplate> = {
    douce: {
      objet: 'Vous nous manquez, {{prenom}} 💛',
      body: `Bonjour {{prenom}},

J'espère que vous allez bien. Voilà {{mois_depuis_don}} mois que nous n'avons pas eu de vos nouvelles, et je voulais prendre le temps de vous écrire personnellement.

Votre soutien passé de {{dernier_don_montant}} € a eu un impact réel sur notre association. Grâce à des personnes comme vous, nous avons pu continuer à agir concrètement.

Si votre situation vous le permet, un nouveau geste de votre part nous toucherait profondément. Mais avant tout, nous sommes simplement heureux de vous compter parmi nos amis.

Avec toute notre gratitude,
L'équipe de {{nom_association}}`
    },
    fidelisation: {
      objet: 'Merci pour votre fidélité, {{prenom}} ✨',
      body: `Bonjour {{prenom}},

Vous faites partie de nos donateurs les plus fidèles, et nous tenions à vous le dire.

Au fil des années, vous avez contribué à hauteur de {{total_dons}} € à notre cause. C'est grâce à cet engagement que nos projets prennent vie.

Cette année encore, nous avons besoin de vous. Votre renouvellement de soutien nous permettrait de continuer sur cette belle lancée.

Merci, du fond du cœur.
L'équipe de {{nom_association}}`
    }
  };

  protected activeStep: 1 | 2 | 3 = 1;
  protected mailSubject = 'Vous nous manquez, {{prenom}} 💛';
  protected mailBody = '<p>Bonjour {{prenom}},</p>';

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

  generateMail(): void {
    const btn = document.getElementById('ia-btn') as HTMLButtonElement | null;
    const spinner = document.getElementById('spinner') as HTMLElement | null;
    const btnText = document.getElementById('ia-btn-text') as HTMLElement | null;
    if (!btn || !spinner || !btnText) return;

    spinner.style.display = 'block';
    btnText.textContent = 'Génération en cours…';
    btn.disabled = true;

    window.setTimeout(() => {
      const presetEl = document.querySelector('.ia-preset.sel') as HTMLElement | null;
      const preset = presetEl?.textContent?.trim() ?? '';
      const mail = preset.includes('fidél') ? this.mails['fidelisation'] : this.mails['douce'];

      this.mailSubject = mail.objet;
      this.mailBody = mail.body;

      spinner.style.display = 'none';
      btnText.textContent = '✓ Mail généré — modifiez-le librement';
      btn.disabled = false;
      btn.style.background = 'var(--mint-dk)';
    }, 1800);
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

