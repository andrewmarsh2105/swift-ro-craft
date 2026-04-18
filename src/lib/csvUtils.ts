/** Map labor-type string to compact code. */
export function typeCode(lt: string): string {
  return lt === 'warranty' ? 'W' : lt === 'internal' ? 'I' : 'CP';
}
