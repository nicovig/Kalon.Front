import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'account-page',
  standalone: true,
  template: `
    <section>
      <h1>Paramètres</h1>
      <p>
        La gestion des paramètres sera bientôt disponible ici. En attendant, vous pouvez
        consulter le tableau de bord pour un aperçu rapide.
      </p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountPageComponent {}

