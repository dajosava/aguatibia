import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, Calendar, DollarSign, User, Mail, Phone, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchRentalAgreements } from '../services/rentalAgreementService';
import type { RentalAgreementRow } from '../types/rentalAgreement';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [agreements, setAgreements] = useState<RentalAgreementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreementRow | null>(null);

  const loadAgreements = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const rows = await fetchRentalAgreements();
      setAgreements(rows);
    } catch (err) {
      console.error('Error fetching agreements:', err);
      setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar los acuerdos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  const filteredAgreements = agreements.filter(
    (agreement) =>
      agreement.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.phone.includes(searchTerm) ||
      (agreement.surfboard_number && agreement.surfboard_number.includes(searchTerm))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200';
    }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">Panel de Administración</h1>
            <p className="text-gray-600 dark:text-slate-400">Agua Tibia Surf School - Acuerdos de Renta</p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium shadow-sm dark:shadow-none"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900/95 dark:border dark:border-slate-700 rounded-xl shadow-lg dark:shadow-slate-950/80 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Search className="w-5 h-5 text-gray-400 dark:text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800/90 text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-500 focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-cyan-900/50 transition"
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-md">
              <div className="text-3xl font-bold">{agreements.length}</div>
              <div className="text-blue-100 mt-1">Total Acuerdos</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-md">
              <div className="text-3xl font-bold">
                {agreements.filter((a) => a.status === 'active').length}
              </div>
              <div className="text-green-100 mt-1">Activos</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-xl shadow-md">
              <div className="text-3xl font-bold">
                {agreements.filter((a) => a.status === 'pending').length}
              </div>
              <div className="text-yellow-100 mt-1">Pendientes</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-md">
              <div className="text-3xl font-bold">
                ${agreements.reduce((sum, a) => sum + Number(a.rental_price), 0).toFixed(2)}
              </div>
              <div className="text-purple-100 mt-1">Ingresos Totales</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 dark:border dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800/80 border-b-2 border-gray-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                    Tabla #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                    Renta
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                    Pago
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredAgreements.map((agreement) => (
                  <tr key={agreement.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-slate-100">{agreement.name}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">{agreement.email}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">{agreement.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-blue-600 dark:text-cyan-400">
                        {agreement.surfboard_number || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {agreement.rental_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-500">{agreement.rental_duration}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-lg font-bold text-green-600 dark:text-emerald-400">
                        ${Number(agreement.rental_price).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200 uppercase">
                        {agreement.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          agreement.status
                        )}`}
                      >
                        {agreement.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                      {formatDate(agreement.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedAgreement(agreement)}
                        className="text-blue-600 hover:text-blue-800 dark:text-cyan-400 dark:hover:text-cyan-300 transition"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAgreements.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-slate-500">
              No se encontraron acuerdos de renta
            </div>
          )}
        </div>
      </div>

      {selectedAgreement && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-slate-950/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedAgreement(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-transparent dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-950 dark:to-slate-900 p-6 text-white border-b border-blue-900/30">
              <h2 className="text-2xl font-bold">Detalles del Acuerdo</h2>
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
                      {formatDate(selectedAgreement.created_at)}
                    </div>
                  </div>
                </div>

                {selectedAgreement.address && (
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500 dark:text-slate-500">Dirección</div>
                    <div className="font-semibold text-gray-900 dark:text-slate-100">{selectedAgreement.address}</div>
                  </div>
                )}

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

                {selectedAgreement.surfboard_number && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">Número de Tabla</div>
                    <div className="font-semibold text-blue-600 dark:text-cyan-400 text-lg">
                      {selectedAgreement.surfboard_number}
                    </div>
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

              <div className="border-t-2 border-gray-200 dark:border-slate-700 pt-6">
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
                    <div className="text-3xl font-bold text-green-600 dark:text-emerald-400">
                      ${Number(selectedAgreement.rental_price).toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">Método de Pago</div>
                    <div className="font-semibold text-gray-900 dark:text-slate-100 uppercase">
                      {selectedAgreement.payment_method}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">Estado</div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        selectedAgreement.status
                      )}`}
                    >
                      {selectedAgreement.status}
                    </span>
                  </div>
                </div>
              </div>

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
