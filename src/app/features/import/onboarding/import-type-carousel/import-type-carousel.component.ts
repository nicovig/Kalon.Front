import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportMode, IMPORT_MODE_OPTIONS, IMPORT_MODE_ORDER } from '../../core/import-mode.model';

@Component({
  selector: 'import-type-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-type-carousel.component.html',
  styleUrl: './import-type-carousel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportTypeCarouselComponent {
  protected readonly options = IMPORT_MODE_OPTIONS;
  protected readonly modeOrder = IMPORT_MODE_ORDER;

  readonly mode = input.required<ImportMode>();

  readonly modeChange = output<ImportMode>();

  private readonly modeViewport = viewChild<ElementRef<HTMLElement>>('modeViewport');

  private syncingCarousel = false;

  private viewportScrollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.mode();
      const v = this.modeViewport();
      if (!v) {
        return;
      }
      queueMicrotask(() => this.scrollCarouselToMode());
    });
  }

  protected selectMode(m: ImportMode): void {
    if (this.mode() === m) {
      return;
    }
    this.modeChange.emit(m);
  }

  protected navigate(delta: number): void {
    const order = this.modeOrder;
    const i = order.indexOf(this.mode());
    const next = order[(i + delta + order.length) % order.length];
    this.selectMode(next);
  }

  protected onKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.navigate(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.navigate(1);
    }
  }

  protected onViewportScroll(): void {
    if (this.syncingCarousel) {
      return;
    }
    if (this.viewportScrollTimer) {
      clearTimeout(this.viewportScrollTimer);
    }
    this.viewportScrollTimer = setTimeout(() => {
      this.viewportScrollTimer = null;
      this.applyModeFromScroll();
    }, 140);
  }

  private applyModeFromScroll(): void {
    if (this.syncingCarousel) {
      return;
    }
    const host = this.modeViewport()?.nativeElement;
    if (!host) {
      return;
    }
    const first = host.querySelector('.itc-slide') as HTMLElement | null;
    const slideW = first?.offsetWidth ?? host.clientWidth;
    if (slideW <= 0) {
      return;
    }
    const i = Math.round(host.scrollLeft / slideW);
    const next = this.modeOrder[i];
    if (next && this.mode() !== next) {
      this.modeChange.emit(next);
    }
  }

  private scrollCarouselToMode(): void {
    const host = this.modeViewport()?.nativeElement;
    if (!host) {
      return;
    }
    const idx = this.modeOrder.indexOf(this.mode());
    if (idx < 0) {
      return;
    }
    const slides = host.querySelectorAll('.itc-slide');
    const slide = slides[idx] as HTMLElement | undefined;
    if (!slide) {
      return;
    }
    this.syncingCarousel = true;
    slide.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
    window.setTimeout(() => {
      this.syncingCarousel = false;
    }, 180);
  }
}
