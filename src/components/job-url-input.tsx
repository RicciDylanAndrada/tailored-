'use client';

import { useState } from 'react';
import { Link2, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface JobData {
  title: string;
  company: string;
  description: string;
  rawText: string;
}

interface JobUrlInputProps {
  onJobDataLoaded: (data: JobData) => void;
  isDisabled?: boolean;
}

export function JobUrlInput({ onJobDataLoaded, isDisabled }: JobUrlInputProps) {
  const [url, setUrl] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('url');

  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setError(null);
    setLoading(true);
    setSuccess(false);

    try {
      const response = await fetch('/api/scrape-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape job posting');
      }

      setSuccess(true);
      onJobDataLoaded({
        title: data.title,
        company: data.company,
        description: data.description || data.rawText,
        rawText: data.rawText,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job posting');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setError(null);
    setSuccess(true);
    onJobDataLoaded({
      title: manualTitle.trim() || 'Job Position',
      company: manualCompany.trim() || 'Company',
      description: manualDescription.trim(),
      rawText: manualDescription.trim(),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Job Posting
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">From URL</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Paste LinkedIn, Indeed, or other job URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading || isDisabled}
              />
              <Button
                onClick={handleUrlSubmit}
                disabled={loading || isDisabled || !url.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  'Fetch'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports LinkedIn, Indeed, Greenhouse, Lever, and most job posting sites
            </p>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Job Title"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                disabled={isDisabled}
              />
              <Input
                placeholder="Company Name"
                value={manualCompany}
                onChange={(e) => setManualCompany(e.target.value)}
                disabled={isDisabled}
              />
            </div>
            <Textarea
              placeholder="Paste the job description here..."
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
              rows={6}
              disabled={isDisabled}
            />
            <Button
              onClick={handleManualSubmit}
              disabled={isDisabled || !manualDescription.trim()}
              className="w-full"
            >
              {success ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Job Description Loaded
                </>
              ) : (
                'Use This Job Description'
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-sm text-destructive mt-4">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
