# Interactive Gap Analysis Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an interactive gap analysis step where AI identifies missing skills/experiences from job descriptions, asks users about related experience, and incorporates answers into tailored resumes.

**Architecture:** New Step 2.5 between job loading and tailoring. A card-based Q&A component presents 3-5 gap questions one at a time. User responses are stored and passed to an enhanced tailoring API that weaves new info into existing bullets. Results show side-by-side comparison with AI recommendations.

**Tech Stack:** Next.js 14, React, TypeScript, Groq API (llama-3.3-70b), Tailwind CSS, shadcn/ui components

---

## Task 1: Create Gap Analysis Types

**Files:**
- Create: `src/lib/types.ts`

**Step 1: Create the types file with all shared interfaces**

```typescript
// src/lib/types.ts

export interface GapQuestion {
  id: string;
  skill: string;
  context: string; // Why this skill matters for the job
  question: string; // The actual question to ask user
  priority: 'high' | 'medium' | 'low';
}

export interface GapAnswer {
  questionId: string;
  skill: string;
  hasExperience: boolean;
  userResponse: string | null; // User's description of their experience
  compensationStrategy: string | null; // How AI will compensate if no experience
}

export interface GapAnalysisResult {
  gaps: GapQuestion[];
  matchedSkills: string[]; // Skills already present in resume
  jobRequirements: string[]; // All identified requirements
}

export interface Section {
  title: string;
  originalBullets: string[];
  tailoredBullets: string[];
  aiRecommendations?: ('original' | 'tailored')[]; // Which version AI recommends per bullet
}

export interface JobData {
  title: string;
  company: string;
  description: string;
  rawText: string;
}

export interface TailoredData {
  sections: Section[];
  summary: string;
  keyMatches: string[];
}
```

**Step 2: Verify the file was created correctly**

Run: `cat src/lib/types.ts | head -20`
Expected: Shows the interface definitions

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared types for gap analysis feature"
```

---

## Task 2: Create Gap Analysis API Endpoint

**Files:**
- Create: `src/app/api/analyze-gaps/route.ts`

**Step 1: Create the API route**

```typescript
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
```

**Step 2: Verify the API route compiles**

Run: `cd /Users/dylanandrada/Desktop/Projects/resumeMake && npx tsc --noEmit src/app/api/analyze-gaps/route.ts 2>&1 || echo "Check for errors"`
Expected: No errors or only unrelated warnings

**Step 3: Commit**

```bash
git add src/app/api/analyze-gaps/route.ts
git commit -m "feat: add gap analysis API endpoint"
```

---

## Task 3: Create Gap Question Card Component

**Files:**
- Create: `src/components/gap-question-card.tsx`

**Step 1: Create the component**

```typescript
// src/components/gap-question-card.tsx
'use client';

import { useState } from 'react';
import { HelpCircle, CheckCircle, XCircle, ArrowRight, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { GapQuestion, GapAnswer } from '@/lib/types';

interface GapQuestionCardProps {
  question: GapQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: GapAnswer) => void;
  isLoading?: boolean;
}

