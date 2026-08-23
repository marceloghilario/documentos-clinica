export const normalizeCpf = (value: string): string =>
  value.replace(/\D/g, '').slice(0, 11);

export const formatCpf = (value: string): string => {
  const digits = normalizeCpf(value);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9,
  )}-${digits.slice(9)}`;
};

export const isValidCpf = (value: string): boolean =>
  normalizeCpf(value).length === 11;
