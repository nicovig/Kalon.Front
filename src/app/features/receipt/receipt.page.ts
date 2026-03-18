import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'receipt-page',
  standalone: true,
  template: `
    <section>
      <h1>Reçus fiscaux</h1>
      <p>
        La génération des reçus fiscaux Cerfa arrivera bientôt. Vous pourrez éditer et télécharger
        vos reçus ici.
      </p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceiptPageComponent {}

