import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export type ReminderTemplateTone = 'douce' | 'fidelisation' | 'remerciement' | 'urgence' | 'saisonnier';

export interface ReminderTemplateRequest {
  tone: ReminderTemplateTone;
}

export interface ReminderTemplateResponse {
  subject: string;
  body: string;
}

@Injectable({
  providedIn: 'root'
})
export class IaAgentCore {
  private readonly templates: Record<ReminderTemplateTone, ReminderTemplateResponse> = {
    douce: {
      subject: 'Vous nous manquez, {{prenom}} 💛',
      body: `<p>Bonjour {{prenom}},</p>
<p>J'espère que vous allez bien. Voilà {{mois_depuis_don}} mois que nous n'avons pas eu de vos nouvelles, et je voulais prendre le temps de vous écrire personnellement.</p>
<p>Votre soutien passé de {{dernier_don_montant}} € a eu un impact réel sur notre association. Grâce à des personnes comme vous, nous avons pu continuer à agir concrètement.</p>
<p>Si votre situation vous le permet, un nouveau geste de votre part nous toucherait profondément.</p>
<p>Avec toute notre gratitude,<br/>L'équipe de {{nom_association}}</p>`
    },
    fidelisation: {
      subject: 'Merci pour votre fidélité, {{prenom}} ✨',
      body: `<p>Bonjour {{prenom}},</p>
<p>Vous faites partie de nos profils les plus fidèles, et nous tenions à vous le dire.</p>
<p>Au fil des années, vous avez contribué à hauteur de {{total_dons}} € à notre cause. Cet engagement nous aide chaque jour.</p>
<p>Si vous le souhaitez, vous pouvez renouveler votre soutien pour cette nouvelle période.</p>
<p>Merci, du fond du cœur.<br/>L'équipe de {{nom_association}}</p>`
    },
    remerciement: {
      subject: 'Merci pour votre soutien, {{prenom}} 🙏',
      body: `<p>Bonjour {{prenom}},</p>
<p>Un grand merci pour votre dernier don de {{dernier_don_montant}} €.</p>
<p>Votre geste nous permet de continuer nos actions au service des familles accompagnées.</p>
<p>Nous sommes heureux de vous compter parmi nos soutiens.</p>
<p>Avec reconnaissance,<br/>L'équipe de {{nom_association}}</p>`
    },
    urgence: {
      subject: 'Votre aide est precieuse aujourd hui, {{prenom}}',
      body: `<p>Bonjour {{prenom}},</p>
<p>Nous traversons une periode importante et nous avons besoin de soutien rapidement.</p>
<p>Votre dernier geste nous a beaucoup aides, et un nouveau don ferait une vraie difference maintenant.</p>
<p>Si vous le pouvez, meme un petit montant nous aide.</p>
<p>Merci pour votre presence a nos cotes.<br/>L'équipe de {{nom_association}}</p>`
    },
    saisonnier: {
      subject: 'En cette periode, pensons ensemble a notre cause 🎄',
      body: `<p>Bonjour {{prenom}},</p>
<p>La fin d'annee est un moment fort pour notre association et pour les personnes que nous accompagnons.</p>
<p>Votre soutien peut nous aider a lancer nos actions des prochaines semaines.</p>
<p>Si vous le souhaitez, vous pouvez faire un nouveau don en quelques secondes.</p>
<p>Merci pour votre confiance.<br/>L'équipe de {{nom_association}}</p>`
    }
  };

  generateReminderTemplate(request: ReminderTemplateRequest): Observable<ReminderTemplateResponse> {
    const response = this.templates[request.tone] ?? this.templates.douce;
    return of(response).pipe(delay(1800));
  }
}
