import { NewDonorInputIndividual } from '../../donor/donor.store';
import { ImportFieldKey } from './import-field.model';
import { collectImportFieldBag } from './import-map-preview';

export function mapRowToNewDonorInput(
  row: string[],
  bindings: ImportFieldKey[]
): NewDonorInputIndividual | null {
  const bag = collectImportFieldBag(row, bindings);
  const email = (bag.email ?? '').trim();
  const firstname = (bag.firstname ?? '').trim();
  const lastname = (bag.lastname ?? '').trim();
  if (!email) {
    return null;
  }
  if (!firstname && !lastname) {
    return null;
  }

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
