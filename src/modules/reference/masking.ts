export function credentialMaskedSuffix(value: string): string {
  const trimmed = value.trim();
  return trimmed.length <= 4 ? trimmed : trimmed.slice(-4);
}

export function formatCredentialDisplay(value: string): string {
  return `ending ${credentialMaskedSuffix(value)}`;
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return `+${digits}`;
}
