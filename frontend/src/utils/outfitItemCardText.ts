export interface OutfitItemCardText {
  shortName: string;
  oneLineReason: string | null;
}

/**
 * Split a long item description into a short name and optional one-line reason.
 */
export function parseOutfitItemCardText(description: string): OutfitItemCardText {
  const trimmed = description.trim();
  if (!trimmed) {
    return { shortName: '', oneLineReason: null };
  }

  const separators = [' — ', ' - ', ', ', '. '];
  for (const sep of separators) {
    const idx = trimmed.indexOf(sep);
    if (idx > 0 && idx < 60) {
      const shortName = trimmed.slice(0, idx).trim();
      const rest = trimmed.slice(idx + sep.length).trim();
      return {
        shortName,
        oneLineReason: rest.length > 0 ? rest.slice(0, 80) : null,
      };
    }
  }

  if (trimmed.length > 48) {
    return {
      shortName: `${trimmed.slice(0, 45).trim()}…`,
      oneLineReason: null,
    };
  }

  return { shortName: trimmed, oneLineReason: null };
}
