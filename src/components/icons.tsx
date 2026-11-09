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

/** Livello: pentagono con un'area dentro */
export const IconLivello = () => (
  <Svg>
    <path d="M12 3.2 20.5 9.4 17.3 19.5H6.7L3.5 9.4Z" />
    <path d="M12 8.2 16 11 14.6 15.6H9.6L8.2 11.3Z" />
  </Svg>
);

/** Icone delle 5 categorie della Home (ticket 10): segni semplici, decorativi, il nome è accanto. */
export const IconFondTirata = () => (
  <Svg>
    <path d="M3 4.5h18" />
    <path d="M8 4.5v4.5a4 4 0 0 0 8 0V4.5" />
    <path d="M12 21v-7M9 17l3-3 3 3" />
  </Svg>
);

export const IconFondSpinta = () => (
  <Svg>
    <path d="M3 20.5h18" />
    <path d="M12 16V4M8 8l4-4 4 4" />
    <path d="M7 20.5v-3.5M17 20.5v-3.5" />
  </Svg>
);

export const IconSkillSpinta = () => (
  <Svg>
    <path d="M3 20.5h18" />
    <path d="M9 20.5v-6" />
    <path d="M4 12.5h15" />
    <circle cx="20.5" cy="12.5" r="1.5" />
  </Svg>
);

export const IconSkillTirata = () => (
  <Svg>
    <path d="M3 4.5h18" />
    <path d="M9 4.5v6" />
    <path d="M4 12.5h15" />
    <circle cx="20.5" cy="12.5" r="1.5" />
  </Svg>
);

export const IconHandbalance = () => (
  <Svg>
    <path d="M12 3.5v13" />
    <circle cx="12" cy="19" r="1.8" />
    <path d="M7.5 20.5h9" />
    <path d="M9.5 3.5h5" />
  </Svg>
);
