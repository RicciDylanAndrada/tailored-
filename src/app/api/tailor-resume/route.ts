import { NextRequest, NextResponse } from 'next/server';
import { tailorResume } from '@/lib/claude';

export async function POST(request: NextRequest) {
  try {
    const { resumeContent, jobDescription, jobTitle, company, gapAnswers } = await request.json();

    if (!resumeContent) {
      return NextResponse.json(
        { error: 'No resume content provided' },
        { status: 400 }
      );
    }

    if (!jobDescription) {
      return NextResponse.json(
        { error: 'No job description provided' },
        { status: 400 }
      );
    }

    const result = await tailorResume(
      resumeContent,
      jobDescription,
      jobTitle || 'Position',
      company || 'Company',
      gapAnswers || []
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error tailoring resume:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to tailor resume' },
      { status: 500 }
    );
  }
}
