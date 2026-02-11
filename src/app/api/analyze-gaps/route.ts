// src/app/api/analyze-gaps/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { GapAnalysisResult } from '@/lib/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { resumeContent, jobDescription, jobTitle, company } = await request.json();

    if (!resumeContent || !jobDescription) {
      return NextResponse.json(
        { error: 'Resume content and job description are required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert career coach analyzing a resume against a job posting to identify skill gaps.

Your task:
1. Extract ALL requirements from the job posting (skills, technologies, responsibilities, qualifications)
2. Identify which requirements are ALREADY demonstrated in the resume
3. Identify 3-5 MOST IMPORTANT gaps (skills/experiences in job but not clearly in resume)
4. Prioritize gaps by importance for getting past ATS and impressing recruiters

For each gap, create a friendly question asking if the candidate has related experience.

CRITICAL: Only identify genuine gaps. If the resume shows equivalent experience with different terminology, that's NOT a gap.

Return JSON:
{
  "gaps": [
    {
      "id": "gap-1",
      "skill": "Kubernetes",
      "context": "Job requires container orchestration for their microservices architecture",
      "question": "Have you worked with Kubernetes or similar container orchestration tools (Docker Swarm, ECS, etc.)?",
      "priority": "high"
    }
  ],
  "matchedSkills": ["Python", "AWS", "CI/CD"],
  "jobRequirements": ["Kubernetes", "Python", "AWS", "CI/CD", "Team Leadership"]
}`;

    const userPrompt = `Analyze this resume against the job posting.

JOB: ${jobTitle} at ${company}

JOB DESCRIPTION:
${jobDescription}

---

RESUME:
${resumeContent}

Return ONLY valid JSON, no explanation.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Extract JSON from response
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const result = JSON.parse(jsonStr.trim()) as GapAnalysisResult;

    // Limit to 5 gaps max, sorted by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    result.gaps = result.gaps
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 5);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error analyzing gaps:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze gaps' },
      { status: 500 }
    );
  }
}
