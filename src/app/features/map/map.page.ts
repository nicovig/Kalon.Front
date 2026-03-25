import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'map-page',
  standalone: true,
  template: `
    <section>
      <h1>Carte des profils</h1>
      <p>
        La carte sera bientôt disponible ici.
      </p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapPageComponent {}

