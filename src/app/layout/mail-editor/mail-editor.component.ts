import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule, QuillEditorComponent } from 'ngx-quill';
import { EmojiHolderComponent } from './emoji-holder/emoji-holder.component';
import { ButtonLabelComponent } from '../button/button-label/button-label.component';
import { FormSelectComponent, FormSelectOption } from '../forms/select/form-select.component';

export type MailEditorSnippet = {
  id: string;
  label: string;
  text: string;
};

@Component({
  selector: 'mail-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule, EmojiHolderComponent, ButtonLabelComponent, FormSelectComponent],
  templateUrl: './mail-editor.component.html',
  styleUrls: ['./mail-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MailEditorComponent {
  @Input() subject = 'Vous nous manquez, {{prenom}} 💛';
  @Output() subjectChange = new EventEmitter<string>();

  @Input() body = '<p>Bonjour {{prenom}},</p>';
  @Output() bodyChange = new EventEmitter<string>();

  @Input() showInsertRows = true;

  @Input() placeholder = 'Écrivez votre message…';

  @Input() snippetOptions: MailEditorSnippet[] = [];
  @Input() selectedSnippetId = '';
  @Output() selectedSnippetIdChange = new EventEmitter<string>();

  @Input() imageOptions: FormSelectOption[] = [];
  @Input() selectedImageId = '';
  @Output() selectedImageIdChange = new EventEmitter<string>();
  @Input() selectedImageDataUrl = '';

  @Input() documentOptions: FormSelectOption[] = [];
  @Input() selectedDocumentId = '';
  @Output() selectedDocumentIdChange = new EventEmitter<string>();
  @Input() selectedDocumentDataUrl = '';
  @Input() selectedDocumentFileName = '';

  protected get snippetSelectOptions(): FormSelectOption[] {
    return this.snippetOptions.map((opt) => ({ value: opt.id, label: opt.label }));
  }

  @ViewChild(QuillEditorComponent)
  private editor?: QuillEditorComponent;

  protected readonly quillConfig = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        ['code-block'],
        [{ header: 1 }, { header: 2 }, { header: 3 }, { header: 4 }, { header: 5 }, { header: 6 }, { size: ['small', false, 'large', 'huge'] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ script: 'sub' }, { script: 'super' }],
        [{ direction: 'rtl' }],
        [{ font: ['firacode', 'roboto', 'monospace'] }],
        [{ align: ['', 'center', 'right', 'justify'] }],
        ['clean'],
        ['link'],
        [{ color: [] }, { background: [] }]
      ]
    }
  };

  protected readonly customOptions = [
    {
      import: 'formats/font',
      whitelist: ['mirza', 'roboto', 'aref', 'sansserif', 'monospace']
    }
  ];

  onSubjectChange(value: string): void {
    this.subject = value;
    this.subjectChange.emit(value);
  }

  onBodyChanged(html: string): void {
    this.body = html;
    this.bodyChange.emit(html);
  }

  onSelectionChanged(): void {
    // hook available if needed
  }

  onContentChanged(): void {
    // hook available if needed
  }

  onSnippetSelectionChange(id: string): void {
    this.selectedSnippetId = id;
    this.selectedSnippetIdChange.emit(id);
  }

  onImageSelectionChange(id: string): void {
    this.selectedImageId = id;
    this.selectedImageIdChange.emit(id);
  }

  onDocumentSelectionChange(id: string): void {
    this.selectedDocumentId = id;
    this.selectedDocumentIdChange.emit(id);
  }

  insertSelectedSnippet(): void {
    const snippet = this.snippetOptions.find((s) => s.id === this.selectedSnippetId);
    if (!snippet) return;
    this.insertPlainTextAtCursor(snippet.text);
  }

  insertPlainTextAtCursor(text: string): void {
    this.insertSnippetText(text);
  }

  insertImage(imageUrl: string): void {
    if (!imageUrl || !this.editor) return;
    const quill = this.editor.quillEditor;
    const range = quill.getSelection(true);
    const index = range ? range.index : quill.getLength();
    quill.insertEmbed(index, 'image', imageUrl, 'user');
    quill.insertText(index + 1, '\n');
    quill.setSelection(index + 2);
    this.onBodyChanged(quill.root.innerHTML);
  }

  insertDocumentLink(fileName: string, dataUrl: string): void {
    if (!fileName || !dataUrl || !this.editor) return;
    const quill = this.editor.quillEditor;
    const range = quill.getSelection(true);
    const index = range ? range.index : quill.getLength();
    quill.insertText(index, fileName, { link: dataUrl });
    quill.insertText(index + fileName.length, '\n');
    quill.setSelection(index + fileName.length + 1);
    this.onBodyChanged(quill.root.innerHTML);
  }

  insertSelectedImage(): void {
    this.insertImage(this.selectedImageDataUrl);
  }

  insertSelectedDocument(): void {
    this.insertDocumentLink(this.selectedDocumentFileName, this.selectedDocumentDataUrl);
  }

  private insertSnippetText(text: string): void {
    if (!text) return;
    if (!this.editor) {
      this.onBodyChanged(`${this.body}<p>${text}</p>`);
      return;
    }
    const quill = this.editor.quillEditor;
    const range = quill.getSelection(true);
    const index = range ? range.index : quill.getLength();
    quill.insertText(index, `${text}\n`);
    quill.setSelection(index + text.length + 1);
    this.onBodyChanged(quill.root.innerHTML);
  }

  insertVariable(variable: string): void {
    if (!this.editor) return;
    const quill = this.editor.quillEditor;
    const range = quill.getSelection(true);
    const index = range ? range.index : this.body.length;
    quill.insertText(index, variable);
    quill.setSelection(index + variable.length);
  }
}

