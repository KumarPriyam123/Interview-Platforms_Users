import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export const extractTextFromBuffer = async (fileBuffer, mimetype) => {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Empty file buffer");
  }

  // PDF parsing
  if (mimetype === "application/pdf" || !mimetype) {
    try {
      const pdfData = await pdfParse(Buffer.from(fileBuffer));
      return pdfData.text || "";
    } catch (_error) {
      // Fall back to raw text extraction if PDF parse fails
      return Buffer.from(fileBuffer).toString("utf-8");
    }
  }

  // DOCX — basic text extraction (strips XML tags)
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword"
  ) {
    const raw = Buffer.from(fileBuffer).toString("utf-8");
    return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  // Fallback: plain text
  return Buffer.from(fileBuffer).toString("utf-8");
};
