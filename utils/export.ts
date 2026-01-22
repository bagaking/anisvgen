import * as gifencRaw from 'gifenc';

// Reliable extraction for jsdelivr/esm.sh module formats
const getGifencLib = () => {
  const lib = gifencRaw as any;
  
  if (typeof lib.GIFEncoder === 'function') return lib;
  if (lib.default && typeof lib.default.GIFEncoder === 'function') return lib.default;
  if (lib.default && lib.default.default && typeof lib.default.default.GIFEncoder === 'function') return lib.default.default;
  
  return lib.default || lib;
};

const gifenc = getGifencLib();
const GIFEncoder = gifenc.GIFEncoder;
const quantize = gifenc.quantize;
const applyPalette = gifenc.applyPalette;

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadSVG = (svgContent: string, filename: string) => {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  downloadBlob(blob, `${filename}.svg`);
};

export const downloadPNG = async (svgContent: string, width: number, height: number, filename: string, timeOffset: number = 0) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svg = doc.documentElement;
  
  // FIX: Force explicit dimensions on the SVG root to match desired output size.
  // This solves issues where the SVG only had viewBox or percentage sizes.
  svg.setAttribute('width', width.toString());
  svg.setAttribute('height', height.toString());

  const style = doc.createElementNS("http://www.w3.org/2000/svg", "style");
  // Inject style to pause animation at specific frame
  style.textContent = `
    svg * { 
      animation-play-state: paused !important; 
      animation-delay: -${timeOffset}s !important; 
    }
  `;
  svg.appendChild(style);

  const serializer = new XMLSerializer();
  const str = serializer.serializeToString(svg);
  
  const img = new Image();
  const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(new Error("Failed to load SVG into Image for PNG export"));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    
    // Use high quality export
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${filename}.png`);
    }, 'image/png');
  }
  URL.revokeObjectURL(url);
};

export const downloadGIF = async (
  svgContent: string, 
  width: number, 
  height: number, 
  filename: string,
  explicitDuration?: number
): Promise<void> => {
  if (typeof GIFEncoder !== 'function') {
    throw new Error("GIFEncoder library failed to load.");
  }

  let detectedDuration = 0;
  const timeRegex = /[:\s](\d*\.?\d+)(s|ms)\b/gi;
  let match;
  while ((match = timeRegex.exec(svgContent)) !== null) {
    let val = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'ms') val /= 1000;
    if (val >= 0.5 && val <= 20) {
      detectedDuration = Math.max(detectedDuration, val);
    }
  }

  let duration = explicitDuration || 2;
  if (detectedDuration > duration) {
    duration = detectedDuration;
  }
  duration = Math.min(duration, 10);

  const fps = 30; // 30 FPS is usually sufficient for GIF and smaller file size
  const totalFrames = Math.ceil(duration * fps);
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) throw new Error("Could not create canvas context");

  let encoder;
  try {
      encoder = new GIFEncoder();
  } catch (e) {
      encoder = (GIFEncoder as any)();
  }
  
  for (let i = 0; i < totalFrames; i++) {
    const timeOffset = (i / fps);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.documentElement;

    // FIX: Force explicit dimensions
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());

    const style = doc.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      svg, svg * { 
          animation-play-state: paused !important;
          animation-delay: -${timeOffset.toFixed(3)}s !important;
      }
    `;
    svg.appendChild(style);
    
    const serialized = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
        img.src = url;
    });

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    const { data } = ctx.getImageData(0, 0, width, height);
    
    // Basic transparency handling
    const palette = quantize(data, 256, { format: 'rgba' });
    const transparentIndex = palette.findIndex((p: any) => p[3] === 0);
    // If no transparent color found but we have alpha, we need to handle it better,
    // but for simple cases, gifenc quantize works okayish.
    // For robust GIF, explicit palette mapping is better as per previous implementation
    // Reverting to the previous robust transparency logic for consistency:
    
    // ... [Previous Transparency Logic Omitted for brevity, reusing the robust logic from before] ...
    // Note: The key change in this file for GIF is the explicit width/height attribute setting above.
    // To ensure full code correctness, I'll paste the robust logic again below.
    
    const opaquePixels: number[] = [];
    for (let p = 0; p < data.length; p += 4) {
      if (data[p + 3] > 128) opaquePixels.push(data[p], data[p+1], data[p+2], 255);
    }
    
    const p = opaquePixels.length > 0 
      ? quantize(new Uint8Array(opaquePixels), 255, { format: 'rgba' }) 
      : [[0,0,0]];

    const rgbPalette = p.map((c: any) => Array.from(c).slice(0, 3));
    rgbPalette.unshift([0, 0, 0]); // Transparent color at index 0

    const index = applyPalette(data, rgbPalette, 'rgba');
    for (let k = 0; k < width * height; k++) {
      if (data[k * 4 + 3] < 128) index[k] = 0;
    }

    encoder.writeFrame(index, width, height, { 
        palette: rgbPalette, 
        delay: (1000 / fps),
        transparent: true,
        dispose: 2 
    });
  }

  encoder.finish();
  const buffer = encoder.bytes();
  const gifBlob = new Blob([buffer], { type: 'image/gif' });
  downloadBlob(gifBlob, `${filename}.gif`);
};