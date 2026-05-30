import sanitizeHtml from 'sanitize-html'

const allowedTags = [
  'p', 'br', 'hr',
  'h2', 'h3', 'h4',
  'strong', 'b', 'em', 'i', 'u', 's',
  'blockquote', 'code', 'pre',
  'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'figure', 'figcaption',
  'iframe',
]

const allowedAttributes: Record<string, sanitizeHtml.AllowedAttribute[]> = {
  a: ['href', 'name', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  iframe: ['src', 'title', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
  th: ['colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
}

export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html || '', {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    },
    allowedIframeHostnames: [
      'www.youtube.com',
      'youtube.com',
      'www.youtube-nocookie.com',
      'youtube-nocookie.com',
      'player.vimeo.com',
    ],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      }, true),
      img: sanitizeHtml.simpleTransform('img', {
        loading: 'lazy',
      }, true),
    },
    disallowedTagsMode: 'discard',
  }).trim()
}

export function countWordsFromHtml(html: string): number {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .length
}
