import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const MAX_CV_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_CV_EXTENSIONS = [".pdf", ".docx", ".txt"];

export class CvParseError extends Error {}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractCvText(file: File): Promise<string> {
  if (file.size > MAX_CV_FILE_BYTES) {
    throw new CvParseError("CV file is too large. Please upload a file under 5MB.");
  }

  const extension = getExtension(file.name);
  if (!ACCEPTED_CV_EXTENSIONS.includes(extension)) {
    throw new CvParseError("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let text: string;
  try {
    if (extension === ".pdf") {
      text = await extractPdfText(buffer);
    } else if (extension === ".docx") {
      text = await extractDocxText(buffer);
    } else {
      text = buffer.toString("utf-8");
    }
  } catch {
    throw new CvParseError(
      "Couldn't read that file. It may be corrupted, password-protected, or an unsupported format."
    );
  }

  const trimmed = text.trim();
  if (trimmed.length < 50) {
    throw new CvParseError(
      "Couldn't find readable text in that file. If it's a scanned image PDF, try uploading a text-based PDF or DOCX instead."
    );
  }

  return trimmed;
}
