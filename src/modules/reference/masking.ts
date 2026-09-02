export function credentialMaskedSuffix(value: string): string {
  const trimmed = value.trim();
  return trimmed.length <= 4 ? trimmed : trimmed.slice(-4);
}

export function formatCredentialDisplay(value: string): string {
  return `ending ${credentialMaskedSuffix(value)}`;
}

export function normalizePhone(value: string): string {
  if (/[^\d\s()+.-]/.test(value)) {
    throw new Error("Enter a valid 10-digit US phone number.");
  }
  const digits = value.replace(/\D/g, "");
  const national =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (!/^\d{10}$/.test(national)) {
    throw new Error("Enter a valid 10-digit US phone number.");
  }
  return `+1${national}`;
}
