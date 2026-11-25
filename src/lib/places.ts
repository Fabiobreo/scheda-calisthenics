/**
 * Luoghi per le classifiche (ticket 38): le 107 province italiane con la regione, e le nazioni.
 * Le province sono le stesse della tabella `provinces` (migration 0017): `places.test.ts` controlla che coincidano.
 * Il luogo lo sceglie l'utente da un elenco: l'app non chiede mai la posizione del telefono.
 */

export interface Province {
  /** sigla ("MI") */
  code: string;
  name: string;
  region: string;
}

const P = (region: string, ...list: [code: string, name: string][]): Province[] => list.map(([code, name]) => ({ code, name, region }));

/** Nell'ordine della migration (da nord a sud, regione per regione). */
export const PROVINCES: readonly Province[] = [
  ...P('Piemonte', ['TO', 'Torino'], ['VC', 'Vercelli'], ['NO', 'Novara'], ['CN', 'Cuneo'], ['AT', 'Asti'], ['AL', 'Alessandria'], ['BI', 'Biella'], ['VB', 'Verbano-Cusio-Ossola']),
  ...P("Valle d'Aosta", ['AO', 'Aosta']),
  ...P('Lombardia', ['VA', 'Varese'], ['CO', 'Como'], ['SO', 'Sondrio'], ['MI', 'Milano'], ['BG', 'Bergamo'], ['BS', 'Brescia'], ['PV', 'Pavia'], ['CR', 'Cremona'], ['MN', 'Mantova'], ['LC', 'Lecco'], ['LO', 'Lodi'], ['MB', 'Monza e Brianza']),
  ...P('Trentino-Alto Adige', ['BZ', 'Bolzano'], ['TN', 'Trento']),
  ...P('Veneto', ['VR', 'Verona'], ['VI', 'Vicenza'], ['BL', 'Belluno'], ['TV', 'Treviso'], ['VE', 'Venezia'], ['PD', 'Padova'], ['RO', 'Rovigo']),
  ...P('Friuli-Venezia Giulia', ['UD', 'Udine'], ['GO', 'Gorizia'], ['TS', 'Trieste'], ['PN', 'Pordenone']),
  ...P('Liguria', ['IM', 'Imperia'], ['SV', 'Savona'], ['GE', 'Genova'], ['SP', 'La Spezia']),
  ...P('Emilia-Romagna', ['PC', 'Piacenza'], ['PR', 'Parma'], ['RE', 'Reggio Emilia'], ['MO', 'Modena'], ['BO', 'Bologna'], ['FE', 'Ferrara'], ['RA', 'Ravenna'], ['FC', 'Forlì-Cesena'], ['RN', 'Rimini']),
  ...P('Toscana', ['MS', 'Massa-Carrara'], ['LU', 'Lucca'], ['PT', 'Pistoia'], ['FI', 'Firenze'], ['LI', 'Livorno'], ['PI', 'Pisa'], ['AR', 'Arezzo'], ['SI', 'Siena'], ['GR', 'Grosseto'], ['PO', 'Prato']),
  ...P('Umbria', ['PG', 'Perugia'], ['TR', 'Terni']),
  ...P('Marche', ['PU', 'Pesaro e Urbino'], ['AN', 'Ancona'], ['MC', 'Macerata'], ['AP', 'Ascoli Piceno'], ['FM', 'Fermo']),
  ...P('Lazio', ['VT', 'Viterbo'], ['RI', 'Rieti'], ['RM', 'Roma'], ['LT', 'Latina'], ['FR', 'Frosinone']),
  ...P('Abruzzo', ['AQ', "L'Aquila"], ['TE', 'Teramo'], ['PE', 'Pescara'], ['CH', 'Chieti']),
  ...P('Molise', ['CB', 'Campobasso'], ['IS', 'Isernia']),
  ...P('Campania', ['CE', 'Caserta'], ['BN', 'Benevento'], ['NA', 'Napoli'], ['AV', 'Avellino'], ['SA', 'Salerno']),
  ...P('Puglia', ['FG', 'Foggia'], ['BA', 'Bari'], ['TA', 'Taranto'], ['BR', 'Brindisi'], ['LE', 'Lecce'], ['BT', 'Barletta-Andria-Trani']),
  ...P('Basilicata', ['PZ', 'Potenza'], ['MT', 'Matera']),
  ...P('Calabria', ['CS', 'Cosenza'], ['CZ', 'Catanzaro'], ['RC', 'Reggio Calabria'], ['KR', 'Crotone'], ['VV', 'Vibo Valentia']),
  ...P('Sicilia', ['TP', 'Trapani'], ['PA', 'Palermo'], ['ME', 'Messina'], ['AG', 'Agrigento'], ['CL', 'Caltanissetta'], ['EN', 'Enna'], ['CT', 'Catania'], ['RG', 'Ragusa'], ['SR', 'Siracusa']),
  ...P('Sardegna', ['SS', 'Sassari'], ['NU', 'Nuoro'], ['CA', 'Cagliari'], ['OR', 'Oristano'], ['SU', 'Sud Sardegna']),
];

const BY_CODE = new Map(PROVINCES.map((p) => [p.code, p]));

export const province = (code: string | null | undefined): Province | undefined => (code ? BY_CODE.get(code) : undefined);

export const ITALY = 'IT';

/** Codici ISO 3166-1 alpha-2. I nomi in italiano li dà il browser (`Intl.DisplayNames`). */
const COUNTRY_CODES =
  'AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' ',
  );

let names: Intl.DisplayNames | null | undefined;
const displayNames = () => {
  if (names === undefined)
    try {
      names = new Intl.DisplayNames(['it'], { type: 'region' });
    } catch {
      names = null;
    }
  return names;
};

/** "Italia" per "IT". Un codice sconosciuto (o un browser senza i nomi) resta il codice. */
export function countryName(code: string): string {
  try {
    return displayNames()?.of(code) ?? code;
  } catch {
    return code;
  }
}

export interface PlaceOption {
  v: string;
  l: string;
}

/** Nazioni per il menu: Italia per prima, le altre in ordine alfabetico. */
export function countryOptions(): PlaceOption[] {
  const rest = COUNTRY_CODES.filter((c) => c !== ITALY)
    .map((c) => ({ v: c, l: countryName(c) }))
    .sort((a, b) => a.l.localeCompare(b.l, 'it'));
  return [{ v: ITALY, l: countryName(ITALY) }, ...rest];
}

/** Province per il menu, in ordine alfabetico: "Milano (MI)". */
export function provinceOptions(): PlaceOption[] {
  return [...PROVINCES].sort((a, b) => a.name.localeCompare(b.name, 'it')).map((p) => ({ v: p.code, l: `${p.name} (${p.code})` }));
}

/**
 * Controlla il luogo scelto prima di salvarlo: la nazione serve sempre, la provincia solo (e sempre) in Italia.
 * Restituisce il campo che manca, oppure null.
 */
export function placeError(country: string, prov: string): 'country' | 'province' | null {
  if (!COUNTRY_CODES.includes(country)) return 'country';
  if (country === ITALY && !BY_CODE.has(prov)) return 'province';
  return null;
}

/** Il luogo così come si salva: fuori dall'Italia niente provincia. */
export const placeOf = (country: string, prov: string): { country: string; province: string | null } => ({
  country,
  province: country === ITALY ? prov : null,
});
