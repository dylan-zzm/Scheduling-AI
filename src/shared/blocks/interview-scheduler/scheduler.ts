export type InterviewerRole =
  | 'recruiter'
  | 'hiring_manager'
  | 'cross_functional';

export interface Interviewer {
  id: string;
  name: string;
  role: InterviewerRole;
  timezone: string;
  slots: string[];
}

export interface InterviewStageTemplate {
  id: string;
  labelKey: string;
  interviewerRole: InterviewerRole;
  duration: number;
}

export interface InterviewStage {
  id: string;
  label: string;
  interviewerRole: InterviewerRole;
  duration: number;
}

export interface StageOption {
  stageId: string;
  stageLabel: string;
  interviewerId: string;
  interviewerName: string;
  interviewerTimezone: string;
  duration: number;
  slot: string;
  fitScore: number;
}

export interface StageRecommendation {
  stage: InterviewStage;
  selected: StageOption | null;
  alternatives: StageOption[];
  allOptions: StageOption[];
}

export const INTERVIEWERS: Interviewer[] = [
  {
    id: 'i1',
    name: 'Ava Chen',
    role: 'recruiter',
    timezone: 'Asia/Shanghai',
    slots: [
      '2026-04-20T09:00:00+08:00',
      '2026-04-20T10:00:00+08:00',
      '2026-04-20T14:00:00+08:00',
      '2026-04-21T11:00:00+08:00',
      '2026-04-21T15:00:00+08:00',
    ],
  },
  {
    id: 'i2',
    name: 'Leo Wang',
    role: 'hiring_manager',
    timezone: 'Asia/Shanghai',
    slots: [
      '2026-04-20T10:00:00+08:00',
      '2026-04-20T16:00:00+08:00',
      '2026-04-21T13:00:00+08:00',
      '2026-04-22T09:00:00+08:00',
      '2026-04-22T15:00:00+08:00',
    ],
  },
  {
    id: 'i3',
    name: 'Emma Smith',
    role: 'cross_functional',
    timezone: 'Europe/London',
    slots: [
      '2026-04-20T09:00:00+01:00',
      '2026-04-20T11:00:00+01:00',
      '2026-04-21T09:00:00+01:00',
      '2026-04-21T13:00:00+01:00',
      '2026-04-22T10:00:00+01:00',
    ],
  },
];

export const STAGE_TEMPLATES: InterviewStageTemplate[] = [
  {
    id: 'stage1',
    labelKey: 'stages.stage1.label',
    interviewerRole: 'recruiter',
    duration: 30,
  },
  {
    id: 'stage2',
    labelKey: 'stages.stage2.label',
    interviewerRole: 'hiring_manager',
    duration: 45,
  },
  {
    id: 'stage3',
    labelKey: 'stages.stage3.label',
    interviewerRole: 'cross_functional',
    duration: 45,
  },
];

export const DEFAULT_STAGES: InterviewStage[] = [
  {
    id: 'stage1',
    label: 'HR Screening',
    interviewerRole: 'recruiter',
    duration: 30,
  },
  {
    id: 'stage2',
    label: 'Business Interview',
    interviewerRole: 'hiring_manager',
    duration: 45,
  },
  {
    id: 'stage3',
    label: 'Cross-functional Round',
    interviewerRole: 'cross_functional',
    duration: 45,
  },
];

export function formatInTimezone(
  isoString: string,
  timezone: string,
  locale = 'en-GB'
) {
  const date = new Date(isoString);

  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function getHourInTimezone(isoString: string, timezone: string) {
  const date = new Date(isoString);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return Number(parts.find((part) => part.type === 'hour')?.value || 0);
}

export function isWithinCandidateHours(
  isoString: string,
  candidateTimezone: string
) {
  const hour = getHourInTimezone(isoString, candidateTimezone);

  return hour >= 9 && hour <= 20;
}

export function buildRecommendations(
  candidateTimezone: string,
  stageConfigs: InterviewStage[] = DEFAULT_STAGES,
  interviewers: Interviewer[] = INTERVIEWERS
): StageRecommendation[] {
  const stagePlans: StageRecommendation[] = [];
  let lastBookedTime: number | null = null;

  for (const stage of stageConfigs) {
    const candidates = interviewers
      .filter((interviewer) => interviewer.role === stage.interviewerRole)
      .flatMap((interviewer) =>
        interviewer.slots.map((slot) => ({
          stageId: stage.id,
          stageLabel: stage.label,
          interviewerId: interviewer.id,
          interviewerName: interviewer.name,
          interviewerTimezone: interviewer.timezone,
          duration: stage.duration,
          slot,
          fitScore:
            (isWithinCandidateHours(slot, candidateTimezone) ? 50 : 0) +
            (interviewer.timezone === candidateTimezone ? 20 : 0),
        }))
      )
      .filter((option) => {
        if (lastBookedTime === null) {
          return true;
        }

        return new Date(option.slot).getTime() > lastBookedTime + 30 * 60 * 1000;
      })
      .sort((a, b) => {
        if (b.fitScore !== a.fitScore) {
          return b.fitScore - a.fitScore;
        }

        return new Date(a.slot).getTime() - new Date(b.slot).getTime();
      });

    const selected = candidates[0] || null;

    stagePlans.push({
      stage,
      selected,
      alternatives: candidates.slice(1, 4),
      allOptions: candidates.slice(0, 5),
    });

    if (selected) {
      lastBookedTime = new Date(selected.slot).getTime();
    }
  }

  return stagePlans;
}
