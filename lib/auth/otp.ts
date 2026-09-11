export function normalizeOtp(value: string) {
  return value.replace(/[^0-9]/g, "").slice(0, 6);
}

