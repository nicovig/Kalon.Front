import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImportFlowService {
  private readonly fileSignal = signal<File | null>(null);

  private readonly parsingWrite = signal(false);

  private readonly suggestDonationsWrite = signal(false);

  readonly parsing = this.parsingWrite.asReadonly();

  readonly suggestDonations = this.suggestDonationsWrite.asReadonly();

  setPendingFile(file: File | null): void {
    this.fileSignal.set(file);
  }

  takePendingFile(): File | null {
    const f = this.fileSignal();
    this.fileSignal.set(null);
    return f;
  }

  peekPendingFile(): File | null {
    return this.fileSignal();
  }

  setParsing(inProgress: boolean): void {
    this.parsingWrite.set(inProgress);
  }

  setSuggestDonationsNext(value: boolean): void {
    this.suggestDonationsWrite.set(value);
  }

  consumeSuggestDonations(): boolean {
    const v = this.suggestDonationsWrite();
    this.suggestDonationsWrite.set(false);
    return v;
  }
}
