import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonLabelComponent } from '../../../layout/button/button-label/button-label.component';
import { PopupShellComponent } from '../../../layout/popup/popup-shell.component';
import { ContactSettingsStore } from './contact-settings.store';
import { ContactStoreService } from '../contact.store';
import { ToastService } from '../../../layout/toast/toast.service';
import { FormTextComponent } from '../../../layout/forms/text/form-text.component';

@Component({
  selector: 'contact-settings-launcher',
  standalone: true,
  imports: [CommonModule, ButtonLabelComponent, PopupShellComponent, FormTextComponent],
  templateUrl: './contact-settings.component.html',
  styleUrls: ['./contact-settings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactSettingsComponent {
  private readonly settingsStore = inject(ContactSettingsStore);
  private readonly contactStore = inject(ContactStoreService);
  private readonly toast = inject(ToastService);

  protected readonly open = signal(false);
  protected readonly loading = signal(false);

  protected readonly newForDays = signal(30);
  protected readonly toRemindAfterMonths = signal(12);
  protected readonly inactiveAfterMonths = signal(24);

  protected openModal(): void {
    this.loading.set(true);
    this.settingsStore.loadFromApi().subscribe({
      next: (s) => {
        this.newForDays.set(s.newForDays);
        this.toRemindAfterMonths.set(s.toRemindAfterMonths);
        this.inactiveAfterMonths.set(s.inactiveAfterMonths);
        this.loading.set(false);
      },
      error: () => {
        const s = this.settingsStore.settings();
        this.newForDays.set(s.newForDays);
        this.toRemindAfterMonths.set(s.toRemindAfterMonths);
        this.inactiveAfterMonths.set(s.inactiveAfterMonths);
        this.loading.set(false);
      }
    });
    this.open.set(true);
  }

  protected closeModal(): void {
    this.open.set(false);
  }

  protected save(): void {
    const toRemind = Math.max(1, Math.floor(this.toRemindAfterMonths()));
    const inactive = Math.max(toRemind + 1, Math.floor(this.inactiveAfterMonths()));
    this.loading.set(true);
    this.settingsStore.updateAsync({
      newForDays: Math.max(1, Math.floor(this.newForDays())),
      toRemindAfterMonths: toRemind,
      inactiveAfterMonths: inactive
    }).subscribe({
      next: () => {
        this.contactStore.recomputeStatuses();
        this.toast.show('Paramètres de statut mis à jour.', 'success', 3500);
        this.loading.set(false);
        this.open.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Impossible de sauvegarder les paramètres.', 'alert', 3500);
      }
    });
  }


  protected resetDefaults(): void {
    this.loading.set(true);
    this.settingsStore.resetAsync().subscribe({
      next: (s) => {
        this.newForDays.set(s.newForDays);
        this.toRemindAfterMonths.set(s.toRemindAfterMonths);
        this.inactiveAfterMonths.set(s.inactiveAfterMonths);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('Impossible de réinitialiser les paramètres.', 'alert', 3500);
      }
    });
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

