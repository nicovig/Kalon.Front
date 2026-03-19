import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule, QuillEditorComponent } from 'ngx-quill';
import { EmojiHolderComponent } from './emoji-holder/emoji-holder.component';

@Component({
  selector: 'kalon-mail-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule, EmojiHolderComponent],
  templateUrl: './mail-editor.component.html',
  styleUrls: ['./mail-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MailEditorComponent {
  @Input() subject = 'Vous nous manquez, {{prenom}} 💛';
  @Output() subjectChange = new EventEmitter<string>();

  @Input() body = '<p>Bonjour {{prenom}},</p>';
  @Output() bodyChange = new EventEmitter<string>();

  @Input() placeholder = 'Écrivez votre message…';

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
        [{ font: ['firacode', 'roboto', 'serif', 'monospace'] }],
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
      whitelist: ['mirza', 'roboto', 'aref', 'serif', 'sansserif', 'monospace']
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

  insertVariable(variable: string): void {
    if (!this.editor) return;
    const quill = this.editor.quillEditor;
    const range = quill.getSelection(true);
    const index = range ? range.index : this.body.length;
    quill.insertText(index, variable);
    quill.setSelection(index + variable.length);
  }
}

