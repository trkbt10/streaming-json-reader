/**
 * Checks if a character is whitespace (space, newline, carriage return, or tab)
 */
export const isWhitespace = (ch: string): boolean => {
  return ch === " " || ch === "\n" || ch === "\r" || ch === "\t";
};

/**
 * Checks if a character is a digit (0-9)
 */
export const isDigit = (ch: string): boolean => {
  return ch >= "0" && ch <= "9";
};

/**
 * Checks if a character is valid in a JSON number
 */
export const isNumberChar = (ch: string): boolean => {
  return (
    isDigit(ch) ||
    ch === "-" ||
    ch === "+" ||
    ch === "e" ||
    ch === "E" ||
    ch === "."
  );
};