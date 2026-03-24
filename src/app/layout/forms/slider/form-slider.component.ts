import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'form-slider-component',
  standalone: true,
  templateUrl: './form-slider.component.html',
  styleUrls: ['./form-slider.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormSliderComponent implements OnChanges {
  @Input() id = '';
  @Input() min = 0;
  @Input() max = 100;
  @Input() value = 0;
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string>();

  protected trackBackground = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['min'] || changes['max']) {
      this.updateTrack();
    }
  }

  protected onInput(value: string): void {
    this.valueChange.emit(value);
  }

  private updateTrack(): void {
    const min = Number(this.min);
    const max = Number(this.max);
    const current = Number(this.value);
    const safeMax = Number.isFinite(max) ? max : 100;
    const safeMin = Number.isFinite(min) ? min : 0;
    const span = safeMax - safeMin || 1;
    const clamped = Math.max(safeMin, Math.min(safeMax, Number.isFinite(current) ? current : safeMin));
    const pct = ((clamped - safeMin) / span) * 100;
    this.trackBackground = `linear-gradient(to right, var(--violet) 0%, var(--violet) ${pct}%, var(--ink-30) ${pct}%)`;
  }
}
