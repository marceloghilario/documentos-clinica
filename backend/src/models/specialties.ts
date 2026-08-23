// Ponto único de extensão: mantenha esta lista sincronizada com o frontend.
export const SPECIALTIES = [
  'Psicologia',
  'Fonoaudiologia',
  'Fisioterapia',
  'Terapia Ocupacional',
] as const;

export type Specialty = (typeof SPECIALTIES)[number];
