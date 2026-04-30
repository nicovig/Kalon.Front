import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { AuthService } from './core/auth/auth.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DashboardNotificationStore } from './core/notification/dashboard-notification.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly dashboardNotificationStore = inject(DashboardNotificationStore);
  private readonly cdRef = inject(ChangeDetectorRef);
  private readonly sub = new Subscription();

  protected sidebarVisible = this.authService.isAuthenticated();

  ngOnInit(): void {
    this.sidebarVisible = this.authService.isAuthenticated();
    this.sub.add(
      this.authService.currentUser$.subscribe(() => {
        this.sidebarVisible = this.authService.isAuthenticated();
        if (this.authService.isAuthenticated()) {
          this.dashboardNotificationStore.refresh();
        } else {
          this.dashboardNotificationStore.reset();
        }
        this.cdRef.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
