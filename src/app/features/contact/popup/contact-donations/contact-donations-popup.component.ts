import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { contactDisplayName, IContact } from '../../../../core/models/contact.model';
import { DonationPaymentMethod, DonationType } from '../../../../core/models/donation.model';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { TableComponent, TableColumn } from '../../../../layout/table/table.component';
import { DonationStoreService } from '../../../donation/donation.store';
import { ToastService } from '../../../../layout/toast/toast.service';
import { ButtonLabelComponent } from '../../../../layout/button/button-label/button-label.component';
import { FormDateComponent } from '../../../../layout/forms/date/form-date.component';
import { FormTextComponent } from '../../../../layout/forms/text/form-text.component';
import { ButtonRadioComponent } from '../../../../layout/button/radio/button-radio.component';
import { InlineLoaderComponent } from '../../../../layout/inline-loader/inline-loader.component';
import { DashboardNotificationStore } from '../../../../core/notification/dashboard-notification.store';

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
  selector: 'contact-donations-popup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PopupShellComponent,
    TableComponent,
    ButtonLabelComponent,
    ButtonRadioComponent,
    InlineLoaderComponent,
    FormTextComponent,
    FormDateComponent
  ],
  templateUrl: './contact-donations-popup.component.html',
  styleUrls: [
    './contact-donations-popup.component.css',
    '../../../donation/add-donation/add-donation-popup.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactDonationsPopupComponent {
  private readonly donationStore = inject(DonationStoreService);
  private readonly dashboardNotificationStore = inject(DashboardNotificationStore);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly contact = input.required<IContact>();

  @Output() closed = new EventEmitter<void>();

  protected readonly contactTitle = computed(() => contactDisplayName(this.contact()));

  protected readonly donationRows = computed(() => {
    this.donationStore.donationsRead();
    const id = this.contact().id;
    return this.donationStore
      .donations()
      .filter((d) => d.contactId === id)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  protected readonly donationColumns: TableColumn[] = [
    { key: 'date', header: 'Date', type: 'date', searchable: false },
    { key: 'amount', header: 'Montant (€)', type: 'number', align: 'right', searchable: false }
  ];

  protected addFormOpen = false;
  protected submitted = false;
  protected saving = false;

  protected readonly form = this.fb.group({
    amount: ['', Validators.required],
    date: ['', Validators.required],
    paymentMethod: ['bank_transfer', Validators.required]
  });

  protected readonly paymentMethodControl = this.form.get('paymentMethod')! as FormControl<string>;
  protected readonly todayDateString = new Date().toISOString().split('T')[0];

  constructor() {
    this.form.patchValue({ date: dateToInputValue(new Date()) });
  }

  protected openAddForm(): void {
    this.addFormOpen = true;
  }

  protected closeAddForm(): void {
    this.addFormOpen = false;
    this.submitted = false;
  }

  protected onSubmit(): void {
    if (this.saving) return;
    this.submitted = true;
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const amount = Number(String(raw.amount).replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return;

    const date = dateFromInputValue(String(raw.date));
    const paymentMethod = raw.paymentMethod as DonationPaymentMethod;
    const donationType: DonationType = 'financial';

    this.saving = true;
    this.donationStore
      .addDonationForContactAsync(this.contact(), amount, date, paymentMethod, donationType)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.toast.show(`Don de ${amount} € enregistré pour ${this.contactTitle()}.`, 'success');
          this.dashboardNotificationStore.refresh();
          this.submitted = false;
          this.addFormOpen = false;
          this.form.reset({
            amount: '',
            date: dateToInputValue(new Date()),
            paymentMethod: 'bank_transfer'
          });
        },
        error: () => {
          this.toast.show("Impossible d'enregistrer le don pour le moment.", 'alert');
        }
      });
  }

  protected onDismiss(): void {
    this.closed.emit();
  }
}
