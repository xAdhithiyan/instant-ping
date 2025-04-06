export function checkValidLabel(label: string) {
  const allLabels = ['INBOX', 'SPAM', 'TRASH', 'UNREAD', 'SENT', 'DRAFT', 'STARRED', 'IMPORTANT'];

  for (const singleLabel of allLabels) {
    if (singleLabel == label.toUpperCase()) {
      return true;
    }
  }

  return false;
}
