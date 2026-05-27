/** Strip all HTML tags and dangerous characters from a string. */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')          // remove HTML tags
    .replace(/&[a-z]+;/gi, ' ')       // replace HTML entities
    .replace(/javascript:/gi, '')      // remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')       // remove inline event handlers
    .trim()
}

/** Truncate a string to a maximum length. */
export function truncate(input: string, maxLength: number): string {
  return input.length > maxLength ? input.slice(0, maxLength) : input
}

/** Sanitize a text field: strip HTML and enforce a max length. */
export function sanitizeField(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return ''
  return truncate(stripHtml(input), maxLength)
}
