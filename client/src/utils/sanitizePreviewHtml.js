const ALLOWED_TAGS = new Set([
  'A', 'B', 'BLOCKQUOTE', 'BR', 'CAPTION', 'CODE', 'DD', 'DIV', 'DL', 'DT',
  'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'I', 'LI', 'OL', 'P',
  'PRE', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'TABLE', 'TBODY',
  'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'U', 'UL'
]);

const DROP_CONTENT_TAGS = new Set([
  'BUTTON', 'EMBED', 'FORM', 'IFRAME', 'INPUT', 'LINK', 'MATH', 'META',
  'NOSCRIPT', 'OBJECT', 'SCRIPT', 'SELECT', 'STYLE', 'SVG', 'TEXTAREA'
]);

function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return node;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tagName = node.tagName.toUpperCase();
  if (DROP_CONTENT_TAGS.has(tagName)) return null;

  const children = [...node.childNodes]
    .map(sanitizeNode)
    .filter(Boolean);

  if (!ALLOWED_TAGS.has(tagName)) {
    const fragment = document.createDocumentFragment();
    children.forEach((child) => fragment.append(child));
    return fragment;
  }

  const cleanElement = document.createElement(tagName.toLowerCase());
  for (const attribute of ['colspan', 'rowspan', 'scope', 'title']) {
    if (node.hasAttribute(attribute)) {
      cleanElement.setAttribute(attribute, node.getAttribute(attribute));
    }
  }

  if (tagName === 'A') {
    const href = node.getAttribute('href');
    if (href) {
      try {
        const url = new URL(href, window.location.origin);
        if (['http:', 'https:', 'mailto:'].includes(url.protocol)) {
          cleanElement.setAttribute('href', url.href);
          cleanElement.setAttribute('rel', 'noopener noreferrer');
        }
      } catch {
        // Abaikan tautan yang tidak valid.
      }
    }
  }

  children.forEach((child) => cleanElement.append(child));
  return cleanElement;
}

export function sanitizePreviewHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html ?? '');

  const fragment = document.createDocumentFragment();
  [...template.content.childNodes]
    .map(sanitizeNode)
    .filter(Boolean)
    .forEach((node) => fragment.append(node));

  const output = document.createElement('div');
  output.append(fragment);
  return output.innerHTML;
}
