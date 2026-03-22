import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { PopupShellComponent } from '../../../layout/popup/popup-shell.component';
import { ButtonLabelComponent } from '../../../layout/button/button-label/button-label.component';
import { CreateDonorPopupComponent } from '../popup/create-donor/create-donor-popup.component';
import { AddDonationPopupComponent } from '../popup/add-donation/add-donation-popup.component';
import { DonorStoreService } from '../donor.store';
import { ToastService } from '../../../layout/toast/toast.service';
import { IDonor, donorDisplayName } from '../../../core/models/donor.model';

@Component({
  selector: 'empty-donors-welcome',
  standalone: true,
  imports: [
    PopupShellComponent,
    ButtonLabelComponent,
    CreateDonorPopupComponent,
    AddDonationPopupComponent
  ],
  templateUrl: './empty-donors-welcome.component.html',
  styleUrls: ['./empty-donors-welcome.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyDonorsWelcomeComponent implements OnInit {
  private readonly donorStore = inject(DonorStoreService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly showWelcome = signal(false);
  protected readonly createOpen = signal(false);
  protected readonly donationFollowUpOpen = signal(false);
  protected readonly createdDonor = signal<IDonor | null>(null);

  ngOnInit(): void {
    if (this.donorStore.donors().length === 0) {
      this.showWelcome.set(true);
    }
  }

  protected onDismissWelcome(): void {
    this.showWelcome.set(false);
  }

  protected goImport(): void {
    this.showWelcome.set(false);
    void this.router.navigate(['/import']);
  }

  protected openCreate(): void {
    this.showWelcome.set(false);
    this.createOpen.set(true);
  }

  protected onCreateClosed(): void {
    this.createOpen.set(false);
    if (this.donorStore.donors().length === 0) {
      this.showWelcome.set(true);
    }
  }

  protected onDonorCreated(donor: IDonor): void {
    this.createdDonor.set(donor);
    this.toast.show(`Donateur ${donorDisplayName(donor)} créé.`, 'success', 4500);
    this.donationFollowUpOpen.set(true);
    this.showWelcome.set(false);
  }

  protected onDonationFollowUpClosed(): void {
    this.donationFollowUpOpen.set(false);
    this.createdDonor.set(null);
  }
}
