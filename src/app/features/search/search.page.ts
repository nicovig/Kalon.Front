import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'search-page',
  standalone: true,
  template: `
    <section>
      <h1>Recherche intelligente</h1>
      <p>
        La recherche intelligente sera bientôt disponible ici.
      </p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchPageComponent {}

