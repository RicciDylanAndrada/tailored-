import { NextRequest, NextResponse } from 'next/server';
import { parseResume } from '@/lib/parsers';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const text = await parseResume(buffer, file.name, file.type);

    return NextResponse.json({
      success: true,
      content: text,
      filename: file.name,
      fileType: file.type,
    });
  } catch (error) {
    console.error('Error parsing resume:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse resume' },
      { status: 500 }
    );
  }
}
