import { Pipe, PipeTransform } from '@angular/core';
import { ContactKind } from '../../core/models/contact.model';

@Pipe({
  name: 'contactKindLabel',
  standalone: true
})
export class ContactKindLabelPipe implements PipeTransform {
  transform(kind: ContactKind | string | null | undefined): string {
    if (kind === 'company') {
      return 'Entreprise';
    }
    return 'Particulier';
  }
}
