import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../layout/button/button.component';
import { FormTextComponent } from '../../../layout/forms/text/form-text.component';

export interface NewDonorFormValue {
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
  enterprise?: {
    name: string;
    siret: string;
    address: {
      street: string;
      postalCode: string;
      city: string;
      country: string;
    };
  };

}

@Component({
  selector: 'donor-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FormTextComponent],
  templateUrl: './donor-form.component.html',
  styleUrls: ['./donor-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonorFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  protected activeTab: 'personne' | 'entreprise' = 'personne';

  protected setActiveTab(tab: 'personne' | 'entreprise'): void {
    this.activeTab = tab;
  }

  protected readonly form: FormGroup = this.fb.group({
    firstname: ['', Validators.required],
    lastname: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    address: this.fb.group({
      street: ['', Validators.required],
      postalCode: ['', Validators.required],
      city: ['', Validators.required],
      country: ['France', Validators.required]
    }),
    enterpriseMode: ['none'],
    enterprise: this.fb.group({
      name: [''],
      siret: [''],
      address: this.fb.group({
        street: ['', Validators.required],
        postalCode: ['', Validators.required],
        city: ['', Validators.required],
        country: ['France', Validators.required]
      })
    })
  });

  @Output() create = new EventEmitter<NewDonorFormValue>();

  protected submitted = false;
  protected errorMessage = '';

  ngOnInit(): void {
    this.syncEnterpriseAddressState();
    this.form.get('enterpriseMode')?.valueChanges.subscribe((mode) => {
      this.syncEnterpriseAddressState();
      if (mode === 'none') {
        this.activeTab = 'personne';
      } else {
        this.activeTab = 'entreprise';
      }
    });
  }

  protected onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.errorMessage = this.firstErrorMessage();
      return;
    }

    const value = this.form.value as {
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
        address: {
          street: string;
          postalCode: string;
          city: string;
          country: string;
        };
      };
    };

    const enterpriseMode = (this.form.get('enterpriseMode')?.value ?? 'none') as 'none' | 'donorAddress' | 'customAddress';

    const enterpriseName = String(value.enterprise.name ?? '').trim();
    const enterpriseSiret = String(value.enterprise.siret ?? '').trim();
    const hasEnterprise = enterpriseMode !== 'none';

    if (hasEnterprise && !enterpriseName) {
      this.errorMessage = "Le nom de l'entreprise est obligatoire.";
      return;
    }
    if (hasEnterprise && !enterpriseSiret) {
      this.errorMessage = "Le SIRET de l'entreprise est obligatoire.";
      return;
    }

    this.errorMessage = '';
    this.create.emit({
      firstname: value.firstname.trim(),
      lastname: value.lastname.trim(),
      email: value.email.trim(),
      phone: value.phone?.trim() || undefined,
      address: {
        street: value.address.street.trim(),
        postalCode: value.address.postalCode.trim(),
        city: value.address.city.trim(),
        country: value.address.country.trim()
      },
      enterprise: hasEnterprise
        ? {
            name: enterpriseName,
            siret: enterpriseSiret,
            address:
              enterpriseMode === 'customAddress'
                ? {
                    street: value.enterprise.address.street.trim(),
                    postalCode: value.enterprise.address.postalCode.trim(),
                    city: value.enterprise.address.city.trim(),
                    country: value.enterprise.address.country.trim()
                  }
                : {
                    street: value.address.street.trim(),
                    postalCode: value.address.postalCode.trim(),
                    city: value.address.city.trim(),
                    country: value.address.country.trim()
                  }
          }
        : undefined
    });
  }

  private firstErrorMessage(): string {
    const firstname = this.form.get('firstname');
    if (firstname?.hasError('required')) return 'Le prénom est obligatoire.';

    const lastname = this.form.get('lastname');
    if (lastname?.hasError('required')) return 'Le nom est obligatoire.';

    const email = this.form.get('email');
    if (email?.hasError('required')) return "L'email est obligatoire.";
    if (email?.hasError('email')) return "L'email semble invalide.";

    const street = this.form.get('address.street');
    if (street?.hasError('required')) return 'La rue est obligatoire.';

    const postalCode = this.form.get('address.postalCode');
    if (postalCode?.hasError('required')) return 'Le code postal est obligatoire.';

    const city = this.form.get('address.city');
    if (city?.hasError('required')) return 'La ville est obligatoire.';

    const country = this.form.get('address.country');
    if (country?.hasError('required')) return 'Le pays est obligatoire.';

    const enterpriseMode = (this.form.get('enterpriseMode')?.value ?? 'none') as 'none' | 'donorAddress' | 'customAddress';
    if (enterpriseMode === 'customAddress') {
      const esStreet = this.form.get('enterprise.address.street');
      if (esStreet?.hasError('required')) return 'L’adresse de l’entreprise : rue est obligatoire.';

      const esPostalCode = this.form.get('enterprise.address.postalCode');
      if (esPostalCode?.hasError('required')) return 'L’adresse de l’entreprise : code postal est obligatoire.';

      const esCity = this.form.get('enterprise.address.city');
      if (esCity?.hasError('required')) return 'L’adresse de l’entreprise : ville est obligatoire.';

      const esCountry = this.form.get('enterprise.address.country');
      if (esCountry?.hasError('required')) return 'L’adresse de l’entreprise : pays est obligatoire.';
    }

    return 'Veuillez vérifier les champs du formulaire.';
  }

  private syncEnterpriseAddressState(): void {
    const mode = (this.form.get('enterpriseMode')?.value ?? 'none') as 'none' | 'donorAddress' | 'customAddress';
    const addressGroup = this.form.get('enterprise.address') as FormGroup;

    if (mode === 'none') {
      addressGroup.disable({ emitEvent: false });
      return;
    }

    if (mode === 'donorAddress') {
      const donorAddress = this.form.get('address')?.value;
      addressGroup.patchValue(donorAddress, { emitEvent: false });
      addressGroup.disable({ emitEvent: false });
      return;
    }

    // customAddress
    addressGroup.enable({ emitEvent: false });
  }
}

