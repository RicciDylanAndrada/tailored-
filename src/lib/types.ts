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
