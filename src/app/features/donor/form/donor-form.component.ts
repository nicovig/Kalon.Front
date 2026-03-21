import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ButtonComponent } from '../../../layout/button/button.component';
import { FormTextComponent } from '../../../layout/forms/text/form-text.component';
import type { NewDonorInput } from '../donor.store';

export type NewDonorFormValue = NewDonorInput;

@Component({
  selector: 'donor-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FormTextComponent],
  templateUrl: './donor-form.component.html',
  styleUrls: ['./donor-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonorFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly form: FormGroup = this.fb.group({
    kind: ['individual', Validators.required],
    firstname: [''],
    lastname: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    address: this.fb.group({
      street: [''],
      postalCode: [''],
      city: [''],
      country: ['France']
    }),
    enterprise: this.fb.group({
      name: [''],
      siret: [''],
      contactFirstname: [''],
      contactLastname: [''],
      address: this.fb.group({
        street: [''],
        postalCode: [''],
        city: [''],
        country: ['France']
      })
    })
  });

  @Output() create = new EventEmitter<NewDonorFormValue>();

  protected submitted = false;
  protected errorMessage = '';

  private kindSub?: Subscription;

  ngOnInit(): void {
    this.applyKind(this.form.get('kind')?.value ?? 'individual');
    this.kindSub = this.form.get('kind')?.valueChanges.subscribe((k) => {
      this.applyKind(k);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.kindSub?.unsubscribe();
  }

  protected onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.errorMessage = this.firstErrorMessage();
      return;
    }

    const raw = this.form.getRawValue() as {
      kind: 'individual' | 'company';
      firstname: string;
      lastname: string;
      email: string;
      phone?: string;
      address: {
        street: string;
        postalCode: string;
        city: string;
        country: string;
      };
      enterprise: {
        name: string;
        siret: string;
        contactFirstname: string;
        contactLastname: string;
        address: {
          street: string;
          postalCode: string;
          city: string;
          country: string;
        };
      };
    };

    this.errorMessage = '';

    if (raw.kind === 'individual') {
      this.create.emit({
        kind: 'individual',
        firstname: raw.firstname.trim(),
        lastname: raw.lastname.trim(),
        email: raw.email.trim(),
        phone: raw.phone?.trim() || undefined,
        address: {
          street: raw.address.street.trim(),
          postalCode: raw.address.postalCode.trim(),
          city: raw.address.city.trim(),
          country: raw.address.country.trim()
        }
      });
      return;
    }

    const en = raw.enterprise;
    this.create.emit({
      kind: 'company',
      email: raw.email.trim(),
      phone: raw.phone?.trim() || undefined,
      enterprise: {
        name: en.name.trim(),
        siret: en.siret.trim(),
        address: {
          street: en.address.street.trim(),
          postalCode: en.address.postalCode.trim(),
          city: en.address.city.trim(),
          country: en.address.country.trim()
        },
        contactFirstname: en.contactFirstname?.trim() || undefined,
        contactLastname: en.contactLastname?.trim() || undefined
      }
    });
  }

  private firstErrorMessage(): string {
    const kind = (this.form.get('kind')?.value ?? 'individual') as 'individual' | 'company';

    const email = this.form.get('email');
    if (email?.hasError('required')) return "L'email est obligatoire.";
    if (email?.hasError('email')) return "L'email semble invalide.";

    if (kind === 'individual') {
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

      const esStreet = this.form.get('enterprise.address.street');
      if (esStreet?.hasError('required')) return 'La rue (siège) est obligatoire.';

      const esPostalCode = this.form.get('enterprise.address.postalCode');
      if (esPostalCode?.hasError('required')) return 'Le code postal (siège) est obligatoire.';

      const esCity = this.form.get('enterprise.address.city');
      if (esCity?.hasError('required')) return 'La ville (siège) est obligatoire.';

      const esCountry = this.form.get('enterprise.address.country');
      if (esCountry?.hasError('required')) return 'Le pays (siège) est obligatoire.';
    }

    return 'Veuillez vérifier les champs du formulaire.';
  }

  private applyKind(kind: 'individual' | 'company'): void {
    const addressGroup = this.form.get('address') as FormGroup;
    const enterpriseGroup = this.form.get('enterprise') as FormGroup;
    const enterpriseAddress = enterpriseGroup.get('address') as FormGroup;

    if (kind === 'individual') {
      this.form.get('firstname')?.setValidators([Validators.required]);
      this.form.get('lastname')?.setValidators([Validators.required]);
      addressGroup.get('street')?.setValidators([Validators.required]);
      addressGroup.get('postalCode')?.setValidators([Validators.required]);
      addressGroup.get('city')?.setValidators([Validators.required]);
      addressGroup.get('country')?.setValidators([Validators.required]);

      enterpriseGroup.get('name')?.clearValidators();
      enterpriseGroup.get('siret')?.clearValidators();
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
    enterpriseAddress.get('street')?.updateValueAndValidity({ emitEvent: false });
    enterpriseAddress.get('postalCode')?.updateValueAndValidity({ emitEvent: false });
    enterpriseAddress.get('city')?.updateValueAndValidity({ emitEvent: false });
    enterpriseAddress.get('country')?.updateValueAndValidity({ emitEvent: false });

    this.form.get('email')?.updateValueAndValidity({ emitEvent: false });
  }
}
