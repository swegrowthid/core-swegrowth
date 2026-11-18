import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useMemo } from 'react';

/** Ringkasan sesi (markdown, biasanya dari Zoom): dirender lalu dibersihkan. Dipakai rekap portal & pratinjau admin. */
export function SessionSummary({ markdown }: { markdown: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(markdown, { async: false, breaks: true })), [markdown]);
  return <div className="prose recap-summary" dangerouslySetInnerHTML={{ __html: html }} />;
}
