import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

/**
 * Usage in templates:
 * <img [src]="base64String | safeDataUrl:'image/png'" />
 * Returns `null` (no image) for invalid input.
 */
@Pipe({ name: 'safeDataUrl' })
export class SafeDataUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(input: string | null | undefined, mimeType = 'image/png'): SafeUrl | null {
    if (!input) return null;

    // If caller passed a full data URL, extract mime and base64 payload
    let detectedMime = mimeType;
    let payload = String(input).trim();

    const dataUrlMatch = payload.match(/^data:([^;]+);base64,(.+)$/i);
    if (dataUrlMatch) {
      detectedMime = dataUrlMatch[1] || mimeType;
      payload = dataUrlMatch[2] || '';
    }

    // Remove whitespace/newlines and accidental suffix like ":1"
    let s = payload.replace(/\s+/g, '').replace(/:\d+$/, '');

    // Remove characters not allowed in base64
    s = s.replace(/[^A-Za-z0-9+/=]/g, '');

    // Basic base64 validation (checks padding/length pattern)
    const base64Regex = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
    if (!base64Regex.test(s)) return null;

    const dataUrl = `data:${detectedMime};base64,${s}`;
    return this.sanitizer.bypassSecurityTrustUrl(dataUrl);
  }
}
