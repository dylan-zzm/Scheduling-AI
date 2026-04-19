import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildRecommendations } from '@/shared/blocks/interview-scheduler';

const getUserInfo = vi.fn();
const createEvolinkChatCompletion = vi.fn();

vi.mock('@/shared/models/user', () => ({
  getUserInfo,
}));

vi.mock('@/shared/services/evolink-chat', () => ({
  createEvolinkChatCompletion,
}));

describe('POST /api/interview-scheduler/plan', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.INTERVIEW_SCHEDULER_PUBLIC_DEMO_ENABLED;
  });

  it('returns a structured planner result for authenticated users', async () => {
    getUserInfo.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
    createEvolinkChatCompletion.mockResolvedValue(
      JSON.stringify({
        summary: 'Sequenced all three rounds.',
        recruiterBrief: 'The recruiter can start with Ava Chen.',
        candidateConfirmation: 'Your interview is confirmed.',
        interviewerReminder: 'Please review the candidate profile.',
        noShowPolicy: 'Offer one automatic rebooking.',
        activityLog: ['Checked interviewer calendars.'],
        nextActions: ['Send the candidate the top recommended slot.'],
        risks: ['Cross-functional fallback inventory is limited.'],
      })
    );

    const { POST } = await import(
      '@/app/api/interview-scheduler/plan/route'
    );

    const response = await POST(
      new Request('http://localhost/api/interview-scheduler/plan', {
        method: 'POST',
        body: JSON.stringify({
          candidateName: 'Qiwen Yuan',
          candidateEmail: 'qiwen@example.com',
          candidateTimezone: 'Asia/Singapore',
          jobTitle: 'Talent Management Strategy Intern',
          notes: 'Candidate prefers weekday daytime interviews.',
          recommendations: buildRecommendations('Asia/Singapore'),
        }),
      })
    );

    const json = await response.json();

    expect(json.code).toBe(0);
    expect(json.data.summary).toContain('Sequenced');
    expect(createEvolinkChatCompletion).toHaveBeenCalled();
  });

  it('rejects unauthenticated requests', async () => {
    getUserInfo.mockResolvedValue(null);

    const { POST } = await import(
      '@/app/api/interview-scheduler/plan/route'
    );

    const response = await POST(
      new Request('http://localhost/api/interview-scheduler/plan', {
        method: 'POST',
        body: JSON.stringify({
          candidateName: 'Qiwen Yuan',
          candidateEmail: 'qiwen@example.com',
          candidateTimezone: 'Asia/Singapore',
          jobTitle: 'Talent Management Strategy Intern',
          recommendations: buildRecommendations('Asia/Singapore'),
        }),
      })
    );

    expect(await response.json()).toMatchObject({
      code: -1,
      message: 'no auth, please sign in',
    });
  });

  it('allows unauthenticated requests when public demo mode is enabled', async () => {
    process.env.INTERVIEW_SCHEDULER_PUBLIC_DEMO_ENABLED = 'true';
    getUserInfo.mockResolvedValue(null);
    createEvolinkChatCompletion.mockResolvedValue(
      JSON.stringify({
        summary: 'Public demo mode generated a valid schedule plan.',
        recruiterBrief: 'Share the top two slots with the candidate.',
        candidateConfirmation: 'Your interview options are ready.',
        interviewerReminder: 'Please confirm calendar holds before the meeting.',
        noShowPolicy: 'Offer one automatic rebooking.',
        activityLog: ['Generated public demo planner output.'],
        nextActions: ['Send the candidate scheduling link.'],
        risks: ['Public demo mode is enabled for anonymous visitors.'],
      })
    );

    const { POST } = await import(
      '@/app/api/interview-scheduler/plan/route'
    );

    const response = await POST(
      new Request('http://localhost/api/interview-scheduler/plan', {
        method: 'POST',
        body: JSON.stringify({
          candidateName: 'Qiwen Yuan',
          candidateEmail: 'qiwen@example.com',
          candidateTimezone: 'Asia/Singapore',
          jobTitle: 'Talent Management Strategy Intern',
          notes: 'Candidate prefers weekday daytime interviews.',
          recommendations: buildRecommendations('Asia/Singapore'),
        }),
      })
    );

    const json = await response.json();

    expect(json.code).toBe(0);
    expect(json.data.summary).toContain('Public demo mode');
    expect(createEvolinkChatCompletion).toHaveBeenCalled();
  });
});
