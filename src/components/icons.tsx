/** Icone della barra in basso: tratto semplice nel colore del testo, 24×24. Decorative: l'etichetta è accanto. */
const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

/** Scheda: calendario */
export const IconScheda = () => (
  <Svg>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17.5h2" />
  </Svg>
);

/** Grafici: linea che sale */
export const IconGrafici = () => (
  <Svg>
    <path d="M4 4v16h16" />
    <path d="m7.5 15 4-4.5 3 2.5 5-6" />
  </Svg>
);

/** Esercizi: manubrio */
export const IconEsercizi = () => (
  <Svg>
    <path d="M7 12h10" />
    <rect x="3.5" y="8" width="3.5" height="8" rx="1" />
    <rect x="17" y="8" width="3.5" height="8" rx="1" />
    <path d="M2 10.5v3M22 10.5v3" />
  </Svg>
);

/** Atleti: due persone */
export const IconAtleti = () => (
  <Svg>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3 19.5c.6-3.3 3-5.2 6-5.2s5.4 1.9 6 5.2" />
    <path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.6 14.6c1.8.7 3 2.4 3.4 4.9" />
  </Svg>
);
