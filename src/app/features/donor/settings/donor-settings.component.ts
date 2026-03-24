import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonLabelComponent } from '../../../layout/button/button-label/button-label.component';
import { PopupShellComponent } from '../../../layout/popup/popup-shell.component';
import { DonorSettingsStore } from './donor-settings.store';
import { DonorStoreService } from '../donor.store';
import { ToastService } from '../../../layout/toast/toast.service';
import { FormTextComponent } from '../../../layout/forms/text/form-text.component';

@Component({
  selector: 'donor-settings-launcher',
  standalone: true,
  imports: [CommonModule, ButtonLabelComponent, PopupShellComponent, FormTextComponent],
  templateUrl: './donor-settings.component.html',
  styleUrls: ['./donor-settings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonorSettingsComponent {
  private readonly settingsStore = inject(DonorSettingsStore);
  private readonly donorStore = inject(DonorStoreService);
  private readonly toast = inject(ToastService);

  protected readonly open = signal(false);

  protected readonly newForDays = signal(30);
  protected readonly toRemindAfterMonths = signal(12);
  protected readonly inactiveAfterMonths = signal(24);

  protected openModal(): void {
    const s = this.settingsStore.settings();
    this.newForDays.set(s.newForDays);
    this.toRemindAfterMonths.set(s.toRemindAfterMonths);
    this.inactiveAfterMonths.set(s.inactiveAfterMonths);
    this.open.set(true);
  }

  protected closeModal(): void {
    this.open.set(false);
  }

  protected save(): void {
    const toRemind = Math.max(1, Math.floor(this.toRemindAfterMonths()));
    const inactive = Math.max(toRemind + 1, Math.floor(this.inactiveAfterMonths()));
    this.settingsStore.update({
      newForDays: Math.max(1, Math.floor(this.newForDays())),
      toRemindAfterMonths: toRemind,
      inactiveAfterMonths: inactive
    });
    this.donorStore.recomputeStatuses();
    this.toast.show('Paramètres de statut mis à jour.', 'success', 3500);
    this.open.set(false);
  }

  protected resetDefaults(): void {
    this.settingsStore.reset();
    const s = this.settingsStore.settings();
    this.newForDays.set(s.newForDays);
    this.toRemindAfterMonths.set(s.toRemindAfterMonths);
    this.inactiveAfterMonths.set(s.inactiveAfterMonths);
  }

  protected onNewForDaysChange(value: string | number): void {
    this.newForDays.set(Number(value) || 1);
  }

  protected onToRemindAfterMonthsChange(value: string | number): void {
    this.toRemindAfterMonths.set(Number(value) || 1);
  }

  protected onInactiveAfterMonthsChange(value: string | number): void {
    this.inactiveAfterMonths.set(Number(value) || 2);
  }
}

