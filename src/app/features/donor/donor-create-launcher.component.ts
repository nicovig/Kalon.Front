import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ButtonLabelComponent } from '../../layout/button/button-label/button-label.component';
import { ToastService } from '../../layout/toast/toast.service';
import { IDonor, donorDisplayName } from '../../core/models/donor.model';
import { AddDonationPopupComponent } from './popup/add-donation/add-donation-popup.component';
import { CreateDonorPopupComponent } from './popup/create-donor/create-donor-popup.component';

@Component({
  selector: 'donor-create-launcher',
  standalone: true,
  imports: [ButtonLabelComponent, CreateDonorPopupComponent, AddDonationPopupComponent],
  templateUrl: './donor-create-launcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonorCreateLauncherComponent {
  private readonly toast = inject(ToastService);

  protected readonly donorModalOpen = signal(false);
  protected readonly donationFollowUpOpen = signal(false);
  protected readonly createdDonor = signal<IDonor | null>(null);

  protected openDonorModal(): void {
    this.donorModalOpen.set(true);
  }

  protected onDonorPopupClosed(): void {
    this.donorModalOpen.set(false);
  }

  protected onDonorCreated(donor: IDonor): void {
    this.createdDonor.set(donor);
    this.toast.show(`Donateur ${donorDisplayName(donor)} créé.`, 'success', 4500);
    this.donationFollowUpOpen.set(true);
  }

  protected onDonationFollowUpClosed(): void {
    this.donationFollowUpOpen.set(false);
    this.createdDonor.set(null);
  }
}
