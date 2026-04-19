// @vitest-environment jsdom

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import messages from '@/config/locale/messages/en/ai/interview_scheduler.json';
import { InterviewSchedulerAgent } from '@/shared/blocks/interview-scheduler';

import { createJsonResponse } from '../../../../utils/http';
import { renderWithIntl } from '../../../../utils/render';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('InterviewSchedulerAgent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('books a candidate-selected slot and updates the dashboard', async () => {
    const user = userEvent.setup();

    renderWithIntl(<InterviewSchedulerAgent />, {
      locale: 'en',
      messages: {
        ai: {
          interview_scheduler: messages,
        },
      },
    });

    await user.click(screen.getByRole('tab', { name: 'Candidate' }));
    await user.click(screen.getByTestId('candidate-option-0'));
    await user.click(
      screen.getByRole('button', { name: 'Confirm selected slot' })
    );

    expect(screen.getByTestId('booked-count')).toHaveTextContent('1');
    expect(
      screen.getByText(/Candidate selected HR Screening with Ava Chen/i)
    ).toBeInTheDocument();
  });

  it('loads AI planner output when the agent runs', async () => {
    const user = userEvent.setup();

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      createJsonResponse({
        code: 0,
        data: {
          summary: 'The plan keeps all three rounds within candidate-friendly hours.',
          recruiterBrief: 'Start with Ava Chen, then follow with Leo Wang.',
          candidateConfirmation: 'Your interview plan is now confirmed.',
          interviewerReminder: 'Please review the candidate packet before the call.',
          noShowPolicy: 'Offer one automatic rebooking before escalation.',
          activityLog: ['Checked calendars.', 'Drafted the candidate message.'],
          nextActions: ['Send the candidate confirmation email.'],
          risks: ['Cross-functional fallback slots are limited this week.'],
        },
      })
    );

    renderWithIntl(<InterviewSchedulerAgent />, {
      locale: 'en',
      messages: {
        ai: {
          interview_scheduler: messages,
        },
      },
    });

    await user.click(screen.getAllByRole('button', { name: 'Run Agent' })[0]);

    expect(
      await screen.findByText(
        /The plan keeps all three rounds within candidate-friendly hours/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Send the candidate confirmation email/i)
    ).toBeInTheDocument();
  });

  it('falls back quietly for anonymous preview runs', async () => {
    const user = userEvent.setup();

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      createJsonResponse(
        {
          code: 401,
          message: 'no auth, please sign in',
        },
        {
          status: 401,
        }
      )
    );

    renderWithIntl(<InterviewSchedulerAgent />, {
      locale: 'en',
      messages: {
        ai: {
          interview_scheduler: messages,
        },
      },
    });

    await user.click(screen.getAllByRole('button', { name: 'Run Agent' })[0]);

    expect(toast.error).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        /Qiwen Yuan now has 3 recommended rounds/i
      )
    ).toBeInTheDocument();
  });
});
