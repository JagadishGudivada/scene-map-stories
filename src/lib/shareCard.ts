import { toPng } from "html-to-image";

export async function generateShareCard(node: HTMLElement): Promise<Blob | null> {
  try {
    const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: "#0D0D0D" });
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch (e) {
    console.warn("Share card render failed", e);
    return null;
  }
}

export async function shareOrDownloadCard(node: HTMLElement, filename = "sarevista-stop.png") {
  const blob = await generateShareCard(node);
  if (!blob) return;
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Sarevista", text: "New stop on my memory map." });
      return;
    } catch {
      /* fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STORY_W = 1080;
const STORY_H = 1920;

/**
 * Re-frames a rendered card onto a 1080x1920 Instagram-Story canvas
 * (card centred on a dark gradient) and hands it to the native share sheet.
 */
export async function shareStoryCard(node: HTMLElement, filename = "sarevista-story.png") {
  const blob = await generateShareCard(node);
  if (!blob) return;

  const story = await composeStory(blob);
  if (!story) return shareOrDownloadCard(node, filename);

  const file = new File([story], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Sarevista",
        text: "New stop on my memory map — sarevista.com",
      });
      return;
    } catch {
      /* fall through to download */
    }
  }
  const url = URL.createObjectURL(story);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function composeStory(cardBlob: Blob): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const src = URL.createObjectURL(cardBlob);
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = STORY_W;
        canvas.height = STORY_H;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);

        const bg = ctx.createLinearGradient(0, 0, STORY_W, STORY_H);
        bg.addColorStop(0, "#0D0D0D");
        bg.addColorStop(0.55, "#1a1410");
        bg.addColorStop(1, "#0D0D0D");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, STORY_W, STORY_H);

        const maxW = STORY_W * 0.86;
        const scale = Math.min(maxW / img.width, (STORY_H * 0.7) / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (STORY_W - w) / 2, (STORY_H - h) / 2, w, h);

        ctx.fillStyle = "rgba(244, 199, 123, 0.85)";
        ctx.font = "500 34px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("sarevista.com", STORY_W / 2, STORY_H - 130);

        URL.revokeObjectURL(src);
        canvas.toBlob((b) => resolve(b), "image/png");
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      resolve(null);
    };
    img.src = src;
  });
}
