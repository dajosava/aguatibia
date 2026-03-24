import type { RentalAgreementWithStoreItems } from '../types/rentalAgreement';

/** Números de tabla asignados al acuerdo (orden: sort_order). Fallback: columna legacy `surfboard_number`. */
export function getAgreementBoardNumbers(agreement: RentalAgreementWithStoreItems): string[] {
  const lines = agreement.rental_agreement_surfboards;
  if (lines && lines.length > 0) {
    return [...lines]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((l) => l.board_number.trim())
      .filter((n) => n.length > 0);
  }
  const n = agreement.surfboard_number?.trim();
  return n ? [n] : [];
}
