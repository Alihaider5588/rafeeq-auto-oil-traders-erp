/**
 * Robust JSON Tag parser and cleaner for metadata embedded in text/notes
 * e.g. [DELIVERY_META:{...}], [FOC_ITEMS:[...]], [PURCHASE_FOC:[...]]
 * Properly handles nested brackets and objects of arbitrary depth.
 */

export const extractJsonTag = <T = any>(text: string | undefined | null, tagName: string): T | null => {
  if (!text) return null;
  const startTag = `[${tagName}:`;
  const startIdx = text.indexOf(startTag);
  if (startIdx === -1) return null;
  const contentStart = startIdx + startTag.length;
  const firstChar = text[contentStart];
  if (firstChar === '{' || firstChar === '[') {
    const openChar = firstChar;
    const closeChar = firstChar === '{' ? '}' : ']';
    let depth = 0;
    for (let i = contentStart; i < text.length; i++) {
      if (text[i] === openChar) depth++;
      else if (text[i] === closeChar) {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.substring(contentStart, i + 1));
          } catch (e) {
            return null;
          }
        }
      }
    }
  }
  const endIdx = text.indexOf(']', contentStart);
  if (endIdx !== -1) {
    try {
      return JSON.parse(text.substring(contentStart, endIdx));
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const removeJsonTag = (text: string | undefined | null, tagName: string): string => {
  if (!text) return '';
  const startTag = `[${tagName}:`;
  let currentText = text;
  while (true) {
    const startIdx = currentText.indexOf(startTag);
    if (startIdx === -1) break;
    const contentStart = startIdx + startTag.length;
    const firstChar = currentText[contentStart];
    if (firstChar === '{' || firstChar === '[') {
      const openChar = firstChar;
      const closeChar = firstChar === '{' ? '}' : ']';
      let depth = 0;
      let endIdx = -1;
      for (let i = contentStart; i < currentText.length; i++) {
        if (currentText[i] === openChar) depth++;
        else if (currentText[i] === closeChar) {
          depth--;
          if (depth === 0) {
            endIdx = (currentText[i + 1] === ']') ? i + 2 : i + 1;
            break;
          }
        }
      }
      if (endIdx !== -1) {
        currentText = (currentText.substring(0, startIdx) + currentText.substring(endIdx)).trim();
        continue;
      }
    }
    const fallbackEnd = currentText.indexOf(']', contentStart);
    if (fallbackEnd !== -1) {
      currentText = (currentText.substring(0, startIdx) + currentText.substring(fallbackEnd + 1)).trim();
    } else {
      break;
    }
  }
  return currentText;
};
