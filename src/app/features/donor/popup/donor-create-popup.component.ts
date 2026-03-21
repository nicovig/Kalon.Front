import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DonorFormComponent, NewDonorFormValue } from '../form/donor-form.component';
import { DonorStoreService } from '../donor.store';

@Component({
  selector: 'donor-create-popup',
  standalone: true,
  imports: [CommonModule, DonorFormComponent],
  templateUrl: './donor-create-popup.component.html',
  styleUrls: ['./donor-create-popup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonorCreatePopupComponent {
  private readonly donorStore = inject(DonorStoreService);

  @Output() closed = new EventEmitter<void>();

  protected close(): void {
    this.closed.emit();
  }

  onCancel(): void {
    this.close();
  }

  onCreate(value: NewDonorFormValue): void {
    this.donorStore.createDonor(value);
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.close();
  }
}

