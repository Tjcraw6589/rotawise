import type { RefObject } from 'react';

export const shareSupported = true;

/** On the web the year calendar opens in a new tab with the print dialog, where it can be saved as a PDF. */
export async function shareYearPdf(html: string, _year: number): Promise<string> {
  const w = globalThis.open?.('', '_blank');
  if (!w) return 'Allow pop ups to print the calendar';
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  return 'Opened';
}

export async function shareViewImage(_ref: RefObject<unknown>, _year: number): Promise<string> {
  return 'Images can be shared from the iPhone and Android apps';
}
