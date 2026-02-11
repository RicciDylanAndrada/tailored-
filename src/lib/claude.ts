import Groq from 'groq-sdk';
import { GapAnswer } from '@/lib/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface TailoredResume {
  sections: {
    title: string;
    originalBullets: string[];
    tailoredBullets: string[];
    aiRecommendations?: ('original' | 'tailored')[];
  }[];
  summary: string;
  keyMatches: string[];
}

export async function tailorResume(
  resumeContent: string,
  jobDescription: string,
  jobTitle: string,
  company: string,
  gapAnswers: GapAnswer[] = []
): Promise<TailoredResume> {
  const systemPrompt = `You are an expert resume writer and career coach. Your task is to reword resume bullet points to better align with a specific job posting using professional resume best practices.

CRITICAL RULES:
1. You may ONLY use information that exists in the original resume
2. DO NOT fabricate, invent, or add any new experiences, skills, or achievements
3. You may reword, rephrase, and emphasize existing information to better match the job
4. You may reorder bullet points to prioritize the most relevant ones
5. You may use keywords from the job posting IF they accurately describe existing experience
6. Maintain truthfulness - if someone has "Python" experience, don't upgrade it to "Expert Python" unless the resume says so

═══════════════════════════════════════════════════════════════
RESUME BEST PRACTICES - USE THESE TECHNIQUES:
═══════════════════════════════════════════════════════════════

XYZ FORMULA (Google's recommended format):
"Accomplished [X] as measured by [Y], by doing [Z]"
- X = What you accomplished (the result/impact)
- Y = How it was measured (metrics, numbers, percentages)
- Z = How you did it (the action/method)
Example: "Reduced page load time by 40% (Y) by implementing lazy loading and code splitting (Z), improving user retention (X)"

CAR METHOD (Challenge-Action-Result):
- Challenge: What problem or situation did you face?
- Action: What specific actions did you take?
- Result: What was the measurable outcome?
Example: "Faced with 50% customer churn, implemented automated onboarding email sequence, reducing churn to 25%"

STRONG ACTION VERBS - Start every bullet with one:
- Leadership: Spearheaded, Directed, Orchestrated, Championed, Pioneered
- Achievement: Achieved, Exceeded, Delivered, Accomplished, Attained
- Creation: Developed, Built, Designed, Engineered, Architected, Created
- Improvement: Optimized, Enhanced, Streamlined, Accelerated, Transformed
- Analysis: Analyzed, Evaluated, Identified, Diagnosed, Assessed
- Collaboration: Collaborated, Partnered, Coordinated, Facilitated, Led

WORDS TO AVOID (replace with stronger alternatives):
- "Helped" → "Enabled", "Facilitated", "Drove"
- "Worked on" → "Developed", "Implemented", "Executed"
- "Responsible for" → "Managed", "Directed", "Oversaw"
- "Assisted" → "Supported", "Contributed to", "Partnered with"
- "Was part of" → "Collaborated on", "Contributed to"
- "Various" or "Multiple" → Use specific numbers

QUANTIFY EVERYTHING POSSIBLE:
- Team size: "Led a team of 5 engineers"
- Scale: "Processed 1M+ transactions daily"
- Speed: "Reduced deployment time from 2 hours to 15 minutes"
- Money: "Generated $500K in new revenue"
- Percentages: "Improved test coverage by 35%"
- Time saved: "Automated process saving 10 hours/week"

═══════════════════════════════════════════════════════════════
METRICS & QUANTIFIABLE RESULTS (CRITICAL):
═══════════════════════════════════════════════════════════════
- ALWAYS preserve ALL metrics, numbers, percentages, dollar amounts, timeframes from original bullets
- If a metric exists, it MUST appear in the tailored version - these are your strongest proof points
- Position metrics prominently - they catch recruiters' attention

SKILLS & TECHNOLOGY MAPPING:
- Identify skills mentioned in BOTH the resume AND job requirements
- Use EXACT terminology from the job posting when candidate has equivalent experience
- Example: Job says "CI/CD pipelines" and resume says "automated deployments" → use "CI/CD pipelines"

PROJECT & EXPERIENCE ALIGNMENT:
- Map projects to specific job requirements
- Highlight leadership, collaboration, or ownership when job emphasizes those
- Connect technical implementations to business outcomes

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "sections": [
    {
      "title": "Section Name (e.g., Experience, Projects, Skills)",
      "originalBullets": ["original bullet 1", "original bullet 2"],
      "tailoredBullets": ["reworded bullet 1", "reworded bullet 2"],
      "aiRecommendations": ["tailored", "original", "tailored"] // Which version AI recommends per bullet
    }
  ],
  "summary": "A brief 2-3 sentence summary of how the resume was tailored",
  "keyMatches": ["skill or keyword that matches between resume and job"]
}`;

  const gapContext = gapAnswers.length > 0 ? `
---

USER-PROVIDED ADDITIONAL CONTEXT:
The candidate has provided additional information about their experience:

${gapAnswers
  .filter(a => a.hasExperience && a.userResponse)
  .map(a => `- ${a.skill}: ${a.userResponse}`)
  .join('\n')}

${gapAnswers
  .filter(a => !a.hasExperience)
  .map(a => `- ${a.skill}: Candidate does not have direct experience. Emphasize transferable skills.`)
  .join('\n')}

IMPORTANT: Weave the user-provided experience into relevant existing bullet points naturally. Do not create new sections.
` : '';

  const userPrompt = `Please tailor this resume for the following job posting.

JOB DETAILS:
Position: ${jobTitle}
Company: ${company}

JOB DESCRIPTION:
${jobDescription}

---
${gapContext}
ORIGINAL RESUME:
${resumeContent}

---

INSTRUCTIONS:
1. First, identify the KEY REQUIREMENTS from the job description (skills, technologies, responsibilities, qualifications)
2. Scan the resume for experiences, projects, and skills that map to those requirements
3. For each bullet point, apply resume best practices:
   - Use XYZ formula when possible: "Accomplished [X] as measured by [Y], by doing [Z]"
   - Or use CAR method: Challenge → Action → Result
   - Start with a STRONG ACTION VERB (never "helped", "worked on", "responsible for")
   - PRESERVE all metrics, numbers, percentages - position them prominently
   - Use exact keywords from job posting where experience matches
4. Prioritize bullets that best demonstrate required skills
5. Ensure each bullet shows IMPACT, not just duties

Return ONLY the JSON object, no additional text or explanation.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const result = JSON.parse(jsonStr.trim()) as TailoredResume;
    return result;
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw new Error(`Failed to tailor resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
