import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IDonor } from '../../../../core/models/donor.model';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { ToastService } from '../../../../layout/toast/toast.service';
import { DonorFormComponent, DonorFormUpdatePayload } from '../../form/donor-form.component';
import { DonorStoreService } from '../../donor.store';

@Component({
  selector: 'edit-donor-popup',
  standalone: true,
  imports: [CommonModule, PopupShellComponent, DonorFormComponent],
  templateUrl: './edit-donor-popup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditDonorPopupComponent {
  private readonly donorStore = inject(DonorStoreService);
  private readonly toast = inject(ToastService);

  readonly donor = input.required<IDonor>();

  @Output() closed = new EventEmitter<void>();

  protected onDismiss(): void {
    this.closed.emit();
  }

  protected onUpdate(payload: DonorFormUpdatePayload): void {
    this.donorStore.updateDonor(payload.donorId, payload.value);
    this.toast.show('Fiche donateur mise à jour.', 'success');
    this.closed.emit();
  }
}
