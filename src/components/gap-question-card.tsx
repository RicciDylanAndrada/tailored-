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
              No, I don&apos;t
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
                  No problem! Here&apos;s my strategy:
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  I&apos;ll emphasize your transferable skills and existing experience that demonstrate
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
