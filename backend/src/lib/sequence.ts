// Generates human-readable document numbers: PREFIX-YYYYMMDD-XXXX
export function docNumber(prefix: string, seq: number): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}-${ymd}-${String(seq).padStart(4, '0')}`;
}
