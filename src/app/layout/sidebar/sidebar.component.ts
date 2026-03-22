import { ChangeDetectionStrategy, Component, computed, EventEmitter, HostListener, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected logoutMenuOpen = false;
  protected logoutMenuX = 0;
  protected logoutMenuY = 0;

  protected get currentUser() {
    return this.authService.currentUser;
  }

  protected get userInitials(): string {
    const email = this.authService.currentUser?.email ?? '';
    const localPart = email.split('@')[0] ?? '';
    if (!localPart) {
      return 'AP';
    }

    const parts = localPart.split(/[.\-_ ]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    return localPart.slice(0, 2).toUpperCase();
  }

  @Input() collapsed = false;
  @Output() toggle = new EventEmitter<void>();

  protected readonly kpiToRemind = computed(() => 0);

  onAssoCardClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const x = event.clientX;
    const y = event.clientY;
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const menuW = 210;
    const menuH = 60;

    this.logoutMenuX = Math.min(x, maxW - menuW - 12);
    this.logoutMenuY = Math.min(y, maxH - menuH - 12);
    this.logoutMenuOpen = !this.logoutMenuOpen;
  }

  onAssoCardKeyDown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;
    event.preventDefault();

    const card = (keyboardEvent.target as HTMLElement | null)?.closest('.asso-card') as HTMLElement | null;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = rect.right + 10;
    const y = rect.top + rect.height / 2;

    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const menuW = 210;
    const menuH = 60;

    this.logoutMenuX = Math.min(x, maxW - menuW - 12);
    this.logoutMenuY = Math.min(y, maxH - menuH - 12);
    this.logoutMenuOpen = true;
  }

  onLogout(): void {
    this.logoutMenuOpen = false;
    this.authService.logout();
    this.router.navigateByUrl('/auth/login');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('.logout-menu')) return;
    if (target.closest('.asso-card')) return;
    this.logoutMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.logoutMenuOpen = false;
  }

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

