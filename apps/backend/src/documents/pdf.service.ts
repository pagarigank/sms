import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb, RGB } from 'pdf-lib';
import * as QRCode from 'qrcode';

/**
 * Tenant branding as configured in platform-admin (tenants/[id]/branding).
 * Everything optional — unbranded tenants keep the plain layout.
 */
export interface PdfBranding {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  schoolName?: string;
  tagline?: string;
  footerText?: string;
  /** Data URI (data:image/png;base64,…) or absolute http(s) URL. */
  logoSource?: string;
}

/**
 * Real PDF generation + local-disk storage for registrar documents.
 *
 * Library choice: pdf-lib — a pure-JS PDF writer (no headless browser, no
 * native bindings), so the demo's Node/Postgres runtime stays the only
 * dependency and certificates (fixed layouts, drawn text) render exactly.
 *
 * Storage: local disk under `--storage-dir` (default `<repo>/storage/documents`),
 * served back through the authenticated download route. `fileUrl` stores the
 * relative path inside the storage root, so switching to S3 later only means
 * swapping the save/load pair.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  private get storageRoot(): string {
    const configured = process.env.DOC_STORAGE_DIR;
    const root = configured
      ? path.resolve(configured)
      : path.resolve(process.cwd(), '../../storage/documents');
    fs.mkdirSync(root, { recursive: true });
    return root;
  }

  /** Merge-field substitution: {{key}} → value, unknown keys kept visible. */
  mergeFields(text: string, vars: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (raw, key: string) => vars[key] ?? raw);
  }

  /**
   * Render a certificate-style A4 PDF and store it.
   * Returns the storage-relative path (what `fileUrl` persists).
   */
  async renderCertificatePdf(input: {
    header: string;
    subheaderLines?: string[];
    bodyLines: string[];
    footerLines?: string[];
    tenantName: string;
    verificationCode: string;
    qrPayload: string;
    branding?: PdfBranding;
  }): Promise<string> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4 portrait, points
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const y = await this.drawBrandedHeader(pdf, page, { font, bold }, {
      header: input.header,
      subheaderLines: input.subheaderLines,
      tenantName: input.tenantName,
      branding: input.branding,
    });

    let cursor = y;
    const W = page.getWidth();
    const M = 56;
    const ink = rgb(0.1, 0.1, 0.12);

    for (const line of input.bodyLines) {
      const text = this.sanitize(line);
      // '[b]text[/b]' renders bold; both markers must be stripped.
      const isHeading = /^\[b\](.*)/.exec(text);
      if (isHeading) {
        const boldText = isHeading[1].replace(/\[\/b\]\s*$/, '');
        page.drawText(this.sanitize(boldText), { x: M, y: cursor, size: 12.5, font: bold, color: ink, maxWidth: W - 2 * M });
        cursor -= 20;
        continue;
      }
      page.drawText(text, { x: M, y: cursor, size: 11, font, color: ink, maxWidth: W - 2 * M });
      cursor -= 17;
    }

    // Awaited: the QR embed is async, and pdf.save() below must serialize the
    // document only after the footer (QR included) has been drawn.
    await this.drawVerificationFooter(pdf, page, { font, bold }, {
      footerLines: input.footerLines,
      footerText: input.branding?.footerText,
      verificationCode: input.verificationCode,
      qrPayload: input.qrPayload,
    });

    const bytes = await pdf.save();
    const relPath = this.newRelPath();
    fs.writeFileSync(path.join(this.storageRoot, relPath), bytes);
    return relPath;
  }

  /** Build a Form 137 / TOR-style record with a grades table. */
  async renderRecordPdf(input: {
    header: string;
    subheaderLines?: string[];
    student: { name: string; lrn?: string | null; schoolYear?: string | null; gradeLevel?: string | null };
    subjects: Array<{ code: string; title: string; finalRating: number | null }>;
    generalAverage?: number | null;
    footerLines?: string[];
    tenantName: string;
    verificationCode: string;
    qrPayload: string;
    branding?: PdfBranding;
  }): Promise<string> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const ink = rgb(0.1, 0.1, 0.12);
    const W = page.getWidth();
    const M = 56;

    const y = await this.drawBrandedHeader(pdf, page, { font, bold }, {
      header: input.header,
      subheaderLines: input.subheaderLines,
      tenantName: input.tenantName,
      branding: input.branding,
    });

    let cursor = y - 10;

    // Identity block
    const id = [
      `Learner: ${input.student.name}`,
      input.student.lrn ? `LRN: ${input.student.lrn}` : null,
      input.student.gradeLevel ? `Grade level: ${input.student.gradeLevel}` : null,
      input.student.schoolYear ? `School year: ${input.student.schoolYear}` : null,
    ].filter(Boolean) as string[];
    for (const line of id) {
      page.drawText(this.sanitize(line), { x: M, y: cursor, size: 10.5, font, color: ink });
      cursor -= 15;
    }
    cursor -= 10;

    // Grades table
    const colX = { code: M, title: M + 70, rating: W - M - 60 };
    page.drawText('CODE', { x: colX.code, y: cursor, size: 9, font: bold, color: rgb(0.35, 0.35, 0.4) });
    page.drawText('SUBJECT', { x: colX.title, y: cursor, size: 9, font: bold, color: rgb(0.35, 0.35, 0.4) });
    page.drawText('FINAL', { x: colX.rating, y: cursor, size: 9, font: bold, color: rgb(0.35, 0.35, 0.4) });
    cursor -= 6;
    page.drawLine({ start: { x: M, y: cursor }, end: { x: W - M, y: cursor }, thickness: 0.8, color: rgb(0.78, 0.78, 0.82) });
    cursor -= 16;

    for (const s of input.subjects) {
      page.drawText(this.sanitize(s.code), { x: colX.code, y: cursor, size: 10, font, color: ink });
      page.drawText(this.sanitize(s.title).slice(0, 60), { x: colX.title, y: cursor, size: 10, font, color: ink });
      page.drawText(s.finalRating != null ? s.finalRating.toFixed(0) : '—', {
        x: colX.rating, y: cursor, size: 10, font, color: ink,
      });
      cursor -= 15;
    }

    if (input.generalAverage != null) {
      cursor -= 6;
      page.drawLine({ start: { x: M, y: cursor }, end: { x: W - M, y: cursor }, thickness: 0.5, color: rgb(0.85, 0.85, 0.88) });
      cursor -= 18;
      page.drawText(this.sanitize(`General average: ${input.generalAverage.toFixed(2)}`), {
        x: M, y: cursor, size: 11.5, font: bold, color: ink,
      });
    }

    // Awaited: the QR embed is async, and pdf.save() below must serialize the
    // document only after the footer (QR included) has been drawn.
    await this.drawVerificationFooter(pdf, page, { font, bold }, {
      footerLines: input.footerLines,
      footerText: input.branding?.footerText,
      verificationCode: input.verificationCode,
      qrPayload: input.qrPayload,
    });

    const bytes = await pdf.save();
    const relPath = this.newRelPath();
    fs.writeFileSync(path.join(this.storageRoot, relPath), bytes);
    return relPath;
  }

  /**
   * Render a sample A4 page showing ONLY the branded header (band, logo,
   * school name, tagline, title, accent rule) — the same drawing code the
   * real documents go through, so what the admin previews is what will be
   * issued. Returned as raw bytes; nothing is stored and no DB record is
   * created (there is no footer/QR: a preview has nothing to verify).
   */
  async previewHeaderPdf(input: {
    header: string;
    subheaderLines?: string[];
    tenantName: string;
    branding?: PdfBranding;
  }): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4 portrait, points
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    await this.drawBrandedHeader(pdf, page, { font, bold }, input);
    return pdf.save();
  }

  /**
   * Shared page header.
   *
   * Unbranded (no branding fields at all): the legacy look — tenant name line,
   * ink-colored title, gray rule. Branded: a primary-color band across the top
   * with the logo + school name + tagline, a secondary accent stripe, and the
   * document title below the band in the primary color.
   *
   * Every branding input is optional and failure-tolerant: bad colors fall
   * back to defaults, an unloadable logo is skipped, and nothing here can
   * block document issuance.
   */
  private async drawBrandedHeader(
    pdf: PDFDocument,
    page: PDFPage,
    fonts: { font: PDFFont; bold: PDFFont },
    input: {
      header: string;
      subheaderLines?: string[];
      tenantName: string;
      branding?: PdfBranding;
    },
  ): Promise<number> {
    const { font, bold } = fonts;
    const W = page.getWidth();
    const H = page.getHeight();
    const M = 56;
    const brand = input.branding ?? {};
    const ink = rgb(0.1, 0.1, 0.12);
    const muted = rgb(0.35, 0.35, 0.4);

    const branded = !!(brand.primaryColor || brand.logoSource || brand.schoolName || brand.tagline);

    if (!branded) {
      // --- Legacy header ---
      let y = H - M - 28;
      page.drawText(this.sanitize(input.tenantName), { x: M, y, size: 11, font: bold, color: muted });
      y -= 34;
      page.drawText(this.sanitize(input.header), { x: M, y, size: 20, font: bold, color: ink, maxWidth: W - 2 * M });
      y -= 18;
      for (const line of input.subheaderLines ?? []) {
        page.drawText(this.sanitize(line), { x: M, y, size: 10.5, font, color: muted, maxWidth: W - 2 * M });
        y -= 15;
      }
      y -= 8;
      page.drawLine({
        start: { x: M, y }, end: { x: W - M, y },
        thickness: 0.8, color: rgb(0.78, 0.78, 0.82),
      });
      return y - 30;
    }

    // --- Branded header ---
    const primary = this.hexToRgb(brand.primaryColor) ?? rgb(0.15, 0.39, 0.92);
    const secondary = this.hexToRgb(brand.secondaryColor);
    const onPrimary = this.readableTextOn(primary);

    const bandH = 84;
    page.drawRectangle({ x: 0, y: H - bandH, width: W, height: bandH, color: primary });
    if (secondary) {
      page.drawRectangle({ x: 0, y: H - bandH - 6, width: W, height: 6, color: secondary });
    }

    // Logo (aspect-ratio fitted into the band)
    let textX = M;
    const logo = await this.loadLogoBytes(brand.logoSource);
    if (logo) {
      try {
        const img: PDFImage = logo.format === 'png' ? await pdf.embedPng(logo.bytes) : await pdf.embedJpg(logo.bytes);
        const maxH = bandH - 30;
        const scale = Math.min(maxH / img.height, 140 / img.width);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, { x: M, y: H - bandH + (bandH - h) / 2, width: w, height: h });
        textX = M + w + 18;
      } catch (e) {
        this.logger.warn(`Logo embed failed (skipped): ${e instanceof Error ? e.message : e}`);
      }
    }

    const schoolName = this.sanitize(brand.schoolName ?? input.tenantName);
    const tagline = brand.tagline ? this.sanitize(brand.tagline) : null;
    if (tagline) {
      page.drawText(schoolName, { x: textX, y: H - bandH + bandH / 2 + 2, size: 14, font: bold, color: onPrimary });
      page.drawText(tagline, { x: textX, y: H - bandH + bandH / 2 - 15, size: 9, font, color: onPrimary });
    } else {
      page.drawText(schoolName, {
        x: textX, y: H - bandH + (bandH - 14) / 2, size: 14, font: bold, color: onPrimary,
      });
    }

    // Title below the band, in the primary color
    let y = H - bandH - 40;
    page.drawText(this.sanitize(input.header), { x: M, y, size: 18, font: bold, color: primary, maxWidth: W - 2 * M });
    y -= 16;
    for (const line of input.subheaderLines ?? []) {
      page.drawText(this.sanitize(line), { x: M, y, size: 10.5, font, color: muted, maxWidth: W - 2 * M });
      y -= 15;
    }
    y -= 6;
    const accent = this.hexToRgb(brand.accentColor) ?? rgb(0.78, 0.78, 0.82);
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: accent });
    return y - 28;
  }

  /** Shared footer: issuer note(s), verification code, QR. */
  private async drawVerificationFooter(
    pdf: PDFDocument,
    page: PDFPage,
    fonts: { font: PDFFont; bold: PDFFont },
    input: {
      footerLines?: string[];
      footerText?: string;
      verificationCode: string;
      qrPayload: string;
    },
  ) {
    const { font, bold } = fonts;
    const W = page.getWidth();
    const M = 56;
    const muted = rgb(0.35, 0.35, 0.4);

    const lines = [...(input.footerLines ?? [])];
    if (input.footerText) lines.unshift(this.sanitize(input.footerText));

    let fy = M + 44;
    for (const line of lines.slice().reverse()) {
      page.drawText(line, { x: M, y: fy, size: 9.5, font, color: muted, maxWidth: W - 2 * M });
      fy -= 13;
    }
    page.drawText(this.sanitize(`Verification code: ${input.verificationCode}`), {
      x: M, y: M + 18, size: 9.5, font: bold, color: muted,
    });

    try {
      const qrPng = await QRCode.toBuffer(input.qrPayload, { margin: 0, width: 220 });
      const qrImage = await pdf.embedPng(qrPng);
      const size = 84;
      page.drawImage(qrImage, { x: W - M - size, y: M + 14, width: size, height: size });
    } catch (e) {
      // A QR failure must never block issuance — the printed code still verifies.
      this.logger.warn(`QR render failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Read a stored document by relative path (download route). */
  read(relPath: string): Buffer {
    const full = path.join(this.storageRoot, relPath);
    const normalized = path.normalize(full);
    if (!normalized.startsWith(this.storageRoot)) {
      throw new Error('Invalid document path');
    }
    return fs.readFileSync(normalized);
  }

  private newRelPath(): string {
    const day = new Date().toISOString().slice(0, 10);
    const name = `${crypto.randomUUID()}.pdf`;
    const rel = path.join(day, name);
    fs.mkdirSync(path.join(this.storageRoot, day), { recursive: true });
    return rel;
  }

  /**
   * Load the tenant logo. Accepts data URIs and absolute http(s) URLs (size-
   * and time-capped); only real PNG/JPEG payloads pass magic-byte sniffing.
   * Anything else (including relative paths — there is no public storage yet)
   * yields null and the header renders without a logo.
   */
  private async loadLogoBytes(source: string | undefined): Promise<{ bytes: Buffer; format: 'png' | 'jpg' } | null> {
    if (!source) return null;
    try {
      let bytes: Buffer;
      if (source.startsWith('data:')) {
        const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(source);
        if (!m) return null;
        bytes = Buffer.from(m[2], 'base64');
      } else if (/^https?:\/\//i.test(source)) {
        const res = await fetch(source, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length === 0 || buf.length > 2_000_000) return null; // 2 MB cap
        bytes = buf;
      } else {
        return null;
      }
      if (bytes.subarray(0, 4).toString('hex') === '89504e47') return { bytes, format: 'png' };
      if (bytes.subarray(0, 3).toString('hex') === 'ffd8ff') return { bytes, format: 'jpg' };
      return null;
    } catch (e) {
      this.logger.warn(`Logo load failed (skipped): ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  /** `#rgb`/`#rrggbb` → pdf-lib RGB; null for anything invalid. */
  private hexToRgb(hex: string | undefined): RGB | null {
    if (!hex) return null;
    const m = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return rgb(
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    );
  }

  /** White text on dark bands, near-black on light ones. */
  private readableTextOn(bg: RGB): RGB {
    const lum = 0.2126 * bg.red + 0.7152 * bg.green + 0.0722 * bg.blue;
    return lum > 0.6 ? rgb(0.1, 0.1, 0.12) : rgb(1, 1, 1);
  }

  /** WinAnsi-safe: pdf-lib standard fonts throw on characters outside cp1252. */
  private sanitize(text: string): string {
    return text
      .replace(/\u2018|\u2019/g, "'")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2013|\u2014/g, '-')
      .replace(/\u2022/g, '-')
      .replace(/\u20B1/g, 'PHP ')
      .replace(/[^\x20-\x7E\n]/g, '?');
  }
}
