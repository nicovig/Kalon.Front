import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmojiHolderComponent } from './emoji-holder/emoji-holder.component';
import { ButtonLabelComponent } from '../button/button-label/button-label.component';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
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

@Component({
  selector: 'mail-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, EmojiHolderComponent, ButtonLabelComponent, TiptapEditorDirective],
  templateUrl: './mail-editor.component.html',
  styleUrls: ['./mail-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MailEditorComponent implements OnChanges, OnDestroy {
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

  protected selectedTextColor = '#1a1625';
  protected editor: Editor = new Editor({
    extensions: [StarterKit, Image, Underline, TextStyle, Color],
    content: '',
    onUpdate: ({ editor }) => {
      this.bodyChange.emit(editor.getHTML());
    }
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['body']) {
      const incoming = this.body ?? '';
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

  protected onEmojiSelected(emoji: string): void {
    this.editor.chain().focus().insertContent(emoji).run();
  }

  protected onTextColorChange(value: string): void {
    const next = value || '#1a1625';
    this.selectedTextColor = next;
    this.editor.chain().focus().setColor(next).run();
  }

  protected onSelectedTextBlockChange(id: string): void {
    this.selectedTextBlockIdChange.emit(id || null);
  }

  protected insertSelectedTextBlock(): void {
    if (!this.selectedTextBlockId) return;
    const block = this.textBlocks.find((item) => item.id === this.selectedTextBlockId);
    if (!block?.text) return;
    this.editor.chain().focus().insertContent(block.text).run();
  }

  protected onSelectedImageChange(id: string): void {
    this.selectedImageIdChange.emit(id || null);
  }

  protected insertSelectedImage(): void {
    if (!this.selectedImageId) return;
    const image = this.images.find((item) => item.id === this.selectedImageId);
    if (!image?.dataUrl) return;
    this.editor.chain().focus().setImage({ src: image.dataUrl, alt: image.label }).run();
  }
}

