import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../layout/card/card.component';
import { TopbarComponent } from '../../layout/topbar/topbar.component';

@Component({
  selector: 'pricing-page',
  standalone: true,
  templateUrl: './pricing.page.html',
  styleUrls: ['./pricing.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopbarComponent, CardComponent, RouterLink]
})
export class PricingPageComponent {}
