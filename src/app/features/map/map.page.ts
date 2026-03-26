import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ContactStoreService } from '../contact/contact.store';
import { contactDisplayName, IContact } from '../../core/models/contact.model';
import { TopbarComponent } from '../../layout/topbar/topbar.component';
import { CardComponent } from '../../layout/card/card.component';
import { ContactEditPopupComponent } from '../contact/popup/edit-contact/edit-contact-popup.component';
import { EmptyContactsWelcomeComponent } from '../contact/empty-contacts-welcome/empty-contacts-welcome.component';
import franceDepartmentsSvg from '@svg-maps/france.departments';
import worldMapSvg from '@svg-maps/world';

type SvgLocation = { name: string; id: string; path: string };
type SvgMap = { viewBox: string; locations: SvgLocation[]; label?: string };

type MetroSelection = { kind: 'metro'; departmentId: string };
type NonMetroSelection = { kind: 'non_metro' };
type Selection = MetroSelection | NonMetroSelection;

type ContactGeo =
  | { kind: 'metro'; departmentId: string }
  | { kind: 'domtom'; departmentId: string }
  | { kind: 'hors_france' }
  | { kind: 'unreliable_address' };

type DeptTooltip = { label: string; x: number; y: number };

@Component({
  selector: 'map-page',
  standalone: true,
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TopbarComponent, CardComponent, ContactEditPopupComponent, EmptyContactsWelcomeComponent]
})
export class MapPageComponent {
  private readonly contactStore = inject(ContactStoreService);

  protected readonly selection = signal<Selection>({ kind: 'non_metro' });

  protected readonly contactToEdit = signal<IContact | null>(null);

  protected readonly deptTooltip = signal<DeptTooltip | null>(null);

  protected readonly france = franceDepartmentsSvg as unknown as SvgMap;
  protected readonly world = worldMapSvg as unknown as SvgMap;

  protected readonly franceLocationById = computed(() => {
    const m = new Map<string, SvgLocation>();
    for (const loc of this.france.locations) {
      m.set(loc.id, loc);
    }
    return m;
  });

  protected readonly contactGeoById = computed(() => {
    const map = new Map<string, ContactGeo>();
    for (const c of this.contactStore.contacts()) {
      map.set(c.id, this.geoOfContact(c));
    }
    return map;
  });

  protected readonly metroDeptToContacts = computed(() => {
    const map = new Map<string, IContact[]>();
    const add = (k: string, c: IContact) => {
      const list = map.get(k);
      if (list) list.push(c);
      else map.set(k, [c]);
    };

    for (const c of this.contactStore.contacts()) {
      const geo = this.contactGeoById().get(c.id);
      if (!geo || geo.kind !== 'metro') continue;
      add(geo.departmentId, c);
    }

    return map;
  });

