import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TopbarComponent } from '../../layout/topbar/topbar.component';

@Component({
  selector: 'search-page',
  standalone: true,
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopbarComponent]
})
export class SearchPageComponent {}

