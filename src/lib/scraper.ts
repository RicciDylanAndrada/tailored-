import * as cheerio from 'cheerio';

interface JobDescription {
  title: string;
  company: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  rawText: string;
}

export async function scrapeJobPosting(url: string): Promise<JobDescription> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style elements
    $('script, style, nav, footer, header').remove();

    // Try to extract structured data
    let title = '';
    let company = '';
    let description = '';
    const requirements: string[] = [];
    const responsibilities: string[] = [];

    // LinkedIn specific selectors
    if (url.includes('linkedin.com')) {
      title = $('.job-details-jobs-unified-top-card__job-title').text().trim() ||
              $('h1.t-24').text().trim() ||
              $('h1').first().text().trim();
      company = $('.job-details-jobs-unified-top-card__company-name').text().trim() ||
                $('.topcard__org-name-link').text().trim();
      description = $('.jobs-description__content').text().trim() ||
                   $('.description__text').text().trim();
    }
    // Indeed specific selectors
    else if (url.includes('indeed.com')) {
      title = $('h1.jobsearch-JobInfoHeader-title').text().trim() ||
              $('[data-testid="jobsearch-JobInfoHeader-title"]').text().trim();
      company = $('[data-testid="inlineHeader-companyName"]').text().trim() ||
                $('.jobsearch-InlineCompanyRating-companyHeader').text().trim();
      description = $('#jobDescriptionText').text().trim();
    }
    // Greenhouse specific selectors
    else if (url.includes('greenhouse.io') || url.includes('boards.greenhouse.io')) {
      title = $('h1.app-title').text().trim() ||
              $('.job-title').text().trim();
      company = $('.company-name').text().trim();
      description = $('#content').text().trim();
    }
    // Lever specific selectors
    else if (url.includes('lever.co') || url.includes('jobs.lever.co')) {
      title = $('h2.posting-headline').text().trim() ||
              $('.posting-headline h2').text().trim();
      company = $('[data-qa="company-name"]').text().trim();
      description = $('[data-qa="job-description"]').text().trim() ||
                   $('.posting-page').text().trim();
    }
    // Generic fallback
    else {
      // Try common selectors
      title = $('h1').first().text().trim() ||
              $('[class*="title"]').first().text().trim();
      company = $('[class*="company"]').first().text().trim();

      // Get main content
      const mainContent = $('main, article, [role="main"], .content, #content').first();
      description = mainContent.length ? mainContent.text().trim() : $('body').text().trim();
    }

    // Extract bullet points as requirements/responsibilities
    $('li').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 10 && text.length < 500) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('require') || lowerText.includes('must have') ||
            lowerText.includes('qualification') || lowerText.includes('experience with')) {
          requirements.push(text);
        } else if (lowerText.includes('responsib') || lowerText.includes('will ') ||
                   lowerText.includes('you will') || lowerText.includes('duties')) {
          responsibilities.push(text);
        }
      }
    });

    // Get raw text for fallback
    const rawText = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000); // Limit to 10k characters

    return {
      title: title || 'Job Position',
      company: company || 'Company',
      description: description || rawText,
      requirements: requirements.slice(0, 20),
      responsibilities: responsibilities.slice(0, 20),
      rawText,
    };
  } catch (error) {
    console.error('Error scraping job posting:', error);
    throw new Error(`Failed to scrape job posting: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
