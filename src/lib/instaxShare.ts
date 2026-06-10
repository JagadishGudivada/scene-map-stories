import iconUrl from "@/assets/sarevista-icon.png";

/**
 * Loads an image with CORS so we can draw it onto a canvas without tainting.
 * Returns null when the image cannot be loaded (e.g. cross-origin refusal).
 */
function loadImage(src: string, crossOrigin = "anonymous"): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export interface InstaxOptions {
  /** Primary image (poster, hero, cover) — drawn inside the polaroid window. */
  imageUrl: string;
  /** Big title under the image (movie/location/spot name). */
  title: string;
  /** Optional second line under the title (city, year, etc.). */
  caption?: string;
  /** Output square edge in px. Default 1080. */
  size?: number;
}

const CARD_BG = "#f8f5ee"; // warm paper
const TEXT_DARK = "#1a1a1a";
const TEXT_MUTED = "#6b6b6b";

/**
 * Generates a polaroid / Instax style PNG data URL for sharing.
 * Composition: paper card → square image window → caption block → Sarevista lockup.
 */
export async function generateInstaxImage(opts: InstaxOptions): Promise<string> {
  const size = opts.size ?? 1080;
  // Polaroid proportions: 1 : 1.2 (taller than wide).
  const W = size;
  const H = Math.round(size * 1.2);
  const pad = Math.round(size * 0.055);
  const imgSize = W - pad * 2; // square photo window

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Soft paper background with subtle vignette.
  ctx.fillStyle = CARD_BG;
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.75);
  grad.addColorStop(0, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(0,0,0,0.08)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Image window — dark fallback if image fails to load.
  const imgX = pad;
  const imgY = pad;
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(imgX, imgY, imgSize, imgSize);

  const photo = await loadImage(opts.imageUrl);
  if (photo && photo.width > 0) {
    // Cover-fit crop into square window.
    const ratio = photo.width / photo.height;
    let sx = 0, sy = 0, sw = photo.width, sh = photo.height;
    if (ratio > 1) {
      // wider than tall — crop sides
      sw = photo.height;
      sx = (photo.width - sw) / 2;
    } else if (ratio < 1) {
      sh = photo.width;
      sy = (photo.height - sh) / 2;
    }
    try {
      ctx.drawImage(photo, sx, sy, sw, sh, imgX, imgY, imgSize, imgSize);
    } catch {
      // canvas may taint — leave dark fallback
    }
  }

  // Subtle inner border on the photo.
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(imgX + 1, imgY + 1, imgSize - 2, imgSize - 2);

  // Caption area below image.
  const captionTop = imgY + imgSize + Math.round(size * 0.05);
  ctx.textAlign = "center";
  ctx.fillStyle = TEXT_DARK;
  const titleSize = Math.round(size * 0.052);
  ctx.font = `400 ${titleSize}px "Instrument Serif", Georgia, "Times New Roman", serif`;
  const titleText = truncate(opts.title, 42);
  ctx.fillText(titleText, W / 2, captionTop + titleSize);

  if (opts.caption) {
    const capSize = Math.round(size * 0.024);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = `400 ${capSize}px "Inter", system-ui, sans-serif`;
    ctx.fillText(truncate(opts.caption, 60), W / 2, captionTop + titleSize + capSize + 14);
  }

  // Bottom Sarevista lockup.
  const icon = await loadImage(iconUrl);
  const lockupY = H - Math.round(size * 0.075);
  const iconH = Math.round(size * 0.05);
  const iconW = icon ? Math.round((icon.width / icon.height) * iconH) : 0;
  const wordSize = Math.round(size * 0.038);
  ctx.font = `400 ${wordSize}px "Instrument Serif", Georgia, serif`;
  const wordText = "sarevista";
  const wordW = ctx.measureText(wordText).width;
  const gap = Math.round(size * 0.014);
  const lockupW = iconW + gap + wordW;
  const lockupX = (W - lockupW) / 2;

  if (icon) {
    ctx.drawImage(icon, lockupX, lockupY - iconH * 0.5, iconW, iconH);
  }
  ctx.fillStyle = TEXT_DARK;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(wordText, lockupX + iconW + gap, lockupY);

  return canvas.toDataURL("image/png");
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function instaxFilename(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "sarevista";
  return `sarevista-${slug}.png`;
}
