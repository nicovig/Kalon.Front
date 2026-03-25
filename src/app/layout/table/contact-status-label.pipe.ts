import { Pipe, PipeTransform } from '@angular/core';
import { IContact } from '../../core/models/contact.model';

@Pipe({
  name: 'contactStatusLabel',
  standalone: true
})
export class ContactStatusLabelPipe implements PipeTransform {
  transform(status: IContact['statut']): string {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'to_remind':
        return 'À relancer';
      case 'new':
        return 'Nouveau';
      case 'inactive':
        return 'Inactif';
      default:
        return status;
    }
  }
}

