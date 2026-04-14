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

  get currentPlan(): AssociationPlan {
    return this.currentUser?.plan ?? 'free';
  }

  get organizationId(): string {
    const userId = this.currentUser?.id;
    return userId !== undefined && userId !== null ? String(userId) : 'anonymous';
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
