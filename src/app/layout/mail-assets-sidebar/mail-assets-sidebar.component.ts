import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrganizationCustomContentStore } from '../../features/account/organization-custom-content.store';
@Component({
  selector: 'mail-assets-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mail-assets-sidebar.component.html',
  styleUrls: ['./mail-assets-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MailAssetsSidebarComponent {
  private readonly store = inject(OrganizationCustomContentStore);

  constructor() {
    this.store.ensureLoaded();
  }

  readonly textBlockInsert = output<string>();
  readonly imageAssetInsert = output<string>();
  readonly documentAssetInsert = output<{ fileName: string; dataUrl: string }>();

  protected readonly signatureBlocks = computed(() =>
    this.store.textBlocks().filter((b) => b.role === 'signature')
  );
  protected readonly standardTextBlocks = computed(() =>
    this.store.textBlocks().filter((b) => b.role === 'text')
  );
  protected readonly images = this.store.images;
  protected readonly documents = this.store.documents;

  protected emitText(content: string): void {
    const t = content.trim();
    if (!t) return;
    this.textBlockInsert.emit(t);
  }

  protected emitImage(dataUrl: string): void {
    if (!dataUrl.trim()) return;
    this.imageAssetInsert.emit(dataUrl);
  }

  protected emitDocument(fileName: string, dataUrl: string): void {
    if (!fileName.trim() || !dataUrl.trim()) return;
    this.documentAssetInsert.emit({ fileName, dataUrl });
  }
}
