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
import type { SurfboardInventoryRow } from '../types/surfboardInventory';
import { findSurfboardByInput, formatSurfboardPublicLabel } from '../utils/surfboardDisplay';

const MAX_LIST = 200;

type PopoverRect = { top: number; left: number; width: number; maxHeight: number };

function isRectUsable(r: DOMRect): boolean {
  return r.width >= 2 && r.height >= 2;
}

function getScrollTargets(el: HTMLElement | null): (HTMLElement | Window)[] {
  const out: (HTMLElement | Window)[] = [];
  if (!el) {
    out.push(window);
    return out;
  }
  let p: HTMLElement | null = el.parentElement;
  while (p) {
    const s = getComputedStyle(p);
    if (/(auto|scroll|overlay)/.test(s.overflowX) || /(auto|scroll|overlay)/.test(s.overflowY)) {
      out.push(p);
    }
    p = p.parentElement;
  }
  out.push(window);
  return out;
}

export type SurfboardComboboxLabels = {
  placeholder: string;
  ariaOpenList: string;
  ariaCloseList: string;
  noMatches: string;
};

const defaultComboboxLabels: SurfboardComboboxLabels = {
  placeholder: 'Busca por marca o número…',
  ariaOpenList: 'Abrir lista',
  ariaCloseList: 'Cerrar lista',
  noMatches: 'No hay coincidencias en el inventario.',
};

export type SurfboardComboboxProps = {
  boards: SurfboardInventoryRow[];
  value: string;
  onChange: (boardNumber: string) => void;
  id?: string;
  disabled?: boolean;
  /** Textos (p. ej. formulario público en inglés); por defecto español (panel admin). */
  labels?: Partial<SurfboardComboboxLabels>;
};

export default function SurfboardCombobox({
  boards,
  value,
  onChange,
  id,
  disabled,
  labels: labelsProp,
}: SurfboardComboboxProps) {
  const labels: SurfboardComboboxLabels = { ...defaultComboboxLabels, ...labelsProp };
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [popover, setPopover] = useState<PopoverRect | null>(null);
  const measureRetryRef = useRef(0);

  useEffect(() => {
    const row = boards.find((b) => b.board_number === value);
    if (row) setInputText(formatSurfboardPublicLabel(row));
    else setInputText(value);
  }, [value, boards]);

  const query = inputText.trim();
  const filteredList = useMemo(() => {
    if (!query) return boards.slice(0, MAX_LIST);
    const q = query.toLowerCase();
    return boards
      .filter((b) => {
        const pub = formatSurfboardPublicLabel(b).toLowerCase();
        return (
          pub.includes(q) ||
          b.board_number.toLowerCase().includes(q) ||
          (b.brand ?? '').trim().toLowerCase().includes(q)
        );
      })
      .slice(0, MAX_LIST);
  }, [boards, query]);

  const showPanel = open && boards.length > 0 && !disabled;

  const commitExactOrClear = useCallback(() => {
    const t = inputText.trim();
    if (!t) {
      onChange('');
      return;
    }
    const exact = findSurfboardByInput(boards, t);
    if (exact) {
      onChange(exact.board_number);
      setInputText(formatSurfboardPublicLabel(exact));
    } else {
      onChange('');
      setInputText('');
    }
  }, [boards, inputText, onChange]);

  const applyBoard = useCallback(
    (b: SurfboardInventoryRow) => {
      onChange(b.board_number);
      setInputText(formatSurfboardPublicLabel(b));
      setOpen(false);
    },
    [onChange]
  );

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
    const vh = vv?.height ?? window.innerHeight;
    const vw = vv?.width ?? window.innerWidth;

    const top = r.bottom + 4;
    const spaceBelow = Math.max(0, vh - r.bottom - margin);
    const cap = Math.min(vh * 0.85, 52 * 16);
    const maxHeight = Math.min(cap, spaceBelow);

    if (!Number.isFinite(top) || !Number.isFinite(maxHeight)) return;

    let left = r.left;
    const width = Math.max(r.width, 280);
    if (left + width > vw - margin) {
      left = Math.max(margin, vw - margin - width);
    }

    setPopover({ top, left, width, maxHeight });
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
  }, [showPanel, inputText, filteredList.length, boards.length, updatePopoverPosition]);

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

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex gap-1">
        <input
          id={id}
          type="text"
          value={inputText}
          disabled={disabled}
          onChange={(e) => {
            setInputText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          onBlur={(e) => {
            const rel = e.relatedTarget as Node | null;
            if (portalRef.current?.contains(rel)) return;
            window.setTimeout(() => commitExactOrClear(), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const exact = findSurfboardByInput(boards, inputText);
              if (exact) applyBoard(exact);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listId : undefined}
          aria-autocomplete="list"
          className="form-input min-w-0 flex-1 py-2 text-sm"
          placeholder={labels.placeholder}
        />
        {boards.length > 0 && !disabled && (
          <button
            type="button"
            className="shrink-0 inline-flex items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 px-2 text-gray-700 transition hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label={open ? labels.ariaCloseList : labels.ariaOpenList}
            aria-expanded={showPanel}
            aria-controls={showPanel ? listId : undefined}
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen((v) => !v);
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
              {filteredList.length > 0 ? (
                filteredList.map((b) => (
                  <li key={b.id} role="option">
                    <button
                      type="button"
                      className="flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:text-cyan-400 dark:hover:bg-slate-700/80"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyBoard(b);
                      }}
                    >
                      {formatSurfboardPublicLabel(b)}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400" role="presentation">
                  {labels.noMatches}
                </li>
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
