import type { PDFFont } from "pdf-lib";

/**
 * Replaces characters the embedded standard fonts cannot encode so a single
 * unsupported codepoint in a name never fails an entire report. Newlines and
 * tabs collapse to spaces.
 */
export function printable(text: string, font: PDFFont): string {
  return Array.from(text)
    .map((character) => {
      if (character === "\n" || character === "\r" || character === "\t")
        return " ";
      try {
        font.encodeText(character);
        return character;
      } catch {
        // Standard fonts cannot render every name. Preserve unsupported codepoints
        // explicitly rather than dropping them or failing an entire report.
        return `[U+${character.codePointAt(0)?.toString(16).toUpperCase()}]`;
      }
    })
    .join("");
}

/** Word- and character-wrapped lines that fit within `width` at `size`. */
export function wrap(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of printable(text, font).split(/\s+/)) {
    if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > width) {
      lines.push(line);
      line = "";
    }
    for (const character of word) {
      if (font.widthOfTextAtSize(line + character, size) > width) {
        lines.push(line);
        line = "";
      }
      line += character;
    }
    line += " ";
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.length ? lines : [""];
}