  protected readonly metroDeptCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const loc of this.france.locations) {
      counts.set(loc.id, this.metroDeptToContacts().get(loc.id)?.length ?? 0);
    }
    return counts;
  });

  protected readonly totalMetroContactsCount = computed(() => {
    let sum = 0;
    for (const contacts of this.metroDeptToContacts().values()) {
      sum += contacts.length;
    }
    return sum;
  });

  protected readonly domTomContactsByCode = computed(() => {
    const map = new Map<string, IContact[]>();
    const add = (k: string, c: IContact) => {
      const list = map.get(k);
      if (list) list.push(c);
      else map.set(k, [c]);
    };

    for (const c of this.contactStore.contacts()) {
      const geo = this.contactGeoById().get(c.id);
      if (!geo || geo.kind !== 'domtom') continue;
      add(geo.departmentId, c);
    }

    return map;
  });

  protected readonly domTomTotalContactsCount = computed(() => {
    let sum = 0;
    for (const contacts of this.domTomContactsByCode().values()) {
      sum += contacts.length;
    }
    return sum;
  });

  protected readonly domTomDepartmentsWithContacts = computed(() => {
    const rows = Array.from(this.domTomContactsByCode().entries()).map(([id, contacts]) => ({
      id,
      count: contacts.length
    }));
    rows.sort((a, b) => b.count - a.count);
    return rows;
  });

  protected readonly unreliableAddressContacts = computed(() => {
    return this.contactStore.contacts().filter((c) => this.contactGeoById().get(c.id)?.kind === 'unreliable_address');
  });

  protected readonly horsFranceContacts = computed(() => {
    return this.contactStore.contacts().filter((c) => this.contactGeoById().get(c.id)?.kind === 'hors_france');
  });

  protected readonly metroContactsPreview = computed(() => {
    const sel = this.selection();
    if (sel.kind !== 'metro') return [];
    const list = this.metroDeptToContacts().get(sel.departmentId) ?? [];
    return list;
  });

  protected readonly selectionDeptLabel = computed(() => {
    const sel = this.selection();
    if (sel.kind !== 'metro') return null;
    return this.franceLocationById().get(sel.departmentId)?.name ?? null;
  });

  protected readonly totalContacts = computed(() => this.contactStore.contacts().length);

  protected onSelectMetroDepartment(departmentId: string): void {
    this.selection.set({ kind: 'metro', departmentId });
  }

  protected onSelectNonMetro(): void {
    this.selection.set({ kind: 'non_metro' });
  }

  protected openEditContact(contact: IContact): void {
    this.contactToEdit.set(contact);
  }

  protected closeEditContact(): void {
    this.contactToEdit.set(null);
  }

  protected onDeptMouseEnter(event: MouseEvent, departmentId: string, departmentName: string): void {
    const count = this.metroDeptCounts().get(departmentId) ?? 0;
    this.deptTooltip.set({
      label: `${departmentName} : ${count} profil(s)`,
      x: event.clientX,
      y: event.clientY
    });
  }

  protected onDeptMouseMove(event: MouseEvent): void {
    const current = this.deptTooltip();
    if (!current) return;
    this.deptTooltip.set({ ...current, x: event.clientX, y: event.clientY });
  }

  protected onDeptMouseLeave(): void {
    this.deptTooltip.set(null);
  }

  protected metroFill(departmentId: string): string {
    const sel = this.selection();
    if (sel.kind === 'metro' && sel.departmentId === departmentId) return 'var(--pink)';
    const count = this.metroDeptCounts().get(departmentId) ?? 0;
    if (count <= 0) return 'var(--ink-10)';

    const total = this.totalContacts();
    const ratio = total > 0 ? count / total : 0;

    if (ratio <= 0.2) return 'var(--violet-lt)';
    if (ratio <= 0.4) return 'color-mix(in srgb, var(--violet-lt) 60%, var(--violet-md) 40%)';
    if (ratio <= 0.6) return 'color-mix(in srgb, var(--violet-lt) 25%, var(--violet-md) 75%)';
    if (ratio <= 0.8) return 'color-mix(in srgb, var(--violet-md) 70%, var(--violet) 30%)';
    return 'var(--violet)';
  }

  protected metroStroke(departmentId: string): string {
    const sel = this.selection();
    if (sel.kind === 'metro' && sel.departmentId === departmentId) return 'var(--pink-dk)';
    return 'var(--ink-20)';
  }

  private geoOfContact(c: IContact): ContactGeo {
    const country = c.address?.country?.trim().toLowerCase();
    if (!country || country !== 'france') {
      return { kind: 'hors_france' };
    }

    const postalRaw = c.address?.postalCode?.trim();
    const street = c.address?.street?.trim() ?? '';
    const city = c.address?.city?.trim() ?? '';

    if (!postalRaw) return { kind: 'unreliable_address' };

    const hasQuestion = postalRaw.includes('?') || street.includes('?') || city.includes('?');
    const postalDigits = postalRaw.replace(/\D/g, '');
    const digitsLen = postalDigits.length;
    if (hasQuestion) return { kind: 'unreliable_address' };

    if (digitsLen < 2) return { kind: 'unreliable_address' };

    if (postalDigits.startsWith('97') || postalDigits.startsWith('98')) {
      if (postalDigits.length >= 3) return { kind: 'domtom', departmentId: postalDigits.slice(0, 3) };
      return { kind: 'unreliable_address' };
    }

    if (postalDigits.startsWith('20') && postalDigits.length >= 3) {
      const third = postalDigits[2] ?? '';
      return { kind: 'metro', departmentId: third === '0' || third === '1' ? '2A' : '2B' };
    }

    if (postalDigits.length >= 2) {
      const d2 = postalDigits.slice(0, 2);
      if (d2 !== '20' && /^\d{2}$/.test(d2)) return { kind: 'metro', departmentId: d2 };
    }

    return { kind: 'unreliable_address' };
  }

  protected contactLabel(c: IContact): string {
    return contactDisplayName(c);
  }

  private legendBandLabel(startInclusive: number, endInclusive: number, total: number): string {
    if (total === 0) return '0 profil(s)';
    if (startInclusive > endInclusive) return 'Aucun profil';
    if (startInclusive === endInclusive) return `${startInclusive} profil(s)`;
    return `${startInclusive}-${endInclusive} profil(s)`;
  }

  protected readonly legendBandLabels = computed(() => {
    const total = this.totalContacts();
    const t20 = Math.floor(total * 0.2);
    const t40 = Math.floor(total * 0.4);
    const t60 = Math.floor(total * 0.6);
    const t80 = Math.floor(total * 0.8);

    const b0 = this.legendBandLabel(0, t20, total);
    const b1 = this.legendBandLabel(t20 + 1, t40, total);
    const b2 = this.legendBandLabel(t40 + 1, t60, total);
    const b3 = this.legendBandLabel(t60 + 1, t80, total);
    const b4 = this.legendBandLabel(t80 + 1, total, total);

    return [b0, b1, b2, b3, b4];
  });

  protected max(a: number, b: number): number {
    return Math.max(a, b);
  }
}

