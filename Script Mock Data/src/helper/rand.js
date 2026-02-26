export function randOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomBirthDate() {
  const start = new Date(1970, 0, 1).getTime();
  const end = new Date(2010, 11, 31).getTime();
  const t = Math.floor(Math.random() * (end - start + 1)) + start;
  const d = new Date(t);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
