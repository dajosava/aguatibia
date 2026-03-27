import {
  useMemo,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useId,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import type { StoreProductRow } from '../types/storeProduct';

export interface StoreItemLine {
  id: string;
  productName: string;
  price: string;
  /** Fila elegida desde catálogo (formulario público); el precio viene solo del catálogo. */
  catalogProductId?: string | null;
  /** Unidades de esta línea (≥ 1). El padre muestra el selector y valida inventario. */
  quantity?: number;
}

export type StoreProductLineCatalogUi = {
  placeholder: string;
  noResults: string;
};

type Props = {
  row: StoreItemLine;
  catalog: StoreProductRow[];
  onChange: (lineId: string, patch: Partial<StoreItemLine>) => void;
  /** `catalog`: solo productos del catálogo, sin productos nuevos ni precio manual. */
  mode?: 'freeform' | 'catalog';
  /** Textos cuando `mode === 'catalog'` (obligatorio en ese modo). */
  catalogUi?: StoreProductLineCatalogUi;
};

const MAX_LIST = 200;

type PopoverRect = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function isRectUsable(r: DOMRect): boolean {
  return r.width >= 2 && r.height >= 2;
}

/** Scroll en contenedores internos no dispara scroll en window; hay que escuchar cada ancestro. */
function getScrollTargets(el: HTMLElement | null): (HTMLElement | Window)[] {
  const out: (HTMLElement | Window)[] = [];
  if (!el) {
    out.push(window);
    return out;
  }
  let p: HTMLElement | null = el.parentElement;
  while (p) {
    const s = getComputedStyle(p);
    const ox = s.overflowX;
    const oy = s.overflowY;
    if (/(auto|scroll|overlay)/.test(ox) || /(auto|scroll|overlay)/.test(oy)) {
      out.push(p);
    }
    p = p.parentElement;
  }
  out.push(window);
  return out;
}

export default function StoreProductLineInput({
  row,
  catalog,
  onChange,
  mode = 'freeform',
  catalogUi,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [popover, setPopover] = useState<PopoverRect | null>(null);
  const measureRetryRef = useRef(0);

  const query = row.productName.trim();
  const filteredList = useMemo(() => {
    if (!query) return catalog.slice(0, MAX_LIST);
    const q = query.toLowerCase();
    return catalog
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, MAX_LIST);
  }, [catalog, query]);

  const showPanel = open && catalog.length > 0;

  const updatePopoverPosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!isRectUsable(r)) {
      if (measureRetryRef.current < 8) {
        measureRetryRef.current += 1;
        requestAnimationFrame(() => updatePopoverPosition());
      }
      return;
    }
    measureRetryRef.current = 0;

    const margin = 8;
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    /** Altura/ancho visibles reales (barra de direcciones móvil, etc.) */
    const vh = vv?.height ?? window.innerHeight;
    const vw = vv?.width ?? window.innerWidth;

    /**
     * Siempre anclar debajo del campo (borde inferior del input).
     * Antes: si había más espacio arriba que abajo, se abría encima con top negativo y parecía
     * “flotar” arriba de la pantalla al hacer scroll.
     */
    const top = r.bottom + 4;
    const spaceBelow = Math.max(0, vh - r.bottom - margin);
    const cap = Math.min(vh * 0.85, 52 * 16);
    const maxHeight = Math.min(cap, spaceBelow);

    if (!Number.isFinite(top) || !Number.isFinite(maxHeight)) return;

    const maxPanelWidth = Math.max(0, vw - margin * 2);
    const minDesired = Math.min(280, maxPanelWidth || r.width);
    const width = Math.min(
      maxPanelWidth,
      Math.max(r.width, Number.isFinite(minDesired) && minDesired > 0 ? minDesired : r.width)
    );

    let left = r.left;
    if (left + width > vw - margin) {
      left = Math.max(margin, vw - margin - width);
    }
    if (left < margin) left = margin;

    setPopover({
      top,
      left,
      width,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!showPanel) {
      setPopover(null);
      measureRetryRef.current = 0;
      return;
    }

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      measureRetryRef.current = 0;
      updatePopoverPosition();
    };
    run();
    const id1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) run();
      });
    });

    const targets = getScrollTargets(wrapRef.current);
    for (const t of targets) {
      t.addEventListener('scroll', run, true);
    }
    window.addEventListener('resize', run);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', run);
    vv?.addEventListener('scroll', run);

    return () => {
      cancelled = true;
      cancelAnimationFrame(id1);
      for (const t of targets) {
        t.removeEventListener('scroll', run, true);
      }
      window.removeEventListener('resize', run);
      vv?.removeEventListener('resize', run);
      vv?.removeEventListener('scroll', run);
    };
  }, [showPanel, row.productName, filteredList.length, catalog.length, updatePopoverPosition]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (portalRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const applyProduct = (p: StoreProductRow) => {
    onChange(row.id, {
      productName: p.name,
      price: Number(p.unit_price).toFixed(2),
      catalogProductId: mode === 'catalog' ? p.id : null,
      quantity: 1,
    });
    setOpen(false);
  };

  const selectedCatalog =
    row.catalogProductId && mode === 'catalog'
      ? catalog.find((p) => p.id === row.catalogProductId)
      : null;

  const handleProductNameChange = (value: string) => {
    if (mode === 'catalog') {
      if (
        selectedCatalog &&
        value.trim().toLowerCase() !== selectedCatalog.name.trim().toLowerCase()
      ) {
        onChange(row.id, { productName: value, catalogProductId: null, price: '', quantity: 1 });
        return;
      }
    }
    onChange(row.id, { productName: value });
  };

  const toggleDropdown = () => {
    setOpen((v) => !v);
  };

  const listContent =
    filteredList.length > 0 ? (
      filteredList.map((p) => (
        <li key={p.id} role="option">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-700/80"
            onMouseDown={(e) => {
              e.preventDefault();
              applyProduct(p);
            }}
          >
            <span className="text-gray-900 dark:text-slate-100">{p.name}</span>
            <span className="shrink-0 font-semibold text-green-600 dark:text-emerald-400">
              ${Number(p.unit_price).toFixed(2)}
            </span>
          </button>
        </li>
      ))
    ) : (
      <li className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400" role="presentation">
        {mode === 'catalog' && catalogUi
          ? catalogUi.noResults
          : 'No hay coincidencias. Puedes escribir un producto nuevo.'}
      </li>
    );

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex gap-1 min-w-0">
        <input
          type="text"
          value={row.productName}
          onChange={(e) => {
            handleProductNameChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listId : undefined}
          aria-autocomplete="list"
          className="form-input min-w-0 flex-1 py-2 text-sm"
          placeholder={
            mode === 'catalog' && catalogUi
              ? catalogUi.placeholder
              : 'Escribe para buscar o elige en la lista'
          }
        />
        {catalog.length > 0 && (
          <button
            type="button"
            className="shrink-0 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 px-2 text-gray-700 transition hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label={open ? 'Cerrar lista de productos' : 'Abrir lista de productos'}
            aria-expanded={showPanel}
            aria-controls={showPanel ? listId : undefined}
            onMouseDown={(e) => {
              e.preventDefault();
              toggleDropdown();
            }}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        )}
      </div>

      {showPanel &&
        popover &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={portalRef}
            id={listId}
            className="pointer-events-auto rounded-lg border-2 border-gray-200 bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800"
            style={{
              position: 'fixed',
              top: popover.top,
              left: popover.left,
              width: popover.width,
              maxHeight: popover.maxHeight,
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ul className="max-h-full flex-1 overflow-y-auto py-1" role="listbox">
              {listContent}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
