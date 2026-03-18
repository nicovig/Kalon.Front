import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'sidebar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Output() toggle = new EventEmitter<void>();

  private readonly compactMql: MediaQueryList | null =
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)') : null;

  ngOnInit(): void {
    const compact = this.compactMql?.matches ?? false;
    document.body.classList.toggle('sidebar-compact', compact);

    if (!this.compactMql) {
      return;
    }

    // Safari < 14 fallback
    const mql = this.compactMql as any;
    if (mql.addEventListener) {
      mql.addEventListener('change', this.onMediaChange);
    } else if (mql.addListener) {
      // eslint-disable-next-line deprecation/deprecation
      mql.addListener(this.onMediaChange);
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('sidebar-compact');

    if (!this.compactMql) {
      return;
    }

    const mql = this.compactMql as any;
    if (mql.removeEventListener) {
      mql.removeEventListener('change', this.onMediaChange);
    } else if (mql.removeListener) {
      // eslint-disable-next-line deprecation/deprecation
      mql.removeListener(this.onMediaChange);
    }
  }

  private readonly onMediaChange = (): void => {
    const compact = this.compactMql?.matches ?? false;
    document.body.classList.toggle('sidebar-compact', compact);
  };
}

