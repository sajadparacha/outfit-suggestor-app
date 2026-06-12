const MIN_BULLETS = 1;
const MAX_BULLETS = 5;

const SENTENCE_PATTERN = /[^.!?]+[.!?]+/g;

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(SENTENCE_PATTERN.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    const sentence = match[0].trim();
    if (sentence) sentences.push(sentence);
  }
  return sentences;
}

/**
 * Split outfit reasoning into 3–5 bullet-friendly lines for display.
 */
export function reasoningToBullets(reasoning: string): string[] {
  const trimmed = reasoning.trim();
  if (!trimmed) return [];

  const byNewline = trimmed
    .split(/\n+/)
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

  if (trimmed.includes('\n') && byNewline.length >= MIN_BULLETS) {
    return byNewline.slice(0, MAX_BULLETS);
  }

  const bySentence = splitSentences(trimmed);
  if (bySentence.length >= MIN_BULLETS) {
    return bySentence.slice(0, MAX_BULLETS);
  }

  return [trimmed];
}
