import { describe, expect, it } from 'vitest';

import {
  buildInterviewPlannerMessages,
  parseInterviewPlannerResult,
} from '@/shared/blocks/interview-scheduler/planner';
import { buildRecommendations } from '@/shared/blocks/interview-scheduler';

describe('interview planner helpers', () => {
  it('builds a prompt bundle that includes the scheduling context', () => {
    const messages = buildInterviewPlannerMessages({
      candidateName: 'Qiwen Yuan',
      candidateEmail: 'qiwen@example.com',
      candidateTimezone: 'Asia/Singapore',
      jobTitle: 'Talent Management Strategy Intern',
      notes: 'Candidate prefers weekday daytime interviews.',
      recommendations: buildRecommendations('Asia/Singapore'),
    });

    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.content).toContain('Qiwen Yuan');
    expect(messages[1]?.content).toContain('Talent Management Strategy Intern');
    expect(messages[1]?.content).toContain('Ava Chen');
  });

  it('parses JSON content and normalizes fenced responses', () => {
    const result = parseInterviewPlannerResult(`\`\`\`json
{
  "summary": "Sequenced all three rounds this week.",
  "recruiterBrief": "The current plan is candidate-friendly.",
  "candidateConfirmation": "Your interview is confirmed.",
  "interviewerReminder": "Please review the profile before the meeting.",
  "noShowPolicy": "Offer one automatic rebooking.",
  "activityLog": ["Checked interviewer calendars."],
  "nextActions": ["Send the candidate the top slot."],
  "risks": ["Cross-functional stage has fewer fallback slots."]
}
\`\`\``);

    expect(result.summary).toContain('Sequenced');
    expect(result.activityLog).toEqual(['Checked interviewer calendars.']);
    expect(result.risks[0]).toContain('fallback');
  });
});
