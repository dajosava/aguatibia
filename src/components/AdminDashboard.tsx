import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Eye, Pencil, Calendar, DollarSign, User, Mail, Phone, MessageSquare, Printer } from 'lucide-react';
import RentalAgreementEditModal from './RentalAgreementEditModal';
import RentalBoardChangeHistoryList from './RentalBoardChangeHistoryList';
import { fetchRentalAgreements, updateRentalAgreementContractPaid } from '../services/rentalAgreementService';
import { fetchStoreProducts } from '../services/storeCatalogService';
import { fetchSurfboardInventory } from '../services/surfboardInventoryService';
import type { StoreProductRow } from '../types/storeProduct';
import type { RentalAgreementWithStoreItems } from '../types/rentalAgreement';
import type { SurfboardInventoryRow } from '../types/surfboardInventory';
import {
  getAdminStatusBadge,
  isPendingPickup,
  isRentalOngoing,
  isReturnInPast,
  parseDateTimeMs,
} from '../utils/rentalDisplayStatus';
import { formatSurfboardPublicLabel } from '../utils/surfboardDisplay';
import { getAgreementBoardNumbers } from '../utils/agreementBoards';
import { printRentalAgreement } from '../utils/rentalAgreementPrint';

/** Filtro del listado al pulsar las tarjetas de resumen */
type AgreementsStatsFilter = 'all' | 'ongoing' | 'overdue' | 'closed';

