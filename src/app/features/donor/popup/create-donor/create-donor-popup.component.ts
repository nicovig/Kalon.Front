import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IDonor } from '../../../../core/models/donor.model';
import { PopupShellComponent } from '../../../../layout/popup/popup-shell.component';
import { DonorFormComponent, NewDonorFormValue } from '../../form/donor-form.component';
import { DonorStoreService } from '../../donor.store';

@Component({
  selector: 'create-donor-popup',
  standalone: true,
  imports: [CommonModule, PopupShellComponent, DonorFormComponent],
  templateUrl: './create-donor-popup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateDonorPopupComponent {
  private readonly donorStore = inject(DonorStoreService);

  @Output() closed = new EventEmitter<void>();
  @Output() donorCreated = new EventEmitter<IDonor>();

  protected onDismiss(): void {
    this.closed.emit();
  }

  protected onCreate(value: NewDonorFormValue): void {
    const donor = this.donorStore.createDonor(value);
    this.donorCreated.emit(donor);
    this.closed.emit();
  }
}
