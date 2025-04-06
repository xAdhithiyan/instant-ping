export function extractCharacters(text: string, start: string, replacement: string) {
  const startPos = text.indexOf(`\n${start}:`);
  if (startPos == -1) {
    return text;
  }

  const countStart = startPos + start.length;
  const endPos = text.indexOf('\n', countStart);

  if (endPos == -1) {
    const modifiedText = text.slice(0, startPos) + `\n${replacement}`;
    return modifiedText;
  } else {
    const modifiedText = text.slice(0, startPos) + `\n${replacement}` + text.slice(endPos);
    return modifiedText;
  }
}
