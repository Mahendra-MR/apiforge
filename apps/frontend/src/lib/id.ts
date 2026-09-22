/** Short client-side id for list rows (params/headers/form-data). Never sent to the backend. */
export function createRowId(): string {
  return crypto.randomUUID();
}
