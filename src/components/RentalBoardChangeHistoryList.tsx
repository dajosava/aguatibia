import { useEffect, useState } from 'react';
import { fetchBoardChangeHistory } from '../services/rentalAgreementService';
import type { RentalBoardChangeHistoryRow } from '../types/rentalAgreement';
import type { SurfboardInventoryRow } from '../types/surfboardInventory';
import { formatSurfboardPublicLabel } from '../utils/surfboardDisplay';

function publicBoardLabel(boards: SurfboardInventoryRow[], boardNumber: string): string {
  const num = boardNumber.trim();
  if (!num) return '—';
  const row = boards.find((b) => b.board_number.trim() === num);
  if (row) return formatSurfboardPublicLabel(row);
  return num;
}

function formatHistoryWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type Props = {
  agreementId: string;
  boards: SurfboardInventoryRow[];
  /** Cambia tras un swap u otra actualización del acuerdo para volver a cargar. */
  refreshKey?: string | null;
  className?: string;
  /** Borde superior / padding del bloque (edición vs vista). */
  innerClassName?: string;
  /** Si no hay filas, muestra un mensaje en lugar de ocultar el bloque. */
  showEmptyHint?: boolean;
};

export default function RentalBoardChangeHistoryList({
  agreementId,
  boards,
  refreshKey,
  className = '',
  innerClassName = '',
  showEmptyHint = false,
}: Props) {
  const [rows, setRows] = useState<RentalBoardChangeHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBoardChangeHistory(agreementId)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agreementId, refreshKey]);

  if (!loading && rows.length === 0 && !showEmptyHint) {
    return null;
  }

  return (
    <div className={className}>
      <div className={innerClassName}>
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-2">Historial de cambios de tabla</p>
        {loading && <p className="text-sm text-gray-500 dark:text-slate-500">Cargando historial…</p>}
        {!loading && rows.length === 0 && showEmptyHint && (
          <p className="text-sm text-gray-500 dark:text-slate-500">No hay cambios de tabla registrados.</p>
        )}
        {!loading && rows.length > 0 && (
          <ul className="space-y-2 text-sm text-gray-700 dark:text-slate-300">
            {rows.map((h) => (
              <li key={h.id} className="pl-3 border-l-2 border-blue-400 dark:border-cyan-600 py-0.5">
                <span className="text-gray-500 dark:text-slate-500">{formatHistoryWhen(h.created_at)}</span>
                {' — '}
                <span className="font-medium">
                  {publicBoardLabel(boards, h.previous_board_number)} →{' '}
                  {publicBoardLabel(boards, h.new_board_number)}
                </span>
                <span className="text-gray-500 dark:text-slate-500 text-xs ml-1">
                  ({h.previous_board_number || '—'} → {h.new_board_number})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
