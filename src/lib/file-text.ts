/**
 * Extracción de texto en el navegador desde Word (.docx), PDF, Excel/CSV y
 * texto plano. Se usa para importar casos clínicos y preguntas.
 */

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (name.endsWith(".doc")) {
    throw new Error("Word .doc antiguo no se puede leer en la web. Convierte el archivo a .docx o pega el texto extraído.");
  }

  if (name.endsWith(".docx") || type.includes("wordprocessingml")) {
    const mammoth: any = await import(/* @vite-ignore */ "mammoth/mammoth.browser" as string);
    const buf = await file.arrayBuffer();
    const res = await (mammoth as any).extractRawText({ arrayBuffer: buf });
    return res.value as string;
  }

  if (name.endsWith(".pdf") || type === "application/pdf") {
    const pdfjs: any = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const doc = await pdfjs.getDocument({
      data: await file.arrayBuffer(),
      useWorkerFetch: false,
      isEvalSupported: false,
    }).promise;
    const parts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      parts.push(content.items.map((it: any) => it.str).join(" "));
    }
    return parts.join("\n\n");
  }

  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv") ||
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type === "text/csv"
  ) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    return wb.SheetNames.map(
      (sheet) => `### ${sheet}\n${XLSX.utils.sheet_to_csv(wb.Sheets[sheet])}`,
    ).join("\n\n");
  }

  if (
    type.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".json") ||
    name.endsWith(".html") ||
    name.endsWith(".htm") ||
    name.endsWith(".xml") ||
    name.endsWith(".srt") ||
    name.endsWith(".vtt") ||
    name.endsWith(".rtf")
  ) {
    return await file.text();
  }

  throw new Error("Formato no compatible para extracción automática. Puedes crear una fuente editable y pegar el contenido manualmente.");
}

export async function extractTextFromFiles(files: File[]): Promise<string> {
  const chunks: string[] = [];
  for (const f of files) {
    try {
      chunks.push(`===== ${f.name} =====\n${await extractTextFromFile(f)}`);
    } catch (e: any) {
      chunks.push(`===== ${f.name} (no legible: ${e?.message ?? "error"}) =====`);
    }
  }
  return chunks.join("\n\n");
}
