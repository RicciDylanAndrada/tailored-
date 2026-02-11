'use client';

import { useState } from 'react';
import { FileText, Sparkles, Download, Loader2 } from 'lucide-react';
import { FileUpload } from '@/components/file-upload';
import { JobUrlInput } from '@/components/job-url-input';
import { TailoredResults } from '@/components/tailored-results';
import { GapAnalysisFlow } from '@/components/gap-analysis-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import type { GapAnswer, JobData, TailoredData } from '@/lib/types';

export default function Home() {
  const [resumeContent, setResumeContent] = useState<string>('');
  const [resumeFilename, setResumeFilename] = useState<string>('');
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [tailoredData, setTailoredData] = useState<TailoredData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showGapAnalysis, setShowGapAnalysis] = useState(false);
  const [gapAnswers, setGapAnswers] = useState<GapAnswer[]>([]);

  const handleFileProcessed = (content: string, filename: string) => {
    setResumeContent(content);
    setResumeFilename(filename);
    setTailoredData(null);
    toast.success('Resume uploaded successfully!');
  };

  const handleJobDataLoaded = (data: JobData) => {
    setJobData(data);
    setTailoredData(null);
    setGapAnswers([]);
    setShowGapAnalysis(true);
    toast.success(`Job posting loaded: ${data.title} at ${data.company}`);
  };

  const handleGapAnalysisComplete = (answers: GapAnswer[]) => {
    setGapAnswers(answers);
    setShowGapAnalysis(false);
    toast.success('Gap analysis complete! Ready to tailor your resume.');
  };

  const handleGapAnalysisSkip = () => {
    setShowGapAnalysis(false);
    setGapAnswers([]);
  };

  const handleTailorResume = async () => {
    if (!resumeContent || !jobData) {
      toast.error('Please upload a resume and provide a job posting first.');
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      setProgress(30);

      const response = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeContent,
          jobDescription: jobData.description || jobData.rawText,
          jobTitle: jobData.title,
          company: jobData.company,
          gapAnswers,
        }),
      });

      setProgress(70);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to tailor resume');
      }

      setProgress(100);
      setTailoredData({
        sections: data.sections,
        summary: data.summary,
        keyMatches: data.keyMatches,
      });

      toast.success('Resume tailored successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to tailor resume');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleBulletEdit = (sectionIndex: number, bulletIndex: number, newValue: string) => {
    if (!tailoredData) return;

    const newSections = [...tailoredData.sections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      tailoredBullets: [
        ...newSections[sectionIndex].tailoredBullets.slice(0, bulletIndex),
        newValue,
        ...newSections[sectionIndex].tailoredBullets.slice(bulletIndex + 1),
      ],
    };

    setTailoredData({
      ...tailoredData,
      sections: newSections,
    });
  };

  const handleDownloadPDF = async () => {
    if (!tailoredData) return;

    setIsDownloading(true);

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: tailoredData.sections }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tailored-resume-${jobData?.company?.replace(/\s+/g, '-').toLowerCase() || 'custom'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const canTailor = resumeContent && jobData && !isProcessing;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Resume Tailor
          </h1>
          <p className="text-muted-foreground text-lg">
            Customize your resume bullet points to match any job posting
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-6">
          {/* Step 1: Upload Resume */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Step 1: Upload Your Resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                onFileProcessed={handleFileProcessed}
                isLoading={isProcessing}
              />
              {resumeFilename && (
                <p className="text-sm text-muted-foreground mt-2">
                  Uploaded: {resumeFilename}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Job Posting */}
          <div className={!resumeContent ? 'opacity-50 pointer-events-none' : ''}>
            <JobUrlInput
              onJobDataLoaded={handleJobDataLoaded}
              isDisabled={!resumeContent || isProcessing}
            />
            {jobData && (
              <Card className="mt-4">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">{jobData.title}</h3>
                      <p className="text-sm text-muted-foreground">{jobData.company}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Loaded
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

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

          {/* Step 3: Tailor Button */}
          <Card className={(!canTailor && !isProcessing) || showGapAnalysis ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Step 3: Tailor Your Resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleTailorResume}
                disabled={!canTailor}
                size="lg"
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Tailoring Resume...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Tailor My Resume
                  </>
                )}
              </Button>
              {isProcessing && (
                <Progress value={progress} className="mt-4" />
              )}
              <p className="text-xs text-muted-foreground mt-2 text-center">
                AI will reword your bullet points using only your existing experience
              </p>
            </CardContent>
          </Card>

          {/* Results */}
          {tailoredData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Tailored Results</h2>
                <Button onClick={handleDownloadPDF} disabled={isDownloading}>
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download PDF
                </Button>
              </div>
              <TailoredResults
                sections={tailoredData.sections}
                summary={tailoredData.summary}
                keyMatches={tailoredData.keyMatches}
                onBulletEdit={handleBulletEdit}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground mt-12 pb-8">
          <p>
            Your resume data is processed securely and never stored.
          </p>
        </footer>
      </div>
    </main>
  );
}
