import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'kalon-donor-list-page',
  standalone: true,
  template: `
    <section>
      <h1>Donateurs</h1>
      <p>
        La gestion détaillée des donateurs sera bientôt disponible ici. En attendant, vous pouvez
        consulter le tableau de bord pour un aperçu rapide.
      </p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonorListPageComponent {}

