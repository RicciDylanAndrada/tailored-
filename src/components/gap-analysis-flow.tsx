'use client';

import { useState, useEffect } from 'react';
import { Loader2, Brain, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GapQuestionCard } from '@/components/gap-question-card';
import type { GapAnswer, GapAnalysisResult, JobData } from '@/lib/types';

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
  useEffect(() => {
    analyzeGaps();
  }, []);

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
            Your resume already covers the key requirements. Let&apos;s tailor it!
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
          key={currentQuestion.id}
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
