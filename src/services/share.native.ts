import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';

export const shareSupported = true;

/** Renders the year calendar HTML to a PDF and opens the share sheet (print, save, AirDrop, mail). */
export async function shareYearPdf(html: string, year: number): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html, width: 842, height: 595 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Rotawise ${year}`, UTI: 'com.adobe.pdf' });
    return 'Shared';
  }
  return 'Saved';
}

/** Captures the on screen year view as a PNG and opens the share sheet. */
export async function shareViewImage(ref: RefObject<unknown>, year: number): Promise<string> {
  const uri = await captureRef(ref as Parameters<typeof captureRef>[0], { format: 'png', quality: 1, result: 'tmpfile' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Rotawise ${year}`, UTI: 'public.png' });
    return 'Shared';
  }
  return 'Saved';
}
