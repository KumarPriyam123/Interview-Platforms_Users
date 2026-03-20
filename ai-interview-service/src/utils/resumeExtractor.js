export const extractTextFromBuffer = async (fileBuffer) => {
  // Keep extraction minimal and dependency-light; can be extended to PDF/DOCX parsers.
  return Buffer.from(fileBuffer).toString("utf-8");
};
