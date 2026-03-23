import { NewDonorInput } from '../../donor/donor.store';
import { ImportFieldKey } from './model/import-field.model';
import { collectImportFieldBag } from './import-map-preview';

export function mapRowToNewDonorInput(
  row: string[],
  bindings: ImportFieldKey[],
  overrides?: Partial<Record<ImportFieldKey, string>>
): NewDonorInput | null {
  const bag = collectImportFieldBag(row, bindings);
  if (overrides) {
    for (const [k, v] of Object.entries(overrides) as [ImportFieldKey, string][]) {
      bag[k] = v;
    }
  }
  const email = (bag.email ?? '').trim();
  const firstname = (bag.firstname ?? '').trim();
  const lastname = (bag.lastname ?? '').trim();

  const enterpriseName = (bag.enterpriseName ?? '').trim();
  const siret = (bag.siret ?? '').trim();
  const contactFirstname = (bag.contactFirstname ?? '').trim();
  const contactLastname = (bag.contactLastname ?? '').trim();

  if (!email) {
    return null;
  }

  const intendedKind = enterpriseName || siret ? 'company' : 'individual';

  let street = (bag.street ?? '').trim();
  if (bag.addressLine?.trim() && !street) {
    street = bag.addressLine.trim();
  }
  const postalCode = (bag.postalCode ?? '').trim() || '—';
  const city = (bag.city ?? '').trim() || '—';
  const country = (bag.country ?? '').trim() || 'France';
  if (!street) {
    street = '—';
  }

  if (intendedKind === 'company') {
    if (!enterpriseName) {
      return null;
    }
    if (!siret) {
      return null;
    }
    if (!contactFirstname && !contactLastname) {
      return null;
    }

    return {
      kind: 'company',
      email,
      phone: (bag.phone ?? '').trim() || undefined,
      enterprise: {
        name: enterpriseName,
        siret,
        fiscalStatus: 'general_interest_66',
        address: {
          street,
          postalCode,
          city,
          country,
          phone: (bag.phone ?? '').trim() || undefined
        },
        contactFirstname: contactFirstname || undefined,
        contactLastname: contactLastname || undefined
      }
    };
  }

  if (!firstname && !lastname) {
    return null;
  }

  return {
    kind: 'individual',
    firstname: firstname || '—',
    lastname: lastname || '—',
    email,
    phone: (bag.phone ?? '').trim() || undefined,
    address: {
      street,
      postalCode,
      city,
      country
    }
  };
}
