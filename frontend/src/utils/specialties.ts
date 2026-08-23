// Mantenha esta lista idêntica à lista do backend ao adicionar especialidades.
export const SPECIALTIES = [
  'Psicologia',
  'Fonoaudiologia',
  'Fisioterapia',
  'Terapia Ocupacional',
] as const;

export type Specialty = (typeof SPECIALTIES)[number];
