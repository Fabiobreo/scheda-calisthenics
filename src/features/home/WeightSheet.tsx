import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useToast } from '../../app/toast';
import { Field } from '../../components/ui';
import { useBodyWeights, useDeleteBodyWeight, useSetBodyWeight } from '../../data/hooks';
import type { BodyWeight } from '../../data/types';
import { shortDate, todayStr } from '../../lib/dates';
import { fmt, numInput, parseNum } from '../../lib/format';
import { LIMITS, validateBodyweight } from '../../lib/levels';

/**
 * Storico del peso corporeo (audit A18): mini-grafico, elenco delle pesate, inserimento per una data e correzione.
 * Il peso del giorno serve ai record in kg (05, decisione 13): correggerlo ricalcola quei record. Il trainer lo legge.
 */
export function WeightSheet({ onClose, readOnly = false }: { onClose: () => void; readOnly?: boolean }) {
  const list = useBodyWeights().data ?? [];
  const rows = [...list].sort((a, b) => b.date.localeCompare(a.date));
  const save = useSetBodyWeight();
  const del = useDeleteBodyWeight();
  const toast = useToast();
  const [date, setDate] = useState(todayStr());
  const [kg, setKg] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [dateErr, setDateErr] = useState<string | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // come gli altri pannelli: Esc chiude, il fuoco entra e alla chiusura torna dov'era
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    title.current?.focus();
    document.body.classList.add('locked');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('locked');
      back?.focus?.();
    };
  }, []);

  const existing = rows.find((r) => r.date === date);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!date) return setDateErr('Scegli la data');
    if (date > todayStr()) return setDateErr('La data non può essere nel futuro');
    const v = Math.round(parseNum(kg) * 10) / 10;
    if (!validateBodyweight(v)) return setErr(`Tra ${LIMITS.minBodyweightKg} e ${LIMITS.maxBodyweightKg} kg`);
    save.mutate({ date, kg: v }, { onSuccess: () => setKg('') });
  };

  const remove = (r: BodyWeight) =>
    del.mutate(r.date, {
      onSuccess: () => toast(`Pesata del ${shortDate(r.date)} eliminata`, { label: 'Annulla', run: () => save.mutate({ date: r.date, kg: r.kg }) }),
    });

  return (
    <div className="sheet-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="bw-title">
        <div className="card-h">
          <h2 id="bw-title" ref={title} tabIndex={-1}>
            Peso corporeo
          </h2>
          <button className="x" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>
        <p className="hint rec-def">Il peso di ogni giorno serve a calcolare i record in kg di quel giorno.</p>
        {rows.length >= 2 && <WeightChart rows={rows} />}

        {!readOnly && (
          <form className="form" onSubmit={submit} noValidate>
            <h3 className="rec-h">{existing ? 'Correggi la pesata' : 'Nuova pesata'}</h3>
            <div className="grid2">
              <Field
                label="Data"
                type="date"
                max={todayStr()}
                value={date}
                error={dateErr ?? undefined}
                onChange={(e) => {
                  setDate(e.target.value);
                  setDateErr(null);
                }}
              />
              <Field
                label="Peso (kg)"
                inputMode="decimal"
                autoComplete="off"
                value={kg}
                placeholder={existing ? numInput(existing.kg) : undefined}
                error={err ?? undefined}
                onChange={(e) => {
                  setKg(e.target.value);
                  setErr(null);
                }}
              />
            </div>
            <div className="row">
              <button className="btn" disabled={save.isPending} aria-busy={save.isPending || undefined}>
                {existing ? 'Salva correzione' : 'Salva'}
              </button>
            </div>
          </form>
        )}

        <h3 className="rec-h">Storico</h3>
        {rows.length === 0 ? (
          <p className="hint">Nessuna pesata.</p>
        ) : (
          <ul className="rec-list">
            {rows.map((r, i) => {
              const prev = rows[i + 1];
              const diff = prev ? Math.round((r.kg - prev.kg) * 10) / 10 : 0;
              return (
                <li key={r.date} className={r.date === date && !readOnly ? 'on' : undefined}>
                  <span>
                    <b>{fmt(r.kg)} kg</b>
                    {diff !== 0 && <span className="hint"> · {diff > 0 ? '+' : '−'}{fmt(Math.abs(diff))}</span>}
                    <small>{shortDate(r.date)}</small>
                  </span>
                  {!readOnly && (
                    <span className="pact">
                      <button
                        type="button"
                        className="btn small ghost"
                        onClick={() => {
                          setDate(r.date);
                          setKg(numInput(r.kg));
                          setErr(null);
                          setDateErr(null);
                        }}
                        aria-label={`Modifica il peso del ${shortDate(r.date)}`}
                      >
                        Modifica
                      </button>
                      <button type="button" className="x" onClick={() => remove(r)} aria-label={`Elimina il peso del ${shortDate(r.date)}`}>
                        ×
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Linea delle pesate con la scala tra minimo e massimo (da 0 le variazioni di peso non si vedrebbero). */
function WeightChart({ rows }: { rows: BodyWeight[] }) {
  const pts = [...rows].reverse();
  const W = 340;
  const H = 120;
  const pad = { l: 40, r: 14, t: 14, b: 24 };
  const vals = pts.map((p) => p.kg);
  const lo = Math.floor(Math.min(...vals) - 1);
  const hi = Math.ceil(Math.max(...vals) + 1);
  const t0 = new Date(pts[0].date).getTime();
  const t1 = new Date(pts[pts.length - 1].date).getTime();
  const x = (d: string) => pad.l + ((new Date(d).getTime() - t0) / Math.max(t1 - t0, 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.kg).toFixed(1)}`).join(' ');
  const first = pts[0];
  const last = pts[pts.length - 1];
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Peso da ${fmt(first.kg)} kg (${shortDate(first.date)}) a ${fmt(last.kg)} kg (${shortDate(last.date)})`}>
        {[lo, hi].map((v) => (
          <g key={v}>
            <line className="g-grid" x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} />
            <text className="g-txt" x={pad.l - 8} y={y(v) + 4} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        <path className="g-glow" d={line} />
        <path className="g-line" d={line} />
        {pts.map((p) => (
          <circle key={p.date} className="g-dot" cx={x(p.date)} cy={y(p.kg)} r={pts.length > 16 ? 2.6 : 3.6} />
        ))}
        <text className="g-txt" x={pad.l} y={H - 4}>
          {shortDate(first.date)}
        </text>
        <text className="g-txt" x={W - pad.r} y={H - 4} textAnchor="end">
          {shortDate(last.date)}
        </text>
      </svg>
    </div>
  );
}
