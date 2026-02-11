import { NextRequest, NextResponse } from 'next/server';
import { scrapeJobPosting } from '@/lib/scraper';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const jobData = await scrapeJobPosting(url);

    return NextResponse.json({
      success: true,
      ...jobData,
    });
  } catch (error) {
    console.error('Error scraping job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape job posting' },
      { status: 500 }
    );
  }
}
