export function chunkTranscript(text: string, size = 8000): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf('\n', size);
    if (cut < size * 0.5) cut = rest.lastIndexOf('. ', size);
    if (cut < size * 0.5) cut = size;
    chunks.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1);
  }
  if (rest.trim()) chunks.push(rest);
  return chunks;
}
