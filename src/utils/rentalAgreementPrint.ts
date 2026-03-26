import type { RentalAgreementWithStoreItems } from '../types/rentalAgreement';
import { getAdminStatusBadge, parseDateTimeMs } from './rentalDisplayStatus';

function formatDateTimeEs(value: string | null | undefined): string {
  const ms = parseDateTimeMs(value ?? null);
  if (ms === null) return '—';
  return new Date(ms).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type AgreementPrintBoardLine = {
  label: string;
  note?: string;
};

function buildDocumentHtml(
  agreement: RentalAgreementWithStoreItems,
  boardLines: AgreementPrintBoardLine[],
  assetOrigin: string
): string {
  const num = agreement.agreement_number != null ? String(agreement.agreement_number) : '—';
  const statusLabel = getAdminStatusBadge(agreement).label;
  const storeLines = [...(agreement.rental_agreement_store_items ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const storeRows =
    storeLines.length === 0
      ? '<tr><td colspan="2">Sin productos de tienda</td></tr>'
      : storeLines
          .map(
            (item) =>
              `<tr><td>${escapeHtml(item.product_name)}</td><td class="right">$${Number(item.unit_price).toFixed(2)}</td></tr>`
          )
          .join('');

  const boardsBlock =
    boardLines.length === 0
      ? '<p>—</p>'
      : `<ul>${boardLines
          .map(
            (b) =>
              `<li><strong>${escapeHtml(b.label)}</strong>${b.note ? `<br><span class="muted">${escapeHtml(b.note)}</span>` : ''}</li>`
          )
          .join('')}</ul>`;

  const signatureBlock = agreement.signature_data
    ? `<div class="sig"><p class="label">Firma digital</p><img src="${agreement.signature_data.replace(/"/g, '&quot;')}" alt="Firma" /></div>`
    : '<p class="muted">Sin firma registrada.</p>';

  const addressRow = agreement.address?.trim()
    ? `<div class="row" style="grid-column:1/-1"><span class="label">Dirección</span><span>${escapeHtml(agreement.address)}</span></div>`
    : '';

  const notesBlock = agreement.customer_notes?.trim()
    ? `<div class="block"><span class="label">Comentarios / sugerencias del cliente</span><p class="pre">${escapeHtml(agreement.customer_notes)}</p></div>`
    : '';

  const checkedByRow = agreement.board_checked_by?.trim()
    ? `<div class="row" style="grid-column:1/-1"><span class="label">Tabla revisada por</span><span>${escapeHtml(agreement.board_checked_by)}</span></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Acuerdo de renta n.º ${escapeHtml(num)} — Agua Tibia</title>
  <style>
    @page { margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #111; font-size: 10.5pt; line-height: 1.45; margin: 0; padding: 0; }
    header { border-bottom: 2px solid #0d47a1; padding-bottom: 10px; margin-bottom: 14px; }
    header h1 { margin: 0; font-size: 16pt; color: #0d47a1; }
    header .sub { margin: 4px 0 0; font-size: 11pt; color: #444; }
    .logo { max-height: 40px; margin-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-bottom: 14px; }
    .row { display: flex; flex-direction: column; gap: 2px; }
    .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.04em; color: #555; font-weight: 600; }
    .block { margin: 12px 0; }
    .pre { white-space: pre-wrap; margin: 4px 0 0; padding: 8px; background: #f5f7fa; border: 1px solid #dde3ea; border-radius: 4px; font-size: 9.5pt; }
    h2 { font-size: 11pt; color: #0d47a1; margin: 16px 0 8px; border-bottom: 1px solid #dde3ea; padding-bottom: 4px; }
    ul { margin: 6px 0 0; padding-left: 18px; }
    table.store { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5pt; }
    table.store th, table.store td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    table.store th { background: #e8eef5; }
    table.store .right { text-align: right; }
    .totals { margin-top: 10px; font-size: 12pt; font-weight: 700; color: #0d47a1; }
    .sig img { max-width: 280px; max-height: 120px; border: 1px solid #ccc; margin-top: 6px; background: #fff; }
    .muted { color: #666; font-size: 9pt; }
    footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #dde3ea; font-size: 8pt; color: #777; }
  </style>
</head>
<body>
  <header>
    <img class="logo" src="${escapeHtml(assetOrigin)}/agtlogo.png" alt="Agua Tibia Surf School" />
    <h1>Acuerdo de alquiler de tabla</h1>
    <p class="sub"><strong>Formulario n.º ${escapeHtml(num)}</strong> · Generado el ${formatDateTimeEs(new Date().toISOString())}</p>
  </header>

  <h2>Cliente</h2>
  <div class="grid">
    <div class="row"><span class="label">Nombre</span><span>${escapeHtml(agreement.name)}</span></div>
    <div class="row"><span class="label">Email</span><span>${escapeHtml(agreement.email)}</span></div>
    <div class="row"><span class="label">Teléfono</span><span>${escapeHtml(agreement.phone)}</span></div>
    <div class="row"><span class="label">Registrado</span><span>${formatDateTimeEs(agreement.created_at)}</span></div>
    ${addressRow}
  </div>
  ${notesBlock}

  <h2>Renta</h2>
  <div class="grid">
    <div class="row"><span class="label">Retiro (pickup)</span><span>${escapeHtml(agreement.pickup?.trim() || 'No especificado')}</span></div>
    <div class="row"><span class="label">Devolución</span><span>${escapeHtml(agreement.return_time?.trim() || 'No especificado')}</span></div>
    <div class="row" style="grid-column:1/-1"><span class="label">Tablas</span>${boardsBlock}</div>
    ${checkedByRow}
    <div class="row"><span class="label">Tipo de renta</span><span>${escapeHtml(agreement.rental_type.replace(/_/g, ' '))}</span></div>
    <div class="row"><span class="label">Duración</span><span>${escapeHtml(agreement.rental_duration)}</span></div>
    <div class="row"><span class="label">Método de pago</span><span>${escapeHtml(agreement.payment_method.toUpperCase())}</span></div>
    <div class="row"><span class="label">Estado del pago</span><span>${agreement.contract_paid === true ? 'Pagado' : 'Pendiente de pago'}</span></div>
    <div class="row"><span class="label">Estado del acuerdo</span><span>${escapeHtml(statusLabel)}</span></div>
    <div class="row"><span class="label">Aceptó términos</span><span>${agreement.agreed_to_terms ? 'Sí' : 'No'}</span></div>
  </div>
  <p class="totals">Precio total del contrato: $${Number(agreement.rental_price).toFixed(2)} USD</p>

  <h2>Productos de tienda</h2>
  <table class="store">
    <thead><tr><th>Producto</th><th class="right">Precio unit.</th></tr></thead>
    <tbody>${storeRows}</tbody>
  </table>

  <h2>Firma</h2>
  ${signatureBlock}

  <footer>Agua Tibia Surf School — Documento generado desde el panel administrativo.</footer>
</body>
</html>`;
}

/**
 * Abre el diálogo de impresión del navegador con el acuerdo; el usuario puede elegir «Guardar como PDF».
 */
export function printRentalAgreement(
  agreement: RentalAgreementWithStoreItems,
  boardLines: AgreementPrintBoardLine[]
): void {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const html = buildDocumentHtml(agreement, boardLines, origin);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute(
    'style',
    'position:fixed;width:0;height:0;border:none;visibility:hidden;bottom:0;right:0'
  );
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    iframe.remove();
  };

  win.addEventListener(
    'afterprint',
    () => {
      cleanup();
    },
    { once: true }
  );

  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(cleanup, 2000);
    }
  }, 400);
}