export default function AdminDashboard() {
  const [agreements, setAgreements] = useState<RentalAgreementWithStoreItems[]>([]);
  const [surfboards, setSurfboards] = useState<SurfboardInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreementWithStoreItems | null>(null);
  const [editingAgreement, setEditingAgreement] = useState<RentalAgreementWithStoreItems | null>(null);
  const [productCatalog, setProductCatalog] = useState<StoreProductRow[]>([]);
  const [contractPaidUpdating, setContractPaidUpdating] = useState(false);
  const [statsFilter, setStatsFilter] = useState<AgreementsStatsFilter>('all');

  const surfboardByNumber = useMemo(() => {
    const m = new Map<string, SurfboardInventoryRow>();
    for (const r of surfboards) {
      m.set(r.board_number.trim().toLowerCase(), r);
    }
    return m;
  }, [surfboards]);

  const surfboardDisplayLabel = useCallback(
    (surfboardNumber: string | null | undefined): string => {
      const raw = surfboardNumber?.trim();
      if (!raw) return '-';
      const row = surfboardByNumber.get(raw.toLowerCase());
      if (row) return formatSurfboardPublicLabel(row);
      return raw;
    },
    [surfboardByNumber]
  );

  const loadAgreements = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const [rows, inv] = await Promise.all([fetchRentalAgreements(), fetchSurfboardInventory()]);
      setAgreements(rows);
      setSurfboards(inv);
    } catch (err) {
      console.error('Error fetching agreements:', err);
      setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar los acuerdos');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Recarga datos sin cerrar el modal de edición (p. ej. tras cambio de tabla con historial). */
  const refreshAgreementsData = useCallback(async () => {
    try {
      const [rows, inv] = await Promise.all([fetchRentalAgreements(), fetchSurfboardInventory()]);
      setAgreements(rows);
      setSurfboards(inv);
      setEditingAgreement((prev) => {
        if (!prev) return null;
        return rows.find((r) => r.id === prev.id) ?? prev;
      });
      setSelectedAgreement((prev) => {
        if (!prev) return null;
        return rows.find((r) => r.id === prev.id) ?? prev;
      });
    } catch (err) {
      console.error('Error refreshing agreements:', err);
      throw err;
    }
  }, []);

  const handleContractPaidChange = async (paid: boolean) => {
    if (!selectedAgreement) return;
    setContractPaidUpdating(true);
    try {
      await updateRentalAgreementContractPaid(selectedAgreement.id, paid);
      await refreshAgreementsData();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'No se pudo actualizar el estado del pago');
    } finally {
      setContractPaidUpdating(false);
    }
  };

  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  useEffect(() => {
    fetchStoreProducts()
      .then(setProductCatalog)
      .catch(() => {
        /* catálogo opcional */
      });
  }, []);

  const filteredAgreements = agreements.filter((agreement) => {
    const q = searchTerm.toLowerCase();
    const numQuery = searchTerm.trim().replace(/^#/i, '');
    const matchesFormNumber =
      numQuery.length > 0 &&
      /^\d+$/.test(numQuery) &&
      String(agreement.agreement_number).includes(numQuery);
    const boardNums = getAgreementBoardNumbers(agreement);
    const surfboardSearch = boardNums
      .flatMap((num) => {
        const row = surfboardByNumber.get(num.toLowerCase());
        return row != null
          ? [
              formatSurfboardPublicLabel(row).toLowerCase(),
              (row.brand ?? '').toLowerCase(),
              row.board_number.toLowerCase(),
            ]
          : [num.toLowerCase()];
      })
      .join(' ');
    return (
      matchesFormNumber ||
      agreement.name.toLowerCase().includes(q) ||
      agreement.email.toLowerCase().includes(q) ||
      agreement.phone.includes(searchTerm) ||
      surfboardSearch.includes(q)
    );
  });

  const filteredByStats = useMemo(() => {
    switch (statsFilter) {
      case 'ongoing':
        return filteredAgreements.filter((a) => isRentalOngoing(a));
      case 'overdue':
        return filteredAgreements.filter((a) => isReturnInPast(a));
      case 'closed':
        return filteredAgreements.filter((a) => a.status === 'cerrado');
      default:
        return filteredAgreements;
    }
  }, [filteredAgreements, statsFilter]);

  const toggleStatsFilter = (next: AgreementsStatsFilter) => {
    setStatsFilter((prev) => (prev === next ? 'all' : next));
  };

  /**
   * 1) Pendiente de retirar
   * 2) Vencidos
   * 3) Resto (activos, etc.)
   * 4) Cerrados (check-out)
   * Dentro de cada grupo: más recientes arriba.
   */
  const displayAgreements = useMemo(() => {
    const groupRank = (a: (typeof filteredByStats)[number]) => {
      if (a.status === 'cerrado') return 3;
      if (isPendingPickup(a)) return 0;
      if (isReturnInPast(a)) return 1;
      return 2;
    };
    const sortKeyMs = (a: (typeof filteredByStats)[number]) => {
      const ret = parseDateTimeMs(a.return_time);
      if (ret !== null) return ret;
      return new Date(a.created_at).getTime();
    };
    return [...filteredByStats].sort((a, b) => {
      const ga = groupRank(a);
      const gb = groupRank(b);
      if (ga !== gb) return ga - gb;
      return sortKeyMs(b) - sortKeyMs(a);
    });
  }, [filteredByStats]);

  const statCardRing = (active: boolean) =>
    active ? 'ring-2 ring-white ring-offset-2 ring-offset-white/10 dark:ring-offset-slate-900/80 shadow-lg scale-[1.02]' : '';

  const statCardBase =
    'text-left rounded-lg shadow-md p-3 sm:p-4 transition transform cursor-pointer hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-300 dark:focus-visible:ring-cyan-600';

  const formatDateTime = (value: string | null | undefined) => {
    const ms = parseDateTimeMs(value ?? null);
    if (ms === null) return '—';
    return new Date(ms).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <div className="text-xl text-gray-600 dark:text-slate-300">Cargando acuerdos...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[50vh] bg-gray-50 dark:bg-slate-950 p-4 md:p-8 flex flex-col items-center justify-center gap-4 rounded-xl">
        <p className="text-red-700 dark:text-red-400 text-center max-w-md">{loadError}</p>
        <button
          type="button"
          onClick={() => loadAgreements()}
          className="px-4 py-2 bg-blue-950 text-white rounded-lg font-medium hover:bg-blue-900 ring-1 ring-blue-900/60 dark:ring-cyan-900/50"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const selectedDetailBoards = selectedAgreement ? getAgreementBoardNumbers(selectedAgreement) : [];

  const agreementsTableScrollClass =
    displayAgreements.length > 10
      ? 'max-h-[min(70vh,40rem)] overflow-x-auto overflow-y-auto overscroll-y-contain'
      : 'overflow-x-auto';

  return (
    <div className="text-gray-900 dark:text-slate-100 px-2 py-1 md:px-3 md:py-2">
      <div className="max-w-7xl mx-auto">
        <div className="mb-2">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 mb-0.5">
            Acuerdos de renta
          </h1>
          <p className="text-xs md:text-sm text-gray-600 dark:text-slate-400 leading-snug mt-0.5">
            Agua Tibia Surf School — listado y detalle de contratos
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/95 dark:border dark:border-slate-700 rounded-lg shadow-md dark:shadow-slate-950/80 p-3 md:p-4 mb-2 md:mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0 md:w-5 md:h-5" />
            <input
              type="text"
              placeholder="Buscar por n.º de formulario (#12), nombre, email, teléfono o tabla…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800/90 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-cyan-900/50 transition md:px-4 md:py-2"
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-2 md:mb-3">
            <button
              type="button"
              onClick={() => toggleStatsFilter('all')}
              title="Mostrar todos los acuerdos"
              className={`${statCardBase} bg-gradient-to-br from-blue-500 to-blue-600 text-white ${statCardRing(statsFilter === 'all')}`}
            >
              <div className="text-2xl font-bold tabular-nums sm:text-3xl">{agreements.length}</div>
              <div className="text-blue-100 mt-0.5 text-xs sm:text-sm">Total Acuerdos</div>
            </button>
            <button
              type="button"
              onClick={() => toggleStatsFilter('ongoing')}
              title="Filtrar solo activos en plazo"
              className={`${statCardBase} bg-gradient-to-br from-green-500 to-green-600 text-white ${statCardRing(statsFilter === 'ongoing')}`}
            >
              <div className="text-2xl font-bold tabular-nums sm:text-3xl">
                {agreements.filter((a) => isRentalOngoing(a)).length}
              </div>
              <div className="text-green-100 mt-0.5 text-xs sm:text-sm">Activos (en plazo)</div>
            </button>
            <button
              type="button"
              onClick={() => toggleStatsFilter('overdue')}
              title="Filtrar solo vencidos (fecha de retorno pasada)"
              className={`${statCardBase} bg-gradient-to-br from-red-500 to-red-600 text-white ${statCardRing(statsFilter === 'overdue')}`}
            >
              <div className="text-2xl font-bold tabular-nums sm:text-3xl">
                {agreements.filter((a) => isReturnInPast(a)).length}
              </div>
              <div className="text-red-100 mt-0.5 text-xs sm:text-sm">Vencidos</div>
            </button>
            <button
              type="button"
              onClick={() => toggleStatsFilter('closed')}
              title="Filtrar solo acuerdos cerrados (check-out completado)"
              className={`${statCardBase} bg-gradient-to-br from-purple-500 to-purple-600 text-white ${statCardRing(statsFilter === 'closed')}`}
            >
              <div className="text-3xl font-bold">
                {agreements.filter((a) => a.status === 'cerrado').length}
              </div>
              <div className="text-purple-100 mt-1">Cerrados</div>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 dark:border dark:border-slate-700 rounded-lg shadow-md overflow-hidden">
          <div className={agreementsTableScrollClass}>
            <table className="w-full min-w-[56rem]">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider w-24 sm:px-4 sm:py-2.5 sm:text-xs">
                    N.º form.
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider sm:px-6 sm:py-2.5 sm:text-xs">
                    Cliente
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider sm:px-6 sm:py-2.5 sm:text-xs">
                    Tabla
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider sm:px-6 sm:py-2.5 sm:text-xs">
                    Renta
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider sm:px-6 sm:py-2.5 sm:text-xs">
                    Precio
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider sm:px-6 sm:py-2.5 sm:text-xs">
                    Pago
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider sm:px-6 sm:py-2.5 sm:text-xs">
                    Estado
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider sm:px-6 sm:py-2.5 sm:text-xs">
                    Fecha de retorno
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider sm:px-6 sm:py-2.5 sm:text-xs">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {displayAgreements.map((agreement) => {
                  const rowBoards = getAgreementBoardNumbers(agreement);
                  return (
                  <tr key={agreement.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-3 py-2 align-top sm:px-4 sm:py-2.5">
                      <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold tabular-nums text-sm">
                        {agreement.agreement_number != null ? agreement.agreement_number : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2 sm:px-6 sm:py-2.5">
                      <div className="font-semibold text-gray-900 dark:text-slate-100">{agreement.name}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">{agreement.email}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">{agreement.phone}</div>
                    </td>
                    <td className="px-4 py-2 sm:px-6 sm:py-2.5">
                      <div className="flex flex-col gap-1">
                        {rowBoards.map((num) => (
                          <div key={num} className="text-sm font-bold text-blue-600 dark:text-cyan-400">
                            {surfboardDisplayLabel(num)}
                          </div>
                        ))}
                        {rowBoards.length === 0 && (
                          <span className="text-sm text-gray-400 dark:text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 sm:px-6 sm:py-2.5">
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {agreement.rental_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-500">{agreement.rental_duration}</div>
                    </td>
                    <td className="px-4 py-2 sm:px-6 sm:py-2.5">
                      <div className="text-lg font-bold text-green-600 dark:text-emerald-400">
                        ${Number(agreement.rental_price).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-2 sm:px-6 sm:py-2.5">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200 uppercase">
                        {agreement.payment_method}
                      </span>
                      <div className="mt-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            agreement.contract_paid === true
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                          }`}
                        >
                          {agreement.contract_paid === true ? 'Pagado' : 'Pendiente de pago'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 sm:px-6 sm:py-2.5">
                      {(() => {
                        const badge = getAdminStatusBadge(agreement);
                        return (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.colorClass}`}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-slate-400 sm:px-6 sm:py-2.5">
                      {formatDateTime(agreement.return_time)}
                    </td>
                    <td className="px-4 py-2 sm:px-6 sm:py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAgreement(agreement)}
                          className="text-blue-600 hover:text-blue-800 dark:text-cyan-400 dark:hover:text-cyan-300 transition p-1 rounded"
                          title="Ver detalle"
                          aria-label="Ver detalle del acuerdo"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAgreement(agreement)}
                          className="text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 transition p-1 rounded"
                          title="Editar acuerdo"
                          aria-label="Editar acuerdo"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {displayAgreements.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-slate-500">
              No se encontraron acuerdos de renta
            </div>
          )}
        </div>
      </div>

      {editingAgreement && (
        <RentalAgreementEditModal
          agreement={editingAgreement}
          boards={surfboards}
          productCatalog={productCatalog}
          onClose={() => setEditingAgreement(null)}
          onSaved={() => {
            setEditingAgreement(null);
            void loadAgreements();
          }}
          onRefresh={refreshAgreementsData}
        />
      )}

      {selectedAgreement && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedAgreement(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-transparent dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-950 dark:to-slate-900 p-6 text-white border-b border-blue-900/30 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-100 dark:text-slate-300 tracking-wide uppercase">
                  Formulario n.º {selectedAgreement.agreement_number}
                </p>
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight mt-1">Detalles del acuerdo</h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  printRentalAgreement(
                    selectedAgreement,
                    selectedDetailBoards.map((num) => ({
                      label: surfboardDisplayLabel(num),
                      note:
                        surfboardByNumber.get(num.trim().toLowerCase()) == null
                          ? `Nº en contrato: ${num.trim()} (no está en el inventario actual)`
                          : undefined,
                    }))
                  )
                }
                className="inline-flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 rounded-lg bg-white/95 text-blue-900 hover:bg-white font-semibold text-sm shadow-md ring-1 ring-white/40 transition dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700"
              >
                <Printer className="w-5 h-5 shrink-0" aria-hidden />
                Imprimir PDF
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-blue-600 dark:text-cyan-400 mt-1" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">Nombre</div>
                    <div className="font-semibold text-gray-900 dark:text-slate-100">{selectedAgreement.name}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-cyan-400 mt-1" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">Email</div>
                    <div className="font-semibold text-gray-900 dark:text-slate-100">{selectedAgreement.email}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-600 dark:text-cyan-400 mt-1" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">Teléfono</div>
                    <div className="font-semibold text-gray-900 dark:text-slate-100">{selectedAgreement.phone}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-cyan-400 mt-1" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">Fecha de Registro</div>
                    <div className="font-semibold text-gray-900 dark:text-slate-100">
                      {formatDateTime(selectedAgreement.created_at)}
                    </div>
                  </div>
                </div>

                {selectedAgreement.address && (
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500 dark:text-slate-500">Dirección</div>
                    <div className="font-semibold text-gray-900 dark:text-slate-100">{selectedAgreement.address}</div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <div className="text-sm text-gray-500 dark:text-slate-500 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 shrink-0 text-blue-600 dark:text-cyan-400" aria-hidden />
                    Comentarios / sugerencias del cliente
                  </div>
                  <div className="mt-2 text-sm text-gray-900 dark:text-slate-200 whitespace-pre-wrap rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50/70 dark:bg-slate-800/50 p-3 min-h-[2.5rem]">
                    {selectedAgreement.customer_notes?.trim()
                      ? selectedAgreement.customer_notes
                      : 'Sin comentarios'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 dark:text-slate-500">Pickup</div>
                  <div className="font-semibold text-gray-900 dark:text-slate-100">
                    {selectedAgreement.pickup || 'No especificado'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 dark:text-slate-500">Return</div>
                  <div className="font-semibold text-gray-900 dark:text-slate-100">
                    {selectedAgreement.return_time || 'No especificado'}
                  </div>
                </div>

                {selectedDetailBoards.length > 0 && (
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500 dark:text-slate-500">
                      Tabla{selectedDetailBoards.length > 1 ? 's' : ''}
                    </div>
                    <ul className="mt-1 space-y-2">
                      {selectedDetailBoards.map((num) => (
                        <li key={num}>
                          <div className="font-semibold text-blue-600 dark:text-cyan-400 text-lg">
                            {surfboardDisplayLabel(num)}
                          </div>
                          {surfboardByNumber.get(num.trim().toLowerCase()) == null && (
                            <div className="text-xs text-amber-600 dark:text-amber-400/90 mt-0.5">
                              Nº en contrato: {num.trim()} (no está en el inventario actual)
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedAgreement.board_checked_by && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">Board Checked By</div>
                    <div className="font-semibold text-gray-900 dark:text-slate-100">
                      {selectedAgreement.board_checked_by}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-gray-200 dark:border-slate-700 pt-6 space-y-6">
                <RentalBoardChangeHistoryList
                  agreementId={selectedAgreement.id}
                  boards={surfboards}
                  refreshKey={selectedDetailBoards.join('|')}
                  showEmptyHint
                />
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-emerald-400 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-slate-500">Tipo de Renta</div>
                      <div className="font-semibold text-gray-900 dark:text-slate-100">
                        {selectedAgreement.rental_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-500">{selectedAgreement.rental_duration}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">Precio Total</div>
                    {(() => {
                      const d = Number(selectedAgreement.rental_discount_percent ?? 0);
                      const showDisc = [5, 10, 15, 20].includes(d);
                      return (
                        <>
                          {showDisc && (
                            <div className="text-sm font-medium text-amber-700 dark:text-amber-400/90 mt-0.5">
                              Descuento sobre renta de tablas: {d}%
                            </div>
                          )}
                          <div className="text-3xl font-bold text-green-600 dark:text-emerald-400">
                            ${Number(selectedAgreement.rental_price).toFixed(2)}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                            Total con renta (tras descuento si aplica) y productos de tienda.
                          </p>
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">Método de Pago</div>
                    <div className="font-semibold text-gray-900 dark:text-slate-100 uppercase">
                      {selectedAgreement.payment_method}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-slate-500 mt-3">Estado del pago</div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                        selectedAgreement.contract_paid === true
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                      }`}
                    >
                      {selectedAgreement.contract_paid === true ? 'Pagado' : 'Pendiente de pago'}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                      El cobro del contrato se registra solo aquí (no desde el formulario público).
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedAgreement.contract_paid !== true && (
                        <button
                          type="button"
                          disabled={contractPaidUpdating}
                          onClick={() => void handleContractPaidChange(true)}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                        >
                          {contractPaidUpdating ? 'Guardando…' : 'Registrar pago'}
                        </button>
                      )}
                      {selectedAgreement.contract_paid === true && (
                        <button
                          type="button"
                          disabled={contractPaidUpdating}
                          onClick={() => void handleContractPaidChange(false)}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-50"
                        >
                          {contractPaidUpdating ? 'Guardando…' : 'Marcar pago pendiente'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">Estado</div>
                    {(() => {
                      const badge = getAdminStatusBadge(selectedAgreement);
                      return (
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.colorClass}`}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {(() => {
                const lines = [...(selectedAgreement.rental_agreement_store_items ?? [])].sort(
                  (a, b) => a.sort_order - b.sort_order
                );
                if (lines.length === 0) return null;
                return (
                  <div className="border-t-2 border-gray-200 dark:border-slate-700 pt-6">
                    <div className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Store items</div>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-600">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800/80">
                          <tr>
                            <th className="text-left px-3 py-2 text-gray-600 dark:text-slate-400">Producto</th>
                            <th className="text-right px-3 py-2 text-gray-600 dark:text-slate-400">Precio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                          {lines.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2 text-gray-900 dark:text-slate-100">{item.product_name}</td>
                              <td className="px-3 py-2 text-right font-medium text-green-600 dark:text-emerald-400">
                                ${Number(item.unit_price).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                      El precio total del contrato incluye renta y estos productos.
                    </p>
                  </div>
                );
              })()}

              {selectedAgreement.signature_data && (
                <div className="border-t-2 border-gray-200 dark:border-slate-700 pt-6">
                  <div className="text-sm text-gray-500 dark:text-slate-500 mb-3">Firma Digital</div>
                  <img
                    src={selectedAgreement.signature_data}
                    alt="Firma"
                    className="border-2 border-gray-300 dark:border-slate-600 rounded-lg max-w-md bg-white"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedAgreement(null)}
                className="w-full bg-blue-950 hover:bg-[#0c1d3a] text-white py-3 rounded-lg font-semibold ring-1 ring-blue-900/60 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
