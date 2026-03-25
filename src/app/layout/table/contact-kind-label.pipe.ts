import { Pipe, PipeTransform } from '@angular/core';
import { ContactKind } from '../../core/models/contact.model';

@Pipe({
  name: 'contactKindLabel',
  standalone: true
})
export class ContactKindLabelPipe implements PipeTransform {
  transform(kind: ContactKind | string | null | undefined): string {
    switch (kind) {
      case 'company':
        return 'Entreprise';
      case 'donor':
        return 'Donateur';
      case 'member':
        return 'Membre';
      case 'helper':
        return 'Aidant';
      default:
        return 'Profil';
    }
  }
}
