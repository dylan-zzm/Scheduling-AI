import { z } from 'zod';

import { StageRecommendation } from './scheduler';
import { EvolinkChatMessage } from '@/shared/services/evolink-chat';

export interface InterviewPlannerInput {
  candidateName: string;
  candidateEmail: string;
  candidateTimezone: string;
  jobTitle: string;
  notes?: string;
  recommendations: StageRecommendation[];
}

export interface InterviewPlannerResult {
  summary: string;
  recruiterBrief: string;
  candidateConfirmation: string;
  interviewerReminder: string;
  noShowPolicy: string;
  activityLog: string[];
  nextActions: string[];
  risks: string[];
}

const plannerResultSchema = z.object({
  summary: z.string().default(''),
  recruiterBrief: z.string().default(''),
  candidateConfirmation: z.string().default(''),
  interviewerReminder: z.string().default(''),
  noShowPolicy: z.string().default(''),
  activityLog: z.array(z.string()).default([]),
  nextActions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
});

function normalizeRecommendation(recommendation: StageRecommendation) {
  return {
    stage: recommendation.stage.label,
    interviewerRole: recommendation.stage.interviewerRole,
    duration: recommendation.stage.duration,
    selected: recommendation.selected
      ? {
          interviewerName: recommendation.selected.interviewerName,
          interviewerTimezone: recommendation.selected.interviewerTimezone,
          slot: recommendation.selected.slot,
          fitScore: recommendation.selected.fitScore,
        }
      : null,
    alternatives: recommendation.alternatives.map((option) => ({
      interviewerName: option.interviewerName,
      interviewerTimezone: option.interviewerTimezone,
      slot: option.slot,
      fitScore: option.fitScore,
    })),
  };
}

export function buildInterviewPlannerMessages(
  input: InterviewPlannerInput
): EvolinkChatMessage[] {
  const schedulingContext = {
    candidate: {
      name: input.candidateName,
      email: input.candidateEmail,
      timezone: input.candidateTimezone,
    },
    jobTitle: input.jobTitle,
    notes: input.notes || '',
    recommendations: input.recommendations.map(normalizeRecommendation),
  };

  return [
    {
      role: 'system',
      content:
        'You are an interview scheduling AI agent for recruiters. Respond with valid JSON only. Do not wrap the JSON in markdown fences. Return an object with these keys: summary, recruiterBrief, candidateConfirmation, interviewerReminder, noShowPolicy, activityLog, nextActions, risks. activityLog, nextActions, and risks must be arrays of strings. Keep the tone concise, operational, and recruiter-friendly.',
    },
    {
      role: 'user',
      content: [
        'Review the candidate profile and the current scheduling recommendations.',
        'Summarize the plan, explain the sequencing, highlight any timezone or availability risks, and draft the candidate/interviewer messaging.',
        'Use the provided recommendations as the current source of truth rather than inventing new interview times.',
        JSON.stringify(schedulingContext, null, 2),
      ].join('\n\n'),
    },
  ];
}

export function parseInterviewPlannerResult(
  content: string
): InterviewPlannerResult {
  const normalized = extractJsonObject(content);
  const parsed = JSON.parse(normalized);

  return plannerResultSchema.parse(parsed);
}

function extractJsonObject(content: string) {
  const trimmed = String(content || '').trim();

  if (!trimmed) {
    throw new Error('empty planner response');
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('planner response is not valid JSON');
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}
