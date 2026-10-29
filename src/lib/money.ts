// All amounts are stored in øre (1 DKK = 100 øre) to avoid floating-point errors.
export function formatDKK(ore: number): string {
  return new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" }).format(ore / 100);
}
