import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { contactDisplayName, IContact } from '../../../core/models/contact.model';
import { DonationStoreService } from '../donation.store';
import { DonationPaymentMethod, DonationType } from '../../../core/models/donation.model';
import { PopupShellComponent } from '../../../layout/popup/popup-shell.component';
import { ToastService } from '../../../layout/toast/toast.service';
import { ButtonLabelComponent } from '../../../layout/button/button-label/button-label.component';
import { FormDateComponent } from '../../../layout/forms/date/form-date.component';
import { FormTextComponent } from '../../../layout/forms/text/form-text.component';
import { ButtonRadioComponent } from '../../../layout/button/radio/button-radio.component';

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
    ButtonRadioComponent,
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

  readonly contact = input.required<IContact>();

  @Output() closed = new EventEmitter<void>();

  protected displayName(): string {
    return contactDisplayName(this.contact());
  }

  protected manualOpen = false;
  protected submitted = false;

  protected readonly form = this.fb.group({
    amount: ['', Validators.required],
    date: ['', Validators.required],
    paymentMethod: ['bank_transfer', Validators.required]
  });

  protected readonly paymentMethodControl = this.form.get('paymentMethod')! as FormControl<string>;

  protected readonly todayDateString = new Date().toISOString().split('T')[0];

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
    const paymentMethod = raw.paymentMethod as DonationPaymentMethod;
    const donationType: DonationType = 'financial';
    this.donationStore.addDonationForContact(this.contact(), amount, date, paymentMethod, donationType);
    this.toast.show(`Don de ${amount} € enregistré pour ${this.displayName()}.`, 'success');
    this.closed.emit();
  }

  protected goImportExcel(): void {
    void this.router.navigate(['/import'], { queryParams: { contactId: this.contact().id } });
    this.closed.emit();
  }

  protected onDismiss(): void {
    this.closed.emit();
  }
}
