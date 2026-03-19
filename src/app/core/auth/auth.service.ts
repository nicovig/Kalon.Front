import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const AUTH_KEY = 'kalon.currentUser';

export type AssociationPlan = 'free' | 'basic' | 'premium';

export interface AuthUser {
  firstname: string;
  lastname: string;
  email: string;
  associationName: string;
  plan: AssociationPlan;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(this.readFromStorage());

  readonly currentUser$ = this.currentUserSubject.asObservable();

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  get currentPlan(): AssociationPlan {
    return this.currentUser?.plan ?? 'free';
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  login(email: string, plan: AssociationPlan = 'basic'): void {
    const user: AuthUser = { email, plan, firstname: 'Marie', lastname: 'Dupont', associationName: 'Asso Parents d\'élèves' };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  logout(): void {
    localStorage.removeItem(AUTH_KEY);
    this.currentUserSubject.next(null);
  }

  private readFromStorage(): AuthUser | null {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
  }
}


