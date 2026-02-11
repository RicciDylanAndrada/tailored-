'use client';

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Section } from '@/lib/types';

interface TailoredResultsProps {
  sections: Section[];
  summary: string;
  keyMatches: string[];
  onBulletEdit: (sectionIndex: number, bulletIndex: number, newValue: string) => void;
}

export function TailoredResults({
  sections,
  summary,
  keyMatches,
  onBulletEdit,
}: TailoredResultsProps) {
  const [copiedSection, setCopiedSection] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections.map((_, i) => i))
  );
  const [editingBullet, setEditingBullet] = useState<{
    section: number;
    bullet: number;
  } | null>(null);

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const copySection = async (sectionIndex: number) => {
    const section = sections[sectionIndex];
    const text = section.tailoredBullets.map((b) => `• ${b}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedSection(sectionIndex);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const copyAll = async () => {
    const text = sections
      .map((s) => `${s.title}\n${s.tailoredBullets.map((b) => `• ${b}`).join('\n')}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopiedSection(-1);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tailoring Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{summary}</p>
          {keyMatches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Key Matches:</span>
              {keyMatches.map((match, i) => (
                <Badge key={i} variant="secondary">
                  {match}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Copy All Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={copyAll}>
          {copiedSection === -1 ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied All!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy All Tailored Bullets
            </>
          )}
        </Button>
      </div>

      {/* Sections */}
      {sections.map((section, sectionIndex) => (
        <Card key={sectionIndex}>
          <CardHeader
            className="cursor-pointer"
            onClick={() => toggleSection(sectionIndex)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{section.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    copySection(sectionIndex);
                  }}
                >
                  {copiedSection === sectionIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                {expandedSections.has(sectionIndex) ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </div>
          </CardHeader>
          {expandedSections.has(sectionIndex) && (
            <CardContent>
              <div className="space-y-4">
                {section.tailoredBullets.map((bullet, bulletIndex) => (
                  <div key={bulletIndex} className="space-y-2">
                    {/* Original */}
                    <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-xs uppercase tracking-wide">
                          Original:
                        </span>
                        {section.aiRecommendations?.[bulletIndex] === 'original' && (
                          <Badge className="bg-blue-600 text-xs">AI Recommends</Badge>
                        )}
                      </div>
                      <span>{section.originalBullets[bulletIndex] || 'N/A'}</span>
                    </div>

                    {/* Tailored (editable) */}
                    <div
                      className={cn(
                        'p-3 rounded-md border-2 transition-colors',
                        editingBullet?.section === sectionIndex &&
                          editingBullet?.bullet === bulletIndex
                          ? 'border-primary'
                          : 'border-green-200 bg-green-50'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-xs uppercase tracking-wide text-green-700">
                          Tailored:
                        </span>
                        {section.aiRecommendations?.[bulletIndex] === 'tailored' && (
                          <Badge className="bg-green-600 text-xs">AI Recommends</Badge>
                        )}
                      </div>
                      {editingBullet?.section === sectionIndex &&
                      editingBullet?.bullet === bulletIndex ? (
                        <Textarea
                          value={bullet}
                          onChange={(e) =>
                            onBulletEdit(sectionIndex, bulletIndex, e.target.value)
                          }
                          onBlur={() => setEditingBullet(null)}
                          autoFocus
                          rows={3}
                          className="mt-1"
                        />
                      ) : (
                        <p
                          className="text-sm cursor-pointer hover:bg-green-100 rounded p-1 -m-1 transition-colors"
                          onClick={() =>
                            setEditingBullet({ section: sectionIndex, bullet: bulletIndex })
                          }
                          title="Click to edit"
                        >
                          {bullet}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
