import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IDonor, donorDisplayName } from '../../../../core/models/donor.model';
import { DonationStoreService } from '../../../donation/donation.store';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { ToastService } from '../../../../layout/toast/toast.service';
import { ButtonLabelComponent } from '../../../../layout/button/button-label/button-label.component';
import { FormDateComponent } from '../../../../layout/forms/date/form-date.component';
import { FormTextComponent } from '../../../../layout/forms/text/form-text.component';

function dateToInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateFromInputValue(s: string): Date {
  const [y, m, d] = s.split('-').map((x) => Number(x));
  return new Date(y, m - 1, d);
}

@Component({
  selector: 'add-donation-popup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PopupShellComponent,
    ButtonLabelComponent,
    FormTextComponent,
    FormDateComponent
  ],
  templateUrl: './add-donation-popup.component.html',
  styleUrls: ['./add-donation-popup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddDonationPopupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly donationStore = inject(DonationStoreService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly donor = input.required<IDonor>();

  @Output() closed = new EventEmitter<void>();

  protected displayName(): string {
    return donorDisplayName(this.donor());
  }

  protected manualOpen = false;
  protected submitted = false;

  protected readonly form = this.fb.group({
    amount: ['', Validators.required],
    date: ['', Validators.required]
  });

  constructor() {
    const today = new Date();
    this.form.patchValue({ date: dateToInputValue(today) });
  }

  protected openManual(): void {
    this.manualOpen = true;
  }

  protected onSubmitManual(): void {
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    const amount = Number(String(raw.amount).replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    const date = dateFromInputValue(String(raw.date));
    this.donationStore.addDonationForDonor(this.donor(), amount, date);
    this.toast.show(`Don de ${amount} € enregistré pour ${this.displayName()}.`, 'success');
    this.closed.emit();
  }

  protected goImportExcel(): void {
    void this.router.navigate(['/import'], { queryParams: { donorId: this.donor().id } });
    this.closed.emit();
  }

  protected onDismiss(): void {
    this.closed.emit();
  }
}
