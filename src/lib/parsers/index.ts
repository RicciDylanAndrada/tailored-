import { parsePDF } from './pdf';
import { parseDOCX } from './docx';
import { parseLatex } from './latex';

export type FileType = 'pdf' | 'docx' | 'latex' | 'unknown';

export function detectFileType(filename: string, mimeType?: string): FileType {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }
  if (ext === 'tex' || ext === 'latex') {
    return 'latex';
  }

  return 'unknown';
}

export async function parseResume(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<string> {
  const fileType = detectFileType(filename, mimeType);

  switch (fileType) {
    case 'pdf':
      return parsePDF(buffer);
    case 'docx':
      return parseDOCX(buffer);
    case 'latex':
      return parseLatex(buffer.toString('utf-8'));
    default:
      throw new Error(`Unsupported file type: ${filename}`);
  }
}

export { parsePDF, parseDOCX, parseLatex };
