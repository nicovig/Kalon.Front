import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'statistics-page',
  standalone: true,
  template: `
    <section>
      <h1>Statistiques</h1>
      <p>
        La gestion des statistiques sera bientôt disponible ici. En attendant, vous pouvez
        consulter le tableau de bord pour un aperçu rapide.
      </p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatisticsPageComponent {}

