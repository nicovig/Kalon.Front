import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'kalon-reminder-placeholder-page',
  standalone: true,
  template: `
    <section>
      <h1>Relances</h1>
      <p>
        La page de gestion des relances sera bientôt disponible. Vous pourrez préparer et envoyer
        vos emails de relance en quelques clics.
      </p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReminderPlaceholderPageComponent {}

