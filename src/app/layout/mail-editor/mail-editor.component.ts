import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmojiHolderComponent } from './emoji-holder/emoji-holder.component';
import { ButtonLabelComponent } from '../button/button-label/button-label.component';
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TiptapEditorDirective } from 'ngx-tiptap';

export type MailEditorSnippet = {
  id: string;
  label: string;
  text: string;
};

export type MailEditorImageAsset = {
  id: string;
  label: string;
  dataUrl: string;
};

export type MailEditorVariableTag = {
  id: string;
  label: string;
  token: string;
};

const FontFamily = Extension.create({
  name: 'fontFamily',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) => element.style.fontFamily?.replace(/['"]/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes['fontFamily']) {
                return {};
              }
              return { style: `font-family: ${attributes['fontFamily']}` };
            }
          }
        }
      }
    ];
  }
});

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes['fontSize']) {
                return {};
              }
              return { style: `font-size: ${attributes['fontSize']}` };
            }
          }
        }
      }
    ];
  }
});

@Component({
  selector: 'mail-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, EmojiHolderComponent, ButtonLabelComponent, TiptapEditorDirective],
  templateUrl: './mail-editor.component.html',
  styleUrls: ['./mail-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MailEditorComponent implements OnChanges, OnDestroy {
  @Input() showSubject = true;
  @Input() showSidePanel = true;
  @Input() floatingSidePanel = false;
  @Input() subject = '';
  @Output() subjectChange = new EventEmitter<string>();

  @Input() body = '';
  @Output() bodyChange = new EventEmitter<string>();

  @Input() textBlocks: MailEditorSnippet[] = [];
  @Input() selectedTextBlockId: string | null = null;
  @Output() selectedTextBlockIdChange = new EventEmitter<string | null>();

  @Input() images: MailEditorImageAsset[] = [];
  @Input() selectedImageId: string | null = null;
  @Output() selectedImageIdChange = new EventEmitter<string | null>();

  @Input() variableTags: MailEditorVariableTag[] = [];

  protected selectedTextColor = '#1a1625';
  protected selectedHighlightColor = '#fff3a3';
  protected selectedFontFamily = 'Inter, Arial, sans-serif';
  protected selectedFontSize = '14px';
  protected readonly fontFamilies = [
    { value: 'Inter, Arial, sans-serif', label: 'Inter' },
    { value: 'Aptos, Arial, sans-serif', label: 'Aptos' },
    { value: 'Calibri, Arial, sans-serif', label: 'Calibri' },
    { value: '"Comic Sans MS", "Comic Sans", cursive', label: 'Comics' },
    { value: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', label: 'Impact' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: '"Times New Roman", serif', label: 'Times' },
    { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet' },
    { value: '"Courier New", monospace', label: 'Courier' }
  ];
  protected readonly fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px'];
  protected editor: Editor = new Editor({
    extensions: [StarterKit, Image, TextStyle, Color, Highlight.configure({ multicolor: true }), FontFamily, FontSize],
    content: '',
    onUpdate: ({ editor }) => {
      this.bodyChange.emit(editor.getHTML());
    }
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['body']) {
      const incoming = this.normalizeIncomingBody(this.body ?? '');
      const current = this.editor.getHTML();
      if (incoming !== current) {
        this.editor.commands.setContent(incoming || '<p></p>', { emitUpdate: false });
      }
    }
  }

  ngOnDestroy(): void {
    this.editor.destroy();
  }

  protected onSubjectInput(value: string): void {
    this.subjectChange.emit(value ?? '');
  }

  protected toggleMark(mark: 'bold' | 'italic'): void {
    if (mark === 'bold') {
      this.editor.chain().focus().toggleBold().run();
      return;
    }
    this.editor.chain().focus().toggleItalic().run();
  }

  protected toggleUnderline(): void {
    this.editor.chain().focus().toggleUnderline().run();
  }

  protected toggleHighlight(): void {
    this.editor.chain().focus().toggleHighlight({ color: this.selectedHighlightColor }).run();
  }

  protected onEmojiSelected(emoji: string): void {
    this.editor.chain().focus().insertContent(emoji).run();
  }

  protected onTextColorChange(value: string): void {
    const next = value || '#1a1625';
    this.selectedTextColor = next;
    this.editor.chain().focus().setColor(next).run();
  }

  protected onHighlightColorChange(value: string): void {
    const next = value || '#fff3a3';
    this.selectedHighlightColor = next;
    this.editor.chain().focus().setHighlight({ color: next }).run();
  }

  protected onSelectedTextBlockChange(id: string): void {
    this.selectedTextBlockIdChange.emit(id || null);
  }

  protected onTextBlockClick(id: string): void {
    this.selectedTextBlockIdChange.emit(id || null);
    this.insertTextBlockById(id);
  }

  protected onTextBlockDragStart(event: DragEvent, block: MailEditorSnippet): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', block.text || '');
    event.dataTransfer.effectAllowed = 'copy';
  }

  protected onImageClick(id: string): void {
    this.selectedImageIdChange.emit(id || null);
    this.insertImageById(id);
  }

  protected onImageDragStart(event: DragEvent, image: MailEditorImageAsset): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('application/x-kalon-image-url', image.dataUrl || '');
    event.dataTransfer.setData('text/plain', image.label || '');
    event.dataTransfer.effectAllowed = 'copy';
  }

  protected onVariableTagClick(tag: MailEditorVariableTag): void {
    if (!tag?.token) return;
    this.editor.chain().focus().insertContent(tag.token).run();
  }

  protected onVariableTagDragStart(event: DragEvent, tag: MailEditorVariableTag): void {
    if (!event.dataTransfer || !tag?.token) return;
    event.dataTransfer.setData('text/plain', tag.token);
    event.dataTransfer.effectAllowed = 'copy';
  }

  protected onEditorDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  protected onEditorDrop(event: DragEvent): void {
    event.preventDefault();
    const transfer = event.dataTransfer;
    if (!transfer) return;
    const imageUrl = transfer.getData('application/x-kalon-image-url');
    const text = transfer.getData('text/plain');
    const pos = this.editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
    const chain = this.editor.chain().focus();
    if (pos?.pos != null) {
      chain.setTextSelection(pos.pos);
    }
    if (imageUrl) {
      chain.setImage({ src: imageUrl }).run();
      return;
    }
    if (text) {
      chain.insertContent(text).run();
    }
  }

  protected insertSelectedTextBlock(): void {
    if (!this.selectedTextBlockId) return;
    this.insertTextBlockById(this.selectedTextBlockId);
  }

  protected onFontFamilyChange(value: string): void {
    const next = value || this.fontFamilies[0].value;
    this.selectedFontFamily = next;
    this.editor.chain().focus().setMark('textStyle', { fontFamily: next }).run();
  }

  protected onFontSizeChange(value: string): void {
    const next = value || '14px';
    this.selectedFontSize = next;
    this.editor.chain().focus().setMark('textStyle', { fontSize: next }).run();
  }

  private insertTextBlockById(id: string): void {
    const block = this.textBlocks.find((item) => item.id === id);
    if (!block?.text) return;
    this.editor.chain().focus().insertContent(block.text).run();
  }

  protected onSelectedImageChange(id: string): void {
    this.selectedImageIdChange.emit(id || null);
  }

  protected insertSelectedImage(): void {
    if (!this.selectedImageId) return;
    this.insertImageById(this.selectedImageId);
  }

  private insertImageById(id: string): void {
    const image = this.images.find((item) => item.id === id);
    if (!image?.dataUrl) return;
    this.editor.chain().focus().setImage({ src: image.dataUrl, alt: image.label }).run();
  }

  private normalizeIncomingBody(raw: string): string {
    const value = String(raw ?? '').trim();
    if (!value) {
      return '<p></p>';
    }
    if (this.looksLikeHtml(value)) {
      return value;
    }
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    return `<p>${escaped.replace(/\r?\n/g, '<br>')}</p>`;
  }

  private looksLikeHtml(value: string): boolean {
    return /<\/?[a-z][\s\S]*>/i.test(value);
  }
}

