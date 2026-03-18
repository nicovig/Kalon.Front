import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'kalon-import-placeholder-page',
  standalone: true,
  template: `
    <section>
      <h1>Import Excel</h1>
      <p>
        L’import des donateurs depuis Excel sera bientôt disponible. Vous pourrez déposer votre
        fichier et vérifier les correspondances de colonnes.
      </p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportPlaceholderPageComponent {}

