import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'info' | 'alert' | 'success';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs?: number;
  closing?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly itemsSubject = new BehaviorSubject<ToastItem[]>([]);
  readonly items$ = this.itemsSubject.asObservable();

  show(message: string, type: ToastType = 'info', durationMs = 3000): string {
    const id = crypto.randomUUID();
    const next: ToastItem = { id, message, type, durationMs };

    this.itemsSubject.next([...this.itemsSubject.value, next]);

    if (durationMs > 0) {
      window.setTimeout(() => this.dismiss(id), durationMs);
    }

    return id;
  }

  dismiss(id: string): void {
    const items = this.itemsSubject.value;
    const index = items.findIndex((t) => t.id === id);
    if (index === -1) {
      return;
    }

    const next = items.map((t) => (t.id === id ? { ...t, closing: true } : t));
    this.itemsSubject.next(next);

    window.setTimeout(() => {
      this.itemsSubject.next(this.itemsSubject.value.filter((t) => t.id !== id));
    }, 220);
  }

  clear(): void {
    this.itemsSubject.next([]);
  }
}

