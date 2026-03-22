import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImportFlowService {
  private readonly fileSignal = signal<File | null>(null);

  private readonly parsingWrite = signal(false);

  readonly parsing = this.parsingWrite.asReadonly();

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
}
