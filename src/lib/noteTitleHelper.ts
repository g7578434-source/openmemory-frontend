export function getDisplayTitle(note?: { title?: string; content?: string }): string {
  if (!note || !note.title) return 'Untitled Note';
  
  if (
    note.title === 'Micro-Tool Research Note Template' ||
    note.title === 'Idea Research Note Template' ||
    note.title === 'Micro-Tool Build Spec Template'
  ) {
    // Extract first H1 from content as fallback title
    const h1Match = note.content?.match(/^#\s+(.+)/m);
    return h1Match ? h1Match[1].trim() : note.title;
  }
  return note.title;
}
