import { useMemo, useState } from 'react';
import { useProfile, useUpdateProfile } from '../data/hooks';
import { countryOptions, ITALY, placeError, placeOf, province, provinceOptions } from '../lib/places';
import { Select } from './ui';

export interface PlaceValue {
  country: string;
  province: string;
}

export const PLACE_ERRORS = { country: 'Scegli la nazione.', province: 'Scegli la provincia.' } as const;

/**
 * Nazione e, in Italia, provincia: due menu, niente posizione del telefono (ticket 38). Usati alla registrazione, in
 * Account e nella Home. `error`: il campo che manca, da `placeError`.
 */
export function PlaceFields({ value, onChange, error, disabled }: {
  value: PlaceValue;
  onChange: (v: PlaceValue) => void;
  error?: 'country' | 'province' | null;
  disabled?: boolean;
}) {
  const countries = useMemo(() => [{ v: '', l: 'Scegli la nazione' }, ...countryOptions()], []);
  const provinces = useMemo(() => [{ v: '', l: 'Scegli la provincia' }, ...provinceOptions()], []);
  const region = province(value.province)?.region;
  return (
    <>
      <Select
        label="Nazione"
        value={value.country}
        options={countries}
        autoComplete="country"
        disabled={disabled}
        error={error === 'country' ? PLACE_ERRORS.country : undefined}
        onChange={(country) => onChange({ country, province: country === ITALY ? value.province : '' })}
      />
      {value.country === ITALY && (
        <Select
          label="Provincia"
          value={value.province}
          options={provinces}
          disabled={disabled}
          error={error === 'province' ? PLACE_ERRORS.province : undefined}
          hint={region ? `Regione: ${region}` : undefined}
          onChange={(p) => onChange({ ...value, province: p })}
        />
      )}
    </>
  );
}

/** Il luogo del profilo, con "Salva": in Account e, per chi non l'ha ancora indicato, in cima alla Home (ticket 39). */
export function PlaceForm({ saveLabel = 'Salva' }: { saveLabel?: string }) {
  const profile = useProfile();
  const update = useUpdateProfile('Luogo salvato');
  // null = nessuna modifica in corso: mostra il luogo salvato
  const [draft, setDraft] = useState<PlaceValue | null>(null);
  const [error, setError] = useState<'country' | 'province' | null>(null);
  const saved: PlaceValue = { country: profile.data?.country ?? '', province: profile.data?.province ?? '' };
  const value = draft ?? saved;
  const changed = value.country !== saved.country || value.province !== saved.province;

  const save = () => {
    const err = placeError(value.country, value.province);
    setError(err);
    if (err) return;
    update.mutate(placeOf(value.country, value.province), { onSuccess: () => setDraft(null) });
  };

  return (
    <div className="form mt-14">
      <PlaceFields
        value={value}
        error={error}
        disabled={profile.isLoading}
        onChange={(v) => {
          setDraft(v);
          setError(null);
        }}
      />
      <div className="row">
        <button type="button" className="btn small" onClick={save} disabled={!changed || update.isPending}>
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
