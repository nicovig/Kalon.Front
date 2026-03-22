import { Pipe, PipeTransform } from '@angular/core';
import { DonorKind } from '../../core/models/donor.model';

@Pipe({
  name: 'donorKindLabel',
  standalone: true
})
export class DonorKindLabelPipe implements PipeTransform {
  transform(kind: DonorKind | string | null | undefined): string {
    if (kind === 'company') {
      return 'Entreprise';
    }
    return 'Particulier';
  }
}
