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
