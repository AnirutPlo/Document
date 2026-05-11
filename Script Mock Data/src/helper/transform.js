export function parseActiveStrict(v) {
  return (
    String(v ?? '')
      .trim()
      .toUpperCase() === 'TRUE'
  );
}
