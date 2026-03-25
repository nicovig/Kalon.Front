import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  effect,
  inject,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ContactKind, EnterpriseFiscalStatus, IContact } from '../../../core/models/contact.model';
import { ButtonLabelComponent } from '../../../layout/button/button-label/button-label.component';
import { RadioOptionComponent } from '../../../layout/button/radio/radio-option.component';
import { CheckboxComponent } from '../../../layout/button/checkbox/checkbox.component';
import { FormDateComponent } from '../../../layout/forms/date/form-date.component';
import { FormTextComponent } from '../../../layout/forms/text/form-text.component';
import type { NewContactInput } from '../contact.store';

export type NewContactFormValue = NewContactInput;

export type ContactFormUpdatePayload = { contactId: string; value: NewContactInput };

@Component({
  selector: 'contact-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonLabelComponent,
    RadioOptionComponent,
    CheckboxComponent,
    FormTextComponent,
    FormDateComponent
  ],
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly editContact = input<IContact | null>(null);

  protected readonly form: FormGroup = this.fb.group({
    category: ['particular', Validators.required],
    kind: ['donor', Validators.required],
    firstname: [''],
    lastname: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    jobTitle: [''],
    birthDate: [''],
    gender: ['other'],
    preferredFrequencySendingReceipt: ['instantly'],
    out: [false],
    address: this.fb.group({
      street: [''],
      postalCode: [''],
      city: [''],
      country: ['France']
    }),
    enterprise: this.fb.group({
      name: [''],
      siret: [''],
      fiscalStatus: ['general_interest_66', Validators.required],
      contactFirstname: [''],
      contactLastname: [''],
      contactEmail: ['', Validators.email],
      contactPhone: [''],
      address: this.fb.group({
        street: [''],
        postalCode: [''],
        city: [''],
        country: ['France']
      })
    })
  });

  protected readonly categoryControl = this.form.get('category')! as FormControl<string>;
  protected readonly kindControl = this.form.get('kind')! as FormControl<string>;
  protected readonly genderControl = this.form.get('gender')! as FormControl<string>;
  protected readonly preferredFrequencySendingReceiptControl = this.form.get(
    'preferredFrequencySendingReceipt'
  )! as FormControl<string>;

  protected readonly todayDateString = new Date().toISOString().split('T')[0];

  @Output() create = new EventEmitter<NewContactFormValue>();
  @Output() contactUpdate = new EventEmitter<ContactFormUpdatePayload>();

  protected submitted = false;
  protected errorMessage = '';

  private kindSub?: Subscription;

  constructor() {
    effect(() => {
      const d = this.editContact();
      const categoryCtrl = this.form.get('category');
      const kindCtrl = this.form.get('kind');
      if (d) {
        categoryCtrl?.disable({ emitEvent: false });
        kindCtrl?.disable({ emitEvent: false });
        this.patchFromContact(d);
      } else {
        categoryCtrl?.enable({ emitEvent: false });
        kindCtrl?.enable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.applyCategory(this.form.get('category')?.value ?? 'particular');
    this.kindSub = this.form.get('category')?.valueChanges.subscribe((c) => {
      this.applyCategory(c);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.kindSub?.unsubscribe();
  }

  private patchFromContact(d: IContact): void {
    this.submitted = false;
    this.errorMessage = '';
    const isCompany = d.kind === 'company';
    this.form.patchValue({
      category: isCompany ? 'company' : 'particular',
      kind: d.kind,
      email: d.email,
      phone: d.phone ?? '',
      jobTitle: d.jobTitle ?? '',
      birthDate: d.birthDate ? this.dateToInputValue(d.birthDate) : '',
      gender: d.gender ?? 'other',
      preferredFrequencySendingReceipt: d.preferredFrequencySendingReceipt ?? 'instantly',
      out: d.statut === 'out'
    });
    if (!isCompany) {
      this.form.patchValue({
        firstname: d.firstname,
        lastname: d.lastname,
        address: d.address ?? {
          street: '',
          postalCode: '',
          city: '',
          country: 'France'
        }
      });
    } else if (d.enterprise) {
      const e = d.enterprise;
      this.form.patchValue({
        enterprise: {
          name: e.name,
          siret: e.siret,
          fiscalStatus: e.fiscalStatus,
          contactFirstname: e.contactFirstname ?? '',
          contactLastname: e.contactLastname ?? '',
          contactEmail: e.contactEmail ?? '',
          contactPhone: e.contactPhone ?? '',
          address: {
            street: e.address.street,
            postalCode: e.address.postalCode,
            city: e.address.city,
            country: e.address.country
          }
        }
      });
    }
    this.applyCategory(isCompany ? 'company' : 'particular');
    this.cdr.markForCheck();
  }

  protected onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.errorMessage = this.firstErrorMessage();
      return;
    }

    const raw = this.form.getRawValue() as {
      category: 'particular' | 'company';
      kind: ContactKind;
      firstname: string;
      lastname: string;
      email: string;
      phone?: string;
      jobTitle: string;
      birthDate: string;
      gender: 'male' | 'female' | 'other';
      preferredFrequencySendingReceipt: IContact['preferredFrequencySendingReceipt'];
      out: boolean;
      address: {
        street: string;
        postalCode: string;
        city: string;
        country: string;
      };
      enterprise: {
        name: string;
        siret: string;
        fiscalStatus: string;
        contactFirstname: string;
        contactLastname: string;
        contactEmail: string;
        contactPhone: string;
        address: {
          street: string;
          postalCode: string;
          city: string;
          country: string;
        };
      };
    };

    this.errorMessage = '';

    const edit = this.editContact();
    const birthDate = raw.birthDate?.trim() ? this.dateFromInputValue(raw.birthDate) : undefined;

    if (raw.category === 'particular') {
      const value: NewContactInput = {
        kind: raw.kind as 'donor' | 'member' | 'helper',
        firstname: raw.firstname.trim(),
        lastname: raw.lastname.trim(),
        email: raw.email.trim(),
        phone: raw.phone?.trim() || undefined,
        address: {
          street: raw.address.street.trim(),
          postalCode: raw.address.postalCode.trim(),
          city: raw.address.city.trim(),
          country: raw.address.country.trim()
        },
        jobTitle: raw.jobTitle.trim() || undefined,
        birthDate,
        gender: raw.gender || undefined,
        preferredFrequencySendingReceipt: raw.preferredFrequencySendingReceipt,
        out: raw.out
      };

      if (edit) {
        this.contactUpdate.emit({ contactId: edit.id, value });
      } else {
        this.create.emit(value);
      }
      return;
    }

    const en = raw.enterprise;
    const value: NewContactInput = {
      kind: 'company',
      email: raw.email.trim(),
      phone: raw.phone?.trim() || undefined,
      preferredFrequencySendingReceipt: raw.preferredFrequencySendingReceipt,
      out: raw.out,
      enterprise: {
        name: en.name.trim(),
        siret: en.siret.trim(),
        fiscalStatus: en.fiscalStatus as EnterpriseFiscalStatus,
        address: {
          street: en.address.street.trim(),
          postalCode: en.address.postalCode.trim(),
          city: en.address.city.trim(),
          country: en.address.country.trim()
        },
        contactFirstname: en.contactFirstname?.trim() || undefined,
        contactLastname: en.contactLastname?.trim() || undefined,
        contactEmail: en.contactEmail?.trim() || undefined,
        contactPhone: en.contactPhone?.trim() || undefined
      }
    };

    if (edit) {
      this.contactUpdate.emit({ contactId: edit.id, value });
    } else {
      this.create.emit(value);
    }
  }

  private firstErrorMessage(): string {
    const category = (this.form.get('category')?.value ?? 'particular') as 'particular' | 'company';

    const email = this.form.get('email');
    if (email?.hasError('required')) return "L'email est obligatoire.";
    if (email?.hasError('email')) return "L'email semble invalide.";

    if (category === 'particular') {
      const firstname = this.form.get('firstname');
      if (firstname?.hasError('required')) return 'Le prénom est obligatoire.';

      const lastname = this.form.get('lastname');
      if (lastname?.hasError('required')) return 'Le nom est obligatoire.';

      const street = this.form.get('address.street');
      if (street?.hasError('required')) return 'La rue est obligatoire.';

      const postalCode = this.form.get('address.postalCode');
      if (postalCode?.hasError('required')) return 'Le code postal est obligatoire.';

      const city = this.form.get('address.city');
      if (city?.hasError('required')) return 'La ville est obligatoire.';

      const country = this.form.get('address.country');
      if (country?.hasError('required')) return 'Le pays est obligatoire.';
    } else {
      const name = this.form.get('enterprise.name');
      if (name?.hasError('required')) return 'La raison sociale est obligatoire.';

      const siret = this.form.get('enterprise.siret');
      if (siret?.hasError('required')) return 'Le SIRET est obligatoire.';

      const fiscal = this.form.get('enterprise.fiscalStatus');
      if (fiscal?.hasError('required')) return 'Le statut fiscal est obligatoire.';

      const esStreet = this.form.get('enterprise.address.street');
      if (esStreet?.hasError('required')) return 'La rue (siège) est obligatoire.';

      const esPostalCode = this.form.get('enterprise.address.postalCode');
      if (esPostalCode?.hasError('required')) return 'Le code postal (siège) est obligatoire.';

      const esCity = this.form.get('enterprise.address.city');
      if (esCity?.hasError('required')) return 'La ville (siège) est obligatoire.';

      const esCountry = this.form.get('enterprise.address.country');
      if (esCountry?.hasError('required')) return 'Le pays (siège) est obligatoire.';

      const contactEmail = this.form.get('enterprise.contactEmail');
      if (contactEmail?.hasError('email')) return "L'email du représentant semble invalide.";
    }

    return 'Veuillez vérifier les champs du formulaire.';
  }

  private applyCategory(category: 'particular' | 'company'): void {
    const addressGroup = this.form.get('address') as FormGroup;
    const enterpriseGroup = this.form.get('enterprise') as FormGroup;
    const enterpriseAddress = enterpriseGroup.get('address') as FormGroup;

    // "type de profil" (donateur/membre/aidant) ne s'applique que sur les particuliers.
    // On évite donc toute mutation de valeur incohérente sur `kind`.
    if (category === 'company') {
      this.kindControl.disable({ emitEvent: false });
    } else {
      if (this.kindControl.disabled) {
        this.kindControl.enable({ emitEvent: false });
      }
      if (!this.kindControl.value) {
        this.kindControl.setValue('donor', { emitEvent: false });
      }
    }

    if (category === 'particular') {
      this.form.get('firstname')?.setValidators([Validators.required]);
      this.form.get('lastname')?.setValidators([Validators.required]);
      addressGroup.get('street')?.setValidators([Validators.required]);
      addressGroup.get('postalCode')?.setValidators([Validators.required]);
      addressGroup.get('city')?.setValidators([Validators.required]);
      addressGroup.get('country')?.setValidators([Validators.required]);

      enterpriseGroup.get('name')?.clearValidators();
      enterpriseGroup.get('siret')?.clearValidators();
      enterpriseGroup.get('fiscalStatus')?.clearValidators();
      enterpriseAddress.get('street')?.clearValidators();
      enterpriseAddress.get('postalCode')?.clearValidators();
      enterpriseAddress.get('city')?.clearValidators();
      enterpriseAddress.get('country')?.clearValidators();

      addressGroup.enable({ emitEvent: false });
      enterpriseGroup.disable({ emitEvent: false });
    } else {
      this.form.get('firstname')?.clearValidators();
      this.form.get('lastname')?.clearValidators();
      addressGroup.get('street')?.clearValidators();
      addressGroup.get('postalCode')?.clearValidators();
      addressGroup.get('city')?.clearValidators();
      addressGroup.get('country')?.clearValidators();

      enterpriseGroup.get('name')?.setValidators([Validators.required]);
      enterpriseGroup.get('siret')?.setValidators([Validators.required]);
      enterpriseGroup.get('fiscalStatus')?.setValidators([Validators.required]);
      enterpriseAddress.get('street')?.setValidators([Validators.required]);
      enterpriseAddress.get('postalCode')?.setValidators([Validators.required]);
      enterpriseAddress.get('city')?.setValidators([Validators.required]);
      enterpriseAddress.get('country')?.setValidators([Validators.required]);

      addressGroup.disable({ emitEvent: false });
      enterpriseGroup.enable({ emitEvent: false });
    }

    this.form.get('firstname')?.updateValueAndValidity({ emitEvent: false });
    this.form.get('lastname')?.updateValueAndValidity({ emitEvent: false });
    addressGroup.get('street')?.updateValueAndValidity({ emitEvent: false });
    addressGroup.get('postalCode')?.updateValueAndValidity({ emitEvent: false });
    addressGroup.get('city')?.updateValueAndValidity({ emitEvent: false });
    addressGroup.get('country')?.updateValueAndValidity({ emitEvent: false });

    enterpriseGroup.get('name')?.updateValueAndValidity({ emitEvent: false });
    enterpriseGroup.get('siret')?.updateValueAndValidity({ emitEvent: false });
    enterpriseGroup.get('fiscalStatus')?.updateValueAndValidity({ emitEvent: false });
    enterpriseGroup.get('contactEmail')?.updateValueAndValidity({ emitEvent: false });
    enterpriseGroup.get('contactPhone')?.updateValueAndValidity({ emitEvent: false });
    enterpriseAddress.get('street')?.updateValueAndValidity({ emitEvent: false });
    enterpriseAddress.get('postalCode')?.updateValueAndValidity({ emitEvent: false });
    enterpriseAddress.get('city')?.updateValueAndValidity({ emitEvent: false });
    enterpriseAddress.get('country')?.updateValueAndValidity({ emitEvent: false });

    this.form.get('email')?.updateValueAndValidity({ emitEvent: false });
  }

  private dateToInputValue(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private dateFromInputValue(s: string): Date | undefined {
    const trimmed = s.trim();
    if (!trimmed) {
      return undefined;
    }
    const [y, m, d] = trimmed.split('-').map((x) => Number(x));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
      return undefined;
    }
    return new Date(y, m - 1, d);
  }
}
