import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AssociationPlan, AuthUser } from './auth-user.model';

@Injectable({
  providedIn: 'root'
})
export class UserStore {
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  private tokenValue: string | null = null;

  readonly currentUser$ = this.currentUserSubject.asObservable();

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return this.tokenValue;
  }

  get userId(): string {
    return this.currentUser?.id ?? 'anonymous';
  }

  get currentPlan(): AssociationPlan {
    return this.currentUser?.plan ?? 'free';
  }

  get organizationId(): string {
    return this.currentUser?.organizationId ?? 'anonymous';
  }

  hasFeature(feature: string): boolean {
    const key = String(feature ?? '').trim();
    if (!key) {
      return false;
    }
    const features = this.currentUser?.features;
    if (features && Object.prototype.hasOwnProperty.call(features, key)) {
      const raw = String(features[key] ?? '')
        .trim()
        .toLowerCase();
      return raw === 'true' || raw === '1' || raw === 'enabled' || raw === 'yes';
    }
    if (key === 'recherche_mecenes') {
      return this.currentPlan === 'premium';
    }
    return false;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && !!this.tokenValue;
  }

  setSession(token: string, user: AuthUser): void {
    this.tokenValue = token;
    this.currentUserSubject.next(user);
  }

  clearSession(): void {
    this.tokenValue = null;
    this.currentUserSubject.next(null);
  }
}
