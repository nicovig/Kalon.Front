import { Pipe, PipeTransform } from '@angular/core';
import { contactNatureLabel } from '../../core/models/contact.model';

@Pipe({
  name: 'contactKindLabel',
  standalone: true
})
export class ContactKindLabelPipe implements PipeTransform {
  transform(value: boolean | string | null | undefined): string {
    if (typeof value === 'boolean') {
      return contactNatureLabel(value);
    }
    if (value === 'company' || value === 'enterprise' || value === 'true') {
      return 'Entreprise';
    }
    return 'Particulier';
  }
}
