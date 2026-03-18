import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { ToastService, ToastType } from './toast.service';

@Component({
  selector: 'toast-component',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);

  @Input() position: 'center-third' | 'bottom-right' = 'center-third';

  protected readonly items$ = this.toastService.items$;

  protected iconFor(type: ToastType): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'alert':
        return '⚠';
      case 'info':
      default:
        return 'ℹ️';
    }
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}