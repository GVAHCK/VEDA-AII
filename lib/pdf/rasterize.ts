import { createCanvas, loadImage } from '@napi-rs/canvas';
import { processImageWithCV } from '@/lib/ocr/cv';
import type { PreprocessStage } from '@/lib/types';

export type PageImage = {
  pageNumber: number;
  /** Enhanced raster handed to OCR. */
  image: Buffer;
  /** Original raster is retained in request memory for diagnostic tooling. */
  originalImage?: Buffer;
  /** Diagnostics retained when OCR_DEBUG_OUTPUT=1 or for UI debugger. */
  enhancedImage?: Buffer;
  thresholdedImage?: Buffer;
  width: number;
  height: number;
  preprocessLog?: string[];
  preprocessStages?: PreprocessStage[];
  qualityScore?: number;
  skewAngle?: number;
  rotationApplied?: number;
};

async function saveDebugImages(page: PageImage): Promise<void> {
  if (process.env.OCR_DEBUG_OUTPUT !== '1') return;
  try {
    const [{ mkdir, writeFile }, path] = await Promise.all([import('node:fs/promises'), import('node:path')]);
    const root = path.join(process.cwd(), 'debug');
    await Promise.all(['original', 'enhanced', 'thresholded'].map((name) => mkdir(path.join(root, name), { recursive: true })));
    await Promise.all([
      page.originalImage && writeFile(path.join(root, 'original', `page-${page.pageNumber}.png`), page.originalImage),
      page.enhancedImage && writeFile(path.join(root, 'enhanced', `page-${page.pageNumber}.png`), page.enhancedImage),
      writeFile(path.join(root, 'thresholded', `page-${page.pageNumber}.png`), page.image),
    ]);
  } catch (error) {
    console.warn('[OCR DEBUG] Unable to save intermediate images', error);
  }
}

/** Converts an image or every PDF page into preprocessed high-resolution PNG buffers for OCR */
export async function rasterizeUpload(file: File): Promise<PageImage[]> {
  const source = Buffer.from(await file.arrayBuffer());
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    try {
      const img = await loadImage(source);
      // Ensure resolution is at least ~2200px width for 300 DPI equivalent
      const scale = img.width < 1800 ? Math.max(2, Math.ceil(2200 / (img.width || 1))) : 1;
      const targetWidth = Math.ceil(img.width * scale);
      const targetHeight = Math.ceil(img.height * scale);

      const canvas = createCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const cvResult = processImageWithCV(canvas, 1);
      const preprocessLog = cvResult.stages.map(
        (s) => `Page 1: ${s.stage} (${((s.confidence ?? 1) * 100).toFixed(0)}%) - ${s.details || ''}`
      );

      const page: PageImage = {
        pageNumber: 1,
        image: cvResult.imageBuffer,
        originalImage: source,
        enhancedImage: cvResult.enhancedBuffer,
        thresholdedImage: cvResult.thresholdedBuffer,
        width: targetWidth,
        height: targetHeight,
        preprocessLog,
        preprocessStages: cvResult.stages,
        qualityScore: cvResult.qualityScore,
        skewAngle: cvResult.skewAngle,
        rotationApplied: cvResult.rotationApplied,
      };

      await saveDebugImages(page);
      return [page];
    } catch {
      return [{ pageNumber: 1, image: source, width: 0, height: 0 }];
    }
  }

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const document = await pdfjs.getDocument({
    data: new Uint8Array(source),
    disableWorker: true,
  } as Parameters<typeof pdfjs.getDocument>[0]).promise;

  const pages: PageImage[] = [];
  for (let index = 1; index <= document.numPages; index += 1) {
    const page = await document.getPage(index);
    const baseViewport = page.getViewport({ scale: 1, rotation: page.rotate });
    // Target 300 DPI rasterization (scale ~3.5 to 4.0 for standard 72 DPI PDF)
    const targetScale = Math.max(3.0, Math.min(4.5, 2200 / (baseViewport.width || 600)));
    const viewport = page.getViewport({ scale: targetScale, rotation: page.rotate });

    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context as never, viewport }).promise;

    const originalImage = canvas.toBuffer('image/png');
    const cvResult = processImageWithCV(canvas, index);
    const preprocessLog = cvResult.stages.map(
      (s) => `Page ${index}: ${s.stage} (${((s.confidence ?? 1) * 100).toFixed(0)}%) - ${s.details || ''}`
    );

    const rendered: PageImage = {
      pageNumber: index,
      image: cvResult.imageBuffer,
      originalImage,
      enhancedImage: cvResult.enhancedBuffer,
      thresholdedImage: cvResult.thresholdedBuffer,
      width: Math.ceil(viewport.width),
      height: Math.ceil(viewport.height),
      preprocessLog,
      preprocessStages: cvResult.stages,
      qualityScore: cvResult.qualityScore,
      skewAngle: cvResult.skewAngle,
      rotationApplied: cvResult.rotationApplied,
    };

    await saveDebugImages(rendered);
    pages.push(rendered);
  }

  return pages;
}
