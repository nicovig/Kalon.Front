import { Pipe, PipeTransform } from '@angular/core';
import { IDonor } from '../../core/models/donor.model';

@Pipe({
  name: 'donorStatusLabel',
  standalone: true
})
export class DonorStatusLabelPipe implements PipeTransform {
  transform(status: IDonor['statut']): string {
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

