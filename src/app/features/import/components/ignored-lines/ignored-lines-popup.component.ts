import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { ButtonLabelComponent } from '../../../../layout/button/button-label/button-label.component';
import { FormTextComponent } from '../../../../layout/forms/text/form-text.component';
import type { IgnoredImportLine } from '../../core/model/ignored-import-line.model';

@Component({
  selector: 'import-ignored-lines-popup',
  standalone: true,
  imports: [CommonModule, PopupShellComponent, ButtonLabelComponent, FormTextComponent],
  templateUrl: './ignored-lines-popup.component.html',
  styleUrls: ['./ignored-lines-popup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IgnoredLinesPopupComponent {
  readonly ignoredLines = input.required<IgnoredImportLine[]>();
  readonly sheetName = input<string | null>(null);

  readonly dismiss = output<void>();
  readonly continue = output<IgnoredImportLine[]>();

  protected readonly draftLines = signal<IgnoredImportLine[]>([]);
  protected readonly originalLinesSnapshot = signal<IgnoredImportLine[]>([]);

  constructor() {
    effect(() => {
      const snapshot = this.ignoredLines().map((l) => ({ ...l }));
      this.originalLinesSnapshot.set(snapshot);
      this.draftLines.set(snapshot.map((l) => ({ ...l })));
    });
  }

  protected personLabel(rowNumber: number): string {
    const original = this.originalLinesSnapshot().find((l) => l.rowNumber === rowNumber);
    const email = original?.email?.trim();
    if (email) {
      return email;
    }

    const lastname = original?.lastname?.trim() ?? '';
    const firstname = original?.firstname?.trim() ?? '';
    const enterpriseName = original?.enterpriseName?.trim();
    const contactKind = original?.contactKind;

    if (lastname && firstname) {
      return `${lastname} ${firstname}`;
    }
    if (lastname) {
      return lastname;
    }
    if (firstname) {
      return firstname;
    }
    if (contactKind === 'company' && enterpriseName) {
      return enterpriseName;
    }
    return 'Personne inconnue';
  }

  protected onDismiss(): void {
    this.dismiss.emit();
  }

  protected onContinue(): void {
    this.continue.emit(this.draftLines());
  }

  protected wantsEmailInput(line: IgnoredImportLine): boolean {
    const r = line.reason.toLowerCase();
    return (
      r.includes('email manquant') ||
      r.includes('email du profil manquant') ||
      r.includes('email du profil introuvable') ||
      r.includes('ligne invalide')
    );
  }

  protected wantsNameInput(line: IgnoredImportLine): boolean {
    const r = line.reason.toLowerCase();
    return r.includes('nom ou prénom manquant') || r.includes('nom ou prénom contact manquant') || r.includes('ligne invalide');
  }

  protected wantsDonationAmountInput(line: IgnoredImportLine): boolean {
    const r = line.reason.toLowerCase();
    return r.includes('montant') || r.includes('ligne invalide');
  }

  protected wantsDonationDateInput(line: IgnoredImportLine): boolean {
    const r = line.reason.toLowerCase();
    return r.includes('date') || r.includes('ligne invalide');
  }

  protected wantsEnterpriseNameInput(line: IgnoredImportLine): boolean {
    const r = line.reason.toLowerCase();
    return r.includes('nom entreprise manquant') || r.includes('ligne invalide');
  }

  protected wantsSiretInput(line: IgnoredImportLine): boolean {
    const r = line.reason.toLowerCase();
    return r.includes('siret manquant') || r.includes('ligne invalide');
  }

  protected updateLine(rowNumber: number, patch: Partial<IgnoredImportLine>): void {
    this.draftLines.update((list) => list.map((l) => (l.rowNumber === rowNumber ? { ...l, ...patch } : l)));
  }

  protected onEmailInput(line: IgnoredImportLine, value: string): void {
    this.updateLine(line.rowNumber, { email: value });
  }

  protected onFirstnameInput(line: IgnoredImportLine, value: string): void {
    this.updateLine(line.rowNumber, { firstname: value });
  }

  protected onLastnameInput(line: IgnoredImportLine, value: string): void {
    this.updateLine(line.rowNumber, { lastname: value });
  }

  protected onEnterpriseNameInput(line: IgnoredImportLine, value: string): void {
    this.updateLine(line.rowNumber, { enterpriseName: value });
  }

  protected onSiretInput(line: IgnoredImportLine, value: string): void {
    this.updateLine(line.rowNumber, { siret: value });
  }

  protected onDonationAmountInput(line: IgnoredImportLine, value: string): void {
    this.updateLine(line.rowNumber, { donationAmount: value });
  }

  protected onDonationDateInput(line: IgnoredImportLine, value: string): void {
    this.updateLine(line.rowNumber, { donationDate: value });
  }
}

