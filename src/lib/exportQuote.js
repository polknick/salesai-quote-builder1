import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/* ------------------------------------------------------------------ */
/* Renders the hidden #printable-quote node to a canvas, then either    */
/* downloads it as a PNG or wraps it in a single-page PDF. Everything   */
/* happens in the browser — no network request, no paid service.       */
/* ------------------------------------------------------------------ */

async function renderNodeToCanvas(node) {
  return html2canvas(node, {
    backgroundColor: "#0a0c0e",
    scale: 2, // sharper output for print/screen
    useCORS: true,
  });
}

function triggerDownload(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadQuoteAsPng(node, filename = "salesai-quote.png") {
  const canvas = await renderNodeToCanvas(node);
  triggerDownload(canvas.toDataURL("image/png"), filename);
}

export async function downloadQuoteAsPdf(node, filename = "salesai-quote.pdf") {
  const canvas = await renderNodeToCanvas(node);
  const imgData = canvas.toDataURL("image/png");

  // Fit the canvas onto a single portrait page sized to its own aspect ratio,
  // so the exported PDF isn't awkwardly cropped or padded.
  const pxToMm = 0.264583;
  const widthMm = canvas.width * pxToMm * 0.5; // scale:2 above, so halve back to CSS px equivalent
  const heightMm = canvas.height * pxToMm * 0.5;

  const pdf = new jsPDF({
    orientation: widthMm > heightMm ? "landscape" : "portrait",
    unit: "mm",
    format: [widthMm, heightMm],
  });
  pdf.addImage(imgData, "PNG", 0, 0, widthMm, heightMm);
  pdf.save(filename);
}