export function GapQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  isLoading,
}: GapQuestionCardProps) {
  const [hasExperience, setHasExperience] = useState<boolean | null>(null);
  const [userResponse, setUserResponse] = useState('');
  const [showCompensation, setShowCompensation] = useState(false);

  const handleYes = () => {
    setHasExperience(true);
    setShowCompensation(false);
  };

  const handleNo = () => {
    setHasExperience(false);
    setShowCompensation(true);
  };

  const handleSubmit = () => {
    onAnswer({
      questionId: question.id,
      skill: question.skill,
      hasExperience: hasExperience === true,
      userResponse: hasExperience ? userResponse : null,
      compensationStrategy: hasExperience ? null : `Emphasize transferable skills related to ${question.skill}`,
    });
  };

  const canSubmit = hasExperience === false || (hasExperience === true && userResponse.trim().length > 0);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline">
            Question {questionNumber} of {totalQuestions}
          </Badge>
          <Badge
            variant={question.priority === 'high' ? 'destructive' : question.priority === 'medium' ? 'default' : 'secondary'}
          >
            {question.priority} priority
          </Badge>
        </div>
        <CardTitle className="text-xl flex items-start gap-3">
          <HelpCircle className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <span>{question.question}</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2 ml-9">
          {question.context}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasExperience === null && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={handleYes}
              disabled={isLoading}
            >
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Yes, I have experience
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={handleNo}
              disabled={isLoading}
            >
              <XCircle className="h-5 w-5 mr-2 text-muted-foreground" />
              No, I don't
            </Button>
          </div>
        )}

        {hasExperience === true && (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              Great! Briefly describe your experience with {question.skill}:
            </p>
            <Textarea
              placeholder={`e.g., "I used ${question.skill} at my previous job to..."`}
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              This will be woven into your existing experience bullets.
            </p>
          </div>
        )}

        {showCompensation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  No problem! Here's my strategy:
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  I'll emphasize your transferable skills and existing experience that demonstrate
                  similar capabilities. Your resume will still be optimized for this role.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasExperience !== null && (
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setHasExperience(null);
                setUserResponse('');
                setShowCompensation(false);
              }}
              disabled={isLoading}
            >
              Change answer
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!canSubmit || isLoading}
            >
              {questionNumber === totalQuestions ? 'Finish & Tailor Resume' : 'Next Question'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify the component compiles**

Run: `cd /Users/dylanandrada/Desktop/Projects/resumeMake && npx tsc --noEmit src/components/gap-question-card.tsx 2>&1 || echo "Check for errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/gap-question-card.tsx
git commit -m "feat: add gap question card component"
```

---

## Task 4: Create Gap Analysis Flow Component

**Files:**
- Create: `src/components/gap-analysis-flow.tsx`

**Step 1: Create the flow component**

```typescript
// src/components/gap-analysis-flow.tsx
'use client';

import { useState } from 'react';
import { Loader2, Brain, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GapQuestionCard } from '@/components/gap-question-card';
import type { GapQuestion, GapAnswer, GapAnalysisResult, JobData } from '@/lib/types';

interface GapAnalysisFlowProps {
  resumeContent: string;
  jobData: JobData;
  onComplete: (answers: GapAnswer[]) => void;
  onSkip: () => void;
}

type FlowState = 'analyzing' | 'questions' | 'complete' | 'error' | 'no-gaps';

export function GapAnalysisFlow({
  resumeContent,
  jobData,
  onComplete,
  onSkip,
}: GapAnalysisFlowProps) {
  const [flowState, setFlowState] = useState<FlowState>('analyzing');
  const [analysisResult, setAnalysisResult] = useState<GapAnalysisResult | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<GapAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Start analysis on mount
  useState(() => {
    analyzeGaps();
  });

  const analyzeGaps = async () => {
    setFlowState('analyzing');
    setError(null);

    try {
      const response = await fetch('/api/analyze-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeContent,
          jobDescription: jobData.description || jobData.rawText,
          jobTitle: jobData.title,
          company: jobData.company,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze gaps');
      }

      setAnalysisResult(data);

      if (data.gaps.length === 0) {
        setFlowState('no-gaps');
      } else {
        setFlowState('questions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setFlowState('error');
    }
  };

  const handleAnswer = (answer: GapAnswer) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentQuestionIndex < (analysisResult?.gaps.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setFlowState('complete');
      onComplete(newAnswers);
    }
  };

  const progress = analysisResult?.gaps.length
    ? ((currentQuestionIndex + 1) / analysisResult.gaps.length) * 100
    : 0;

  if (flowState === 'analyzing') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h3 className="text-lg font-semibold mt-4">Analyzing Your Resume</h3>
          <p className="text-muted-foreground mt-2">
            Comparing your experience against the job requirements...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (flowState === 'error') {
    return (
      <Card className="w-full max-w-2xl mx-auto border-destructive">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold mt-4">Analysis Failed</h3>
          <p className="text-muted-foreground mt-2">{error}</p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="outline" onClick={onSkip}>
              Skip Gap Analysis
            </Button>
            <Button onClick={analyzeGaps}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (flowState === 'no-gaps') {
    return (
      <Card className="w-full max-w-2xl mx-auto border-green-500">
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
          <h3 className="text-lg font-semibold mt-4">Great Match!</h3>
          <p className="text-muted-foreground mt-2">
            Your resume already covers the key requirements. Let's tailor it!
          </p>
          {analysisResult && analysisResult.matchedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {analysisResult.matchedSkills.slice(0, 8).map((skill, i) => (
                <Badge key={i} variant="secondary">{skill}</Badge>
              ))}
            </div>
          )}
          <Button className="mt-6" onClick={() => onComplete([])}>
            Continue to Tailoring
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (flowState === 'questions' && analysisResult) {
    const currentQuestion = analysisResult.gaps[currentQuestionIndex];

    return (
      <div className="space-y-4">
        {/* Progress Header */}
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Gap Analysis
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onSkip}>
                Skip
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{answers.length} answered</span>
              <span>{analysisResult.gaps.length - answers.length} remaining</span>
            </div>
          </CardContent>
        </Card>

        {/* Matched Skills Summary */}
        {analysisResult.matchedSkills.length > 0 && currentQuestionIndex === 0 && (
          <Card className="w-full max-w-2xl mx-auto bg-green-50 border-green-200">
            <CardContent className="py-3">
              <p className="text-sm text-green-800">
                <CheckCircle2 className="h-4 w-4 inline mr-2" />
                Already matched: {analysisResult.matchedSkills.slice(0, 5).join(', ')}
                {analysisResult.matchedSkills.length > 5 && ` +${analysisResult.matchedSkills.length - 5} more`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Question Card */}
        <GapQuestionCard
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={analysisResult.gaps.length}
          onAnswer={handleAnswer}
        />
      </div>
    );
  }

  return null;
}
```

**Step 2: Fix the useState initialization issue**

The code above has a bug - using `useState` as an effect. Update the component to use `useEffect`:

```typescript
// At the top of the component, replace:
// useState(() => { analyzeGaps(); });
// With:
import { useState, useEffect } from 'react';

// Then add:
useEffect(() => {
  analyzeGaps();
}, []);
```

**Step 3: Verify the component compiles**

Run: `cd /Users/dylanandrada/Desktop/Projects/resumeMake && npx tsc --noEmit src/components/gap-analysis-flow.tsx 2>&1 || echo "Check for errors"`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/gap-analysis-flow.tsx
git commit -m "feat: add gap analysis flow component"
```

---

## Task 5: Update Tailor Resume API to Accept Gap Answers

**Files:**
- Modify: `src/app/api/tailor-resume/route.ts`
- Modify: `src/lib/claude.ts`

**Step 1: Update the claude.ts tailorResume function signature**

Add `gapAnswers` parameter to the function and update the prompt:

```typescript
// In src/lib/claude.ts, update the function signature and add gap answers to prompt

import type { GapAnswer } from '@/lib/types';

export async function tailorResume(
  resumeContent: string,
  jobDescription: string,
  jobTitle: string,
  company: string,
  gapAnswers: GapAnswer[] = []
): Promise<TailoredResume> {
  // ... existing systemPrompt ...

  // Add gap answers section to userPrompt before INSTRUCTIONS:
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
${gapContext}
---

ORIGINAL RESUME:
${resumeContent}

// ... rest of existing prompt ...
`;
```

**Step 2: Update the API route to pass gap answers**

```typescript
// In src/app/api/tailor-resume/route.ts, update to accept gapAnswers:

export async function POST(request: NextRequest) {
  try {
    const { resumeContent, jobDescription, jobTitle, company, gapAnswers } = await request.json();

    // ... existing validation ...

    const result = await tailorResume(
      resumeContent,
      jobDescription,
      jobTitle || 'Position',
      company || 'Company',
      gapAnswers || []
    );

    // ... rest unchanged ...
  }
}
```

**Step 3: Add AI recommendations to the response**

Update the prompt to include recommendations for each bullet:

Add to the JSON output format in systemPrompt:
```
"aiRecommendations": ["tailored", "original", "tailored"] // Which version AI recommends per bullet
```

**Step 4: Commit**

```bash
git add src/lib/claude.ts src/app/api/tailor-resume/route.ts
git commit -m "feat: update tailor API to accept gap answers and add AI recommendations"
```

---

## Task 6: Update TailoredResults to Show AI Recommendations

**Files:**
- Modify: `src/components/tailored-results.tsx`

**Step 1: Add recommendation badges to each bullet comparison**

Update the bullet display to show AI recommendation:

```typescript
// In src/components/tailored-results.tsx, update the bullet rendering section

// Add to the tailored bullet div, after the "Tailored:" label:
{section.aiRecommendations?.[bulletIndex] === 'tailored' && (
  <Badge className="ml-2 bg-green-600">AI Recommends</Badge>
)}

// Add to the original bullet div:
{section.aiRecommendations?.[bulletIndex] === 'original' && (
  <Badge className="ml-2 bg-blue-600">AI Recommends Original</Badge>
)}
```

**Step 2: Update the Section interface import**

```typescript
// Update import at top of file:
import type { Section } from '@/lib/types';

// Remove the local Section interface definition
```

**Step 3: Commit**

```bash
git add src/components/tailored-results.tsx
git commit -m "feat: show AI recommendations on tailored results"
```

---

## Task 7: Integrate Gap Analysis into Main Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Import new components and types**

```typescript
// Add to imports:
import { GapAnalysisFlow } from '@/components/gap-analysis-flow';
import type { GapAnswer, Section, JobData, TailoredData } from '@/lib/types';
```

**Step 2: Add gap analysis state**

```typescript
// Add new state variables after existing ones:
const [showGapAnalysis, setShowGapAnalysis] = useState(false);
const [gapAnswers, setGapAnswers] = useState<GapAnswer[]>([]);
```

**Step 3: Update handleJobDataLoaded to trigger gap analysis**

```typescript
const handleJobDataLoaded = (data: JobData) => {
  setJobData(data);
  setTailoredData(null);
  setGapAnswers([]);
  setShowGapAnalysis(true); // Show gap analysis after job loads
  toast.success(`Job posting loaded: ${data.title} at ${data.company}`);
};
```

**Step 4: Add gap analysis handlers**

```typescript
const handleGapAnalysisComplete = (answers: GapAnswer[]) => {
  setGapAnswers(answers);
  setShowGapAnalysis(false);
  toast.success('Gap analysis complete! Ready to tailor your resume.');
};

const handleGapAnalysisSkip = () => {
  setShowGapAnalysis(false);
  setGapAnswers([]);
};
```

**Step 5: Update handleTailorResume to include gap answers**

```typescript
// In handleTailorResume, update the fetch body:
body: JSON.stringify({
  resumeContent,
  jobDescription: jobData.description || jobData.rawText,
  jobTitle: jobData.title,
  company: jobData.company,
  gapAnswers, // Add this
}),
```

**Step 6: Add Gap Analysis step to the UI**

Insert after the Job Posting card and before the Tailor button:

```tsx
{/* Step 2.5: Gap Analysis */}
{showGapAnalysis && resumeContent && jobData && (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold flex items-center gap-2">
      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">
        2.5
      </span>
      Quick Experience Check
    </h2>
    <GapAnalysisFlow
      resumeContent={resumeContent}
      jobData={jobData}
      onComplete={handleGapAnalysisComplete}
      onSkip={handleGapAnalysisSkip}
    />
  </div>
)}
```

**Step 7: Update Step 3 visibility condition**

```typescript
// Update the Tailor button card's className condition:
<Card className={!canTailor && !isProcessing || showGapAnalysis ? 'opacity-50 pointer-events-none' : ''}>
```

**Step 8: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate gap analysis flow into main page"
```

---

## Task 8: Manual Testing

**Step 1: Start the development server**

Run: `cd /Users/dylanandrada/Desktop/Projects/resumeMake && npm run dev`
Expected: Server starts on localhost:3000

**Step 2: Test the complete flow**

1. Upload a resume (PDF/DOCX)
2. Enter a job URL or paste job description
3. Verify gap analysis questions appear
4. Answer a few questions (both yes and no)
5. Click through to tailoring
6. Verify tailored results show AI recommendations
7. Test the skip button

**Step 3: Test edge cases**

1. Resume with no gaps (should show "Great Match!")
2. Clicking "Change answer" on a question
3. API error handling (disconnect network briefly)

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete interactive gap analysis feature"
```

---

## Summary

This plan implements:

1. **Types** (`src/lib/types.ts`) - Shared interfaces for the feature
2. **Gap Analysis API** (`src/app/api/analyze-gaps/route.ts`) - Identifies skill gaps using Groq
3. **Gap Question Card** (`src/components/gap-question-card.tsx`) - Individual question UI
4. **Gap Analysis Flow** (`src/components/gap-analysis-flow.tsx`) - Orchestrates the Q&A flow
5. **Enhanced Tailor API** - Incorporates gap answers into tailoring
6. **Updated Results** - Shows AI recommendations for each bullet
7. **Main Page Integration** - New Step 2.5 in the workflow

Total: 8 tasks with incremental commits after each.
