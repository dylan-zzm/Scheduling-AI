import { describe, expect, it } from 'vitest';

import {
  buildRecommendations,
  DEFAULT_STAGES,
  formatInTimezone,
  getHourInTimezone,
  INTERVIEWERS,
  isWithinCandidateHours,
} from '@/shared/blocks/interview-scheduler';

describe('interview-scheduler logic', () => {
  it('formats interview slots in the requested timezone', () => {
    expect(
      formatInTimezone('2026-04-20T09:00:00+08:00', 'Asia/Singapore', 'en-GB')
    ).toContain('20 Apr 2026');
  });

  it('evaluates candidate-friendly hours in the candidate timezone', () => {
    expect(
      getHourInTimezone('2026-04-20T09:00:00+01:00', 'Asia/Singapore')
    ).toBe(16);
    expect(
      isWithinCandidateHours(
        '2026-04-20T09:00:00+01:00',
        'Asia/Singapore'
      )
    ).toBe(true);
    expect(
      isWithinCandidateHours(
        '2026-04-20T06:30:00-07:00',
        'Asia/Singapore'
      )
    ).toBe(false);
  });

  it('builds an earliest-fit plan for each stage in sequence', () => {
    const plans = buildRecommendations(
      'Asia/Singapore',
      DEFAULT_STAGES,
      INTERVIEWERS
    );

    expect(plans).toHaveLength(3);
    expect(plans[0]?.selected).toMatchObject({
      stageId: 'stage1',
      interviewerName: 'Ava Chen',
      slot: '2026-04-20T09:00:00+08:00',
    });
    expect(plans[1]?.selected).toMatchObject({
      stageId: 'stage2',
      interviewerName: 'Leo Wang',
      slot: '2026-04-20T10:00:00+08:00',
    });
    expect(plans[2]?.selected).toMatchObject({
      stageId: 'stage3',
      interviewerName: 'Emma Smith',
      slot: '2026-04-20T09:00:00+01:00',
    });
  });

  it('keeps fallback options for rescheduling flows', () => {
    const plans = buildRecommendations('Asia/Singapore');

    expect(plans[0]?.alternatives.length).toBeGreaterThan(0);
    expect(plans[1]?.allOptions.length).toBeLessThanOrEqual(5);
  });
});
