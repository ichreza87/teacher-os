/** Split text into overlapping chunks on paragraph boundaries.
 *  Char-based (≈4 chars/token): maxChars 1500 ≈ 375 tokens, overlap 200. */

export interface ChunkOptions {
  maxChars?: number;
  overlap?: number;
}

export const MAX_TEXT_CHARS = 200_000;
export const MAX_CHUNKS = 200;

function tailOverlap(s: string, overlap: number): string {
  if (s.length <= overlap) return s;
  const tail = s.slice(-overlap);
  const space = tail.search(/\s/);
  return space === -1 ? tail : tail.slice(space + 1);
}

export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const maxChars = opts.maxChars ?? 1500;
  const overlap = opts.overlap ?? 200;
  const cleaned = text.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!cleaned) return [];

  const paras = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const units = paras.length > 0 ? paras : [cleaned];

  const chunks: string[] = [];
  let current = "";
  const push = () => {
    if (current.trim()) chunks.push(current.trim());
  };

  for (const para of units) {
    // Oversized single paragraph: hard-split on word boundaries.
    if (para.length > maxChars) {
      if (current.trim()) {
        push();
        current = "";
      }
      const words = para.split(/\s+/);
      let buf = "";
      for (const w of words) {
        if ((buf + " " + w).trim().length > maxChars && buf) {
          chunks.push(buf.trim());
          buf = tailOverlap(buf, overlap) + " " + w;
        } else {
          buf = buf ? buf + " " + w : w;
        }
      }
      current = buf;
      continue;
    }
    const candidate = current ? current + "\n\n" + para : para;
    if (candidate.length > maxChars && current.trim()) {
      push();
      const tail = tailOverlap(current, overlap);
      current = tail ? tail + "\n\n" + para : para;
    } else {
      current = candidate;
    }
  }
  push();
  return chunks;
}
