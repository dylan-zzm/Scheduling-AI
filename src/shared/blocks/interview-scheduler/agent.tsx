'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  Layers3,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Separator } from '@/shared/components/ui/separator';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

import {
  buildRecommendations,
  formatInTimezone,
  INTERVIEWERS,
  InterviewStage,
  isWithinCandidateHours,
  StageRecommendation,
  StageOption,
  STAGE_TEMPLATES,
} from './scheduler';
import { InterviewPlannerResult } from './planner';

type BookingSource = 'candidate' | 'recruiter';
type StageStatus = 'scheduled' | 'rescheduled' | 'no_show';

type TimezoneOption = {
  value: string;
  label: string;
};

type DemoScenario = {
  id: string;
  title: string;
  badge: string;
  summary: string;
  candidate_name: string;
  candidate_email: string;
  candidate_timezone: string;
  job_title: string;
  notes: string;
  sla: string;
  markets: string;
  priority: string;
  automation: string;
};

function getTimezoneOptions(
  t: ReturnType<typeof useTranslations>
): TimezoneOption[] {
  return [
    { value: 'Asia/Shanghai', label: t('timezones.asia_shanghai') },
    { value: 'Asia/Singapore', label: t('timezones.asia_singapore') },
    { value: 'Europe/London', label: t('timezones.europe_london') },
    { value: 'America/New_York', label: t('timezones.america_new_york') },
    {
      value: 'America/Los_Angeles',
      label: t('timezones.america_los_angeles'),
    },
    { value: 'Australia/Sydney', label: t('timezones.australia_sydney') },
  ];
}

function getRoleLabels(t: ReturnType<typeof useTranslations>) {
  return {
    recruiter: t('roles.recruiter'),
    hiring_manager: t('roles.hiring_manager'),
    cross_functional: t('roles.cross_functional'),
  } as const;
}

function getStatusLabels(t: ReturnType<typeof useTranslations>) {
  return {
    scheduled: t('status.scheduled'),
    rescheduled: t('status.rescheduled'),
    no_show: t('status.no_show'),
  } as const;
}

export function InterviewSchedulerAgent({
  srOnlyTitle,
  className,
}: {
  srOnlyTitle?: string;
  className?: string;
}) {
  const t = useTranslations('ai.interview_scheduler');
  const locale = useLocale();

  const roleLabels = getRoleLabels(t);
  const statusLabels = getStatusLabels(t);
  const timezoneOptions = getTimezoneOptions(t);
  const flowSteps = t.raw('guide.flow.steps') as Array<{
    title: string;
    description: string;
  }>;
  const logicItems = t.raw('guide.logic.items') as string[];
  const actionItems = t.raw('guide.actions.items') as string[];
  const nextItems = t.raw('guide.next.items') as string[];
  const heroHighlights = t.raw('hero.highlights') as string[];
  const demoScenarios = t.raw('demo_scenarios.items') as DemoScenario[];
  const defaultScenario =
    demoScenarios[0] ??
    ({
      id: 'default',
      title: t('page.title'),
      badge: t('badge'),
      summary: t('page.description'),
      candidate_name: t('defaults.candidate_name'),
      candidate_email: t('defaults.candidate_email'),
      candidate_timezone: 'Asia/Singapore',
      job_title: t('defaults.job_title'),
      notes: t('defaults.notes'),
      sla: '24h',
      markets: 'Shanghai + London',
      priority: 'Default demo',
      automation: 'Deterministic demo',
    } as DemoScenario);

  const [selectedScenarioId, setSelectedScenarioId] = useState(
    defaultScenario.id
  );
  const [candidateName, setCandidateName] = useState(
    defaultScenario.candidate_name
  );
  const [candidateEmail, setCandidateEmail] = useState(
    defaultScenario.candidate_email
  );
  const [candidateTimezone, setCandidateTimezone] = useState(
    defaultScenario.candidate_timezone
  );
  const [jobTitle, setJobTitle] = useState(defaultScenario.job_title);
  const [notes, setNotes] = useState(defaultScenario.notes);
  const [bookings, setBookings] = useState<Record<string, StageOption>>({});
  const [stageStatus, setStageStatus] = useState<Record<string, StageStatus>>(
    {}
  );
  const [selectedCandidateOptions, setSelectedCandidateOptions] = useState<
    Record<string, StageOption>
  >({});
  const [plannerResult, setPlannerResult] =
    useState<InterviewPlannerResult | null>(null);
  const [agentLog, setAgentLog] = useState<string[]>(() => [t('activity.ready')]);
  const [isRunningAgent, setIsRunningAgent] = useState(false);

  const activeScenario =
    demoScenarios.find((scenario) => scenario.id === selectedScenarioId) ??
    defaultScenario;

  const stages = useMemo<InterviewStage[]>(
    () =>
      STAGE_TEMPLATES.map((stage) => ({
        id: stage.id,
        label: t(stage.labelKey),
        interviewerRole: stage.interviewerRole,
        duration: stage.duration,
      })),
    [t]
  );

  const recommendations = useMemo(
    () => buildRecommendations(candidateTimezone, stages),
    [candidateTimezone, stages]
  );

  const selectedRecommendations = useMemo(
    () =>
      recommendations.filter(
        (recommendation): recommendation is StageRecommendation & {
          selected: StageOption;
        } => Boolean(recommendation.selected)
      ),
    [recommendations]
  );

  const nextPendingStagePlan = useMemo(
    () => recommendations.find(({ stage }) => !bookings[stage.id]) || null,
    [bookings, recommendations]
  );

  const currentStagePlan =
    nextPendingStagePlan || recommendations[recommendations.length - 1] || null;
  const candidateOptions = nextPendingStagePlan?.allOptions || [];
  const currentStageId = currentStagePlan?.stage.id || '';
  const selectedCandidateOption = currentStageId
    ? selectedCandidateOptions[currentStageId]
    : undefined;
  const totalBooked = Object.keys(bookings).length;
  const allStagesBooked = totalBooked >= stages.length;
  const crossTimezoneCount = selectedRecommendations.filter(
    (recommendation) =>
      recommendation.selected.interviewerTimezone !== candidateTimezone
  ).length;
  const fallbackCoverageCount = recommendations.filter(
    (recommendation) => recommendation.alternatives.length > 0
  ).length;
  const candidateFriendlySelections = selectedRecommendations.filter(
    (recommendation) =>
      isWithinCandidateHours(recommendation.selected.slot, candidateTimezone)
  ).length;

  const formatTime = (isoString: string, timezone: string) =>
    formatInTimezone(isoString, timezone, locale);

  const serializeRecommendations = (stagePlans: StageRecommendation[]) =>
    stagePlans.map((recommendation) => ({
      ...recommendation,
      stage: { ...recommendation.stage },
      selected: recommendation.selected ? { ...recommendation.selected } : null,
      alternatives: recommendation.alternatives.map((option) => ({ ...option })),
      allOptions: recommendation.allOptions.map((option) => ({ ...option })),
    }));

  const buildLocalPlannerResult = (
    stagePlans: StageRecommendation[]
  ): InterviewPlannerResult => {
    const selectedPlans = stagePlans.filter(
      (recommendation): recommendation is StageRecommendation & {
        selected: StageOption;
      } => Boolean(recommendation.selected)
    );
    const firstPlan = selectedPlans[0];
    const lastPlan = selectedPlans[selectedPlans.length - 1];
    const firstTime = firstPlan?.selected
      ? formatTime(firstPlan.selected.slot, candidateTimezone)
      : '--';
    const lastTime = lastPlan?.selected
      ? formatTime(lastPlan.selected.slot, candidateTimezone)
      : firstTime;
    const limitedFallbackStage =
      stagePlans.find((recommendation) => recommendation.alternatives.length < 2)
        ?.stage.label || '';

    return {
      summary: t('planner.demo.summary', {
        candidate: candidateName,
        rounds: selectedPlans.length,
        crossTimezone: crossTimezoneCount,
        fallback: fallbackCoverageCount,
      }),
      recruiterBrief: t('planner.demo.recruiter_brief', {
        firstStage: firstPlan?.stage.label || t('candidate.completed'),
        firstTime,
        lastTime,
        sla: activeScenario.sla,
      }),
      candidateConfirmation: t('planner.demo.candidate_confirmation', {
        candidate: candidateName,
        role: jobTitle,
        rounds: selectedPlans.length,
      }),
      interviewerReminder: t('planner.demo.interviewer_reminder', {
        role: jobTitle,
      }),
      noShowPolicy: t('notifications.no_show_policy_body'),
      activityLog: [
        t('activity.scenario_loaded', { scenario: activeScenario.title }),
        t('activity.run.read_profile', {
          candidate: candidateName,
          role: jobTitle,
        }),
        t('activity.run.detect_timezone', {
          timezone: candidateTimezone,
        }),
        t('activity.run.checked_calendars'),
        crossTimezoneCount > 0
          ? t('activity.run.cross_timezone_handoffs', {
              count: crossTimezoneCount,
            })
          : t('activity.run.same_region_fit'),
        t('activity.run.generated_options'),
        t('activity.run.demo_briefing'),
      ],
      nextActions: [
        t('planner.demo.next_action_share', {
          firstStage: firstPlan?.stage.label || t('candidate.completed'),
          time: firstTime,
        }),
        t('planner.demo.next_action_hold', {
          sla: activeScenario.sla,
        }),
        t('planner.demo.next_action_monitor'),
      ],
      risks: [
        ...(crossTimezoneCount > 0
          ? [
              t('planner.demo.risk_timezone', {
                count: crossTimezoneCount,
              }),
            ]
          : []),
        ...(limitedFallbackStage
          ? [
              t('planner.demo.risk_fallback', {
                stage: limitedFallbackStage,
              }),
            ]
          : []),
        ...(notes
          ? [
              t('planner.demo.risk_constraints', {
                notes,
              }),
            ]
          : []),
      ],
    };
  };

  const applyScenario = (scenario: DemoScenario) => {
    setSelectedScenarioId(scenario.id);
    setCandidateName(scenario.candidate_name);
    setCandidateEmail(scenario.candidate_email);
    setCandidateTimezone(scenario.candidate_timezone);
    setJobTitle(scenario.job_title);
    setNotes(scenario.notes);
    setBookings({});
    setStageStatus({});
    setSelectedCandidateOptions({});
    setPlannerResult(null);
    setAgentLog([
      t('activity.scenario_loaded', { scenario: scenario.title }),
      t('activity.ready'),
    ]);
  };

  const runAgent = async () => {
    setIsRunningAgent(true);

    try {
      const response = await fetch('/api/interview-scheduler/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateName,
          candidateEmail,
          candidateTimezone,
          jobTitle,
          notes,
          recommendations: serializeRecommendations(recommendations),
        }),
      });

      if (!response.ok) {
        throw new Error(`request failed with status: ${response.status}`);
      }

      const { code, message, data } = await response.json();
      if (code !== 0) {
        throw new Error(message || t('planner.errors.generic'));
      }

      setPlannerResult(data as InterviewPlannerResult);
      setAgentLog((data as InterviewPlannerResult).activityLog);
    } catch (error: any) {
      const message =
        error instanceof Error ? error.message : t('planner.errors.generic');

      if (message.includes('invalid params')) {
        toast.error(message);
      }

      const fallbackPlan = buildLocalPlannerResult(recommendations);
      setPlannerResult(fallbackPlan);
      setAgentLog(fallbackPlan.activityLog);
    } finally {
      setIsRunningAgent(false);
    }
  };

  const bookStage = (
    stageId: string,
    option: StageOption,
    source: BookingSource = 'recruiter'
  ) => {
    setBookings((prev) => ({ ...prev, [stageId]: option }));
    setStageStatus((prev) => ({ ...prev, [stageId]: 'scheduled' }));
    setAgentLog((prev) => [
      ...prev,
      t(
        source === 'candidate'
          ? 'activity.candidate_selected'
          : 'activity.recruiter_booked',
        {
          stage: option.stageLabel,
          interviewer: option.interviewerName,
          time: formatTime(option.slot, candidateTimezone),
          timezone: candidateTimezone,
        }
      ),
    ]);
  };

  const autoBookTopPath = () => {
    const nextBookings: Record<string, StageOption> = {};
    const nextStatuses: Record<string, StageStatus> = {};
    const nextSelections: Record<string, StageOption> = {};
    const bookedPlans = recommendations.filter((recommendation) => {
      if (!recommendation.selected) {
        return false;
      }

      nextBookings[recommendation.stage.id] = recommendation.selected;
      nextStatuses[recommendation.stage.id] = 'scheduled';
      nextSelections[recommendation.stage.id] = recommendation.selected;
      return true;
    });

    setBookings(nextBookings);
    setStageStatus(nextStatuses);
    setSelectedCandidateOptions(nextSelections);
    setAgentLog([
      t('activity.scenario_loaded', { scenario: activeScenario.title }),
      t('activity.auto_booked_path', { count: bookedPlans.length }),
      ...bookedPlans.map((recommendation) =>
        t('activity.recruiter_booked', {
          stage: recommendation.selected?.stageLabel || recommendation.stage.label,
          interviewer: recommendation.selected?.interviewerName || '',
          time: recommendation.selected
            ? formatTime(recommendation.selected.slot, candidateTimezone)
            : '--',
          timezone: candidateTimezone,
        })
      ),
    ]);
  };

  const rescheduleStage = (
    stageId: string,
    alternatives: StageOption[],
    reason = t('activity.reasons.reschedule_requested')
  ) => {
    if (!alternatives.length) {
      return;
    }

    const next = alternatives[0];

    setBookings((prev) => ({ ...prev, [stageId]: next }));
    setStageStatus((prev) => ({ ...prev, [stageId]: 'rescheduled' }));
    setAgentLog((prev) => [
      ...prev,
      t('activity.rescheduled', {
        reason,
        stage: next.stageLabel,
        time: formatTime(next.slot, candidateTimezone),
        interviewer: next.interviewerName,
      }),
    ]);
  };

  const markNoShow = (stageId: string, alternatives: StageOption[]) => {
    setStageStatus((prev) => ({ ...prev, [stageId]: 'no_show' }));
    setAgentLog((prev) => [
      ...prev,
      t('activity.no_show_detected', {
        stage:
          stages.find((stage) => stage.id === stageId)?.label ||
          t('candidate.completed'),
      }),
    ]);

    rescheduleStage(
      stageId,
      alternatives,
      t('activity.reasons.candidate_no_show')
    );
  };

  const resetAgent = () => {
    setBookings({});
    setStageStatus({});
    setSelectedCandidateOptions({});
    setPlannerResult(null);
    setAgentLog([t('activity.reset')]);
  };

  const heroStats = [
    {
      icon: Workflow,
      label: t('hero.stats.sla'),
      value: activeScenario.sla,
      detail: activeScenario.priority,
    },
    {
      icon: Globe2,
      label: t('hero.stats.cross_timezone'),
      value: `${crossTimezoneCount}/${stages.length}`,
      detail: activeScenario.markets,
    },
    {
      icon: Layers3,
      label: t('hero.stats.fallback'),
      value: `${fallbackCoverageCount}/${stages.length}`,
      detail: t('console.fallback_options'),
    },
    {
      icon: ShieldCheck,
      label: t('hero.stats.candidate_fit'),
      value: `${candidateFriendlySelections}/${stages.length}`,
      detail: activeScenario.automation,
    },
  ];

  const operationsCards = [
    {
      label: t('operations.sla'),
      value: activeScenario.sla,
    },
    {
      label: t('operations.priority'),
      value: activeScenario.priority,
    },
    {
      label: t('operations.fallback_coverage'),
      value: `${fallbackCoverageCount}/${stages.length}`,
    },
    {
      label: t('operations.markets'),
      value: activeScenario.markets,
    },
  ];

  return (
    <section
      id="demo"
      className={cn(
        'scroll-mt-24 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_32%),linear-gradient(to_bottom,#f8fafc,#eef2ff)] px-4 py-8 md:px-6',
        className
      )}
    >
      {srOnlyTitle ? <h2 className="sr-only">{srOnlyTitle}</h2> : null}

      <div className="mx-auto max-w-7xl space-y-6">
        <Card
          id="overview"
          className="scroll-mt-24 relative overflow-hidden rounded-[32px] border-0 bg-slate-950 text-white shadow-[0_32px_100px_-36px_rgba(15,23,42,0.85)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_28%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          <CardContent className="relative p-6 md:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white">
                    <Sparkles className="mr-1 h-4 w-4" />
                    {t('badge')}
                  </Badge>
                  <Badge className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-cyan-100">
                    {activeScenario.badge}
                  </Badge>
                  <Badge className="rounded-full border border-white/15 bg-transparent px-3 py-1 text-slate-200">
                    {activeScenario.sla}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-medium uppercase tracking-[0.28em] text-slate-300">
                    {t('hero.eyebrow')}
                  </div>
                  <h1 className="max-w-4xl text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
                    {t('hero.title')}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                    {t('hero.description')}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {heroStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[24px] border border-white/10 bg-white/[0.08] p-4 backdrop-blur"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-300">
                          {stat.label}
                        </div>
                        <stat.icon className="h-4 w-4 text-cyan-200" />
                      </div>
                      <div className="mt-3 text-2xl font-semibold tracking-tight">
                        {stat.value}
                      </div>
                      <div className="mt-1 text-sm text-slate-300">
                        {stat.detail}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100"
                    onClick={runAgent}
                    disabled={isRunningAgent}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isRunningAgent
                      ? t('form.running_agent')
                      : t('hero.actions.run_agent')}
                  </Button>
                  <Button
                    data-testid="hero-auto-book"
                    variant="outline"
                    className="rounded-full border-white/20 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white"
                    onClick={autoBookTopPath}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {t('hero.actions.auto_book')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-full px-5 text-slate-200 hover:bg-white/10 hover:text-white"
                    onClick={resetAgent}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t('hero.actions.reset')}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {heroHighlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-200"
                    >
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.08] p-5 backdrop-blur">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-300">
                        {activeScenario.badge}
                      </div>
                      <div className="mt-2 text-2xl font-semibold tracking-tight">
                        {activeScenario.title}
                      </div>
                    </div>
                    <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white">
                      {activeScenario.sla}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {activeScenario.summary}
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {t('hero.summary.candidate')}
                      </div>
                      <div className="mt-2 text-sm font-medium text-white">
                        {candidateName}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {t('hero.summary.role')}
                      </div>
                      <div className="mt-2 text-sm font-medium text-white">
                        {jobTitle}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {t('hero.summary.priority')}
                      </div>
                      <div className="mt-2 text-sm font-medium text-white">
                        {activeScenario.priority}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {t('hero.summary.automation')}
                      </div>
                      <div className="mt-2 text-sm font-medium text-white">
                        {activeScenario.automation}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-900/10">
                  <div className="mb-4">
                    <div className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                      {t('demo_scenarios.title')}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {t('demo_scenarios.description')}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {demoScenarios.map((scenario) => {
                      const isActive = scenario.id === selectedScenarioId;

                      return (
                        <button
                          key={scenario.id}
                          type="button"
                          data-testid={`scenario-${scenario.id}`}
                          onClick={() => applyScenario(scenario)}
                          className={cn(
                            'w-full rounded-[24px] border p-4 text-left transition',
                            isActive
                              ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300/50'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge
                              className={cn(
                                'rounded-full px-3 py-1',
                                isActive
                                  ? 'border border-white/10 bg-white/10 text-white'
                                  : 'border border-slate-200 bg-white text-slate-700'
                              )}
                            >
                              {scenario.badge}
                            </Badge>
                            {isActive ? (
                              <Badge className="rounded-full border border-white/10 bg-white/10 text-white">
                                {t('demo_scenarios.active_label')}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-3 text-lg font-semibold tracking-tight">
                            {scenario.title}
                          </div>
                          <div
                            className={cn(
                              'mt-2 text-sm leading-6',
                              isActive ? 'text-slate-200' : 'text-slate-600'
                            )}
                          >
                            {scenario.summary}
                          </div>
                          <div
                            className={cn(
                              'mt-4 flex flex-wrap gap-2 text-xs',
                              isActive ? 'text-slate-300' : 'text-slate-500'
                            )}
                          >
                            <span>{scenario.sla}</span>
                            <span>•</span>
                            <span>{scenario.markets}</span>
                            <span>•</span>
                            <span>{scenario.priority}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            <Card className="rounded-[28px] border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/60 backdrop-blur">
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <BriefcaseBusiness className="h-5 w-5 text-sky-600" />
                      {t('intake.title')}
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">
                      {t('intake.description')}
                    </CardDescription>
                  </div>
                  <Badge className="rounded-full px-3 py-1 text-sm" variant="secondary">
                    {activeScenario.title}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {t('hero.summary.candidate')}
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {candidateName}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {t('hero.summary.role')}
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {jobTitle}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {t('operations.sla')}
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {activeScenario.sla}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {t('operations.markets')}
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {activeScenario.markets}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="candidate-name">{t('form.candidate_name')}</Label>
                    <Input
                      id="candidate-name"
                      value={candidateName}
                      onChange={(event) => setCandidateName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="candidate-email">{t('form.candidate_email')}</Label>
                    <Input
                      id="candidate-email"
                      type="email"
                      value={candidateEmail}
                      onChange={(event) => setCandidateEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-title">{t('form.job_title')}</Label>
                    <Input
                      id="job-title"
                      value={jobTitle}
                      onChange={(event) => setJobTitle(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="candidate-timezone">
                      {t('form.candidate_timezone')}
                    </Label>
                    <Select
                      value={candidateTimezone}
                      onValueChange={setCandidateTimezone}
                    >
                      <SelectTrigger id="candidate-timezone" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezoneOptions.map((timezone) => (
                          <SelectItem key={timezone.value} value={timezone.value}>
                            {timezone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="scheduling-notes">{t('form.notes')}</Label>
                    <Textarea
                      id="scheduling-notes"
                      rows={4}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <Button onClick={runAgent} disabled={isRunningAgent}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isRunningAgent
                        ? t('form.running_agent')
                        : t('form.run_agent')}
                    </Button>
                    <Button variant="outline" onClick={resetAgent}>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      {t('form.reset')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              id="recruiter-console"
              className="scroll-mt-24 rounded-[28px] border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/50 backdrop-blur"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CalendarDays className="h-5 w-5 text-sky-600" />
                  {t('console.title')}
                </CardTitle>
                <CardDescription className="text-slate-600">
                  {t('console.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendations.map(({ stage, selected, alternatives }) => {
                  const booked = bookings[stage.id] || null;
                  const chosen = booked || selected;
                  const status = stageStatus[stage.id];

                  return (
                    <Card
                      key={stage.id}
                      className="rounded-[24px] border border-slate-200 bg-slate-50/70 py-0 shadow-none"
                    >
                      <CardContent className="space-y-4 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{stage.label}</Badge>
                              <Badge variant="outline">{stage.duration} min</Badge>
                              {status ? <Badge>{statusLabels[status]}</Badge> : null}
                            </div>
                            {chosen ? (
                              <>
                                <div className="text-lg font-semibold text-slate-900">
                                  {chosen.interviewerName}
                                </div>
                                <div className="text-sm text-slate-600">
                                  {roleLabels[stage.interviewerRole]}
                                </div>
                                <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock3 className="h-4 w-4 text-sky-600" />
                                    {formatTime(chosen.slot, candidateTimezone)} (
                                    {candidateTimezone})
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Globe2 className="h-4 w-4 text-amber-600" />
                                    {t('console.interviewer_time', {
                                      time: formatTime(
                                        chosen.slot,
                                        chosen.interviewerTimezone
                                      ),
                                      timezone: chosen.interviewerTimezone,
                                    })}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-rose-600">
                                {t('console.no_slot')}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selected ? (
                              <Button onClick={() => bookStage(stage.id, selected)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {t('console.book')}
                              </Button>
                            ) : null}
                            {alternatives.length ? (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  rescheduleStage(stage.id, alternatives)
                                }
                              >
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                {t('console.reschedule')}
                              </Button>
                            ) : null}
                            {alternatives.length ? (
                              <Button
                                variant="outline"
                                onClick={() => markNoShow(stage.id, alternatives)}
                              >
                                <AlertCircle className="mr-2 h-4 w-4" />
                                {t('console.no_show')}
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        {alternatives.length ? (
                          <div className="space-y-2 rounded-2xl border border-dashed border-slate-200 bg-white p-3">
                            <div className="text-sm font-medium text-slate-700">
                              {t('console.fallback_options')}
                            </div>
                            {alternatives.map((alternative, index) => (
                              <div
                                key={`${stage.id}-${index}`}
                                className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600"
                              >
                                <span>
                                  {alternative.interviewerName} ·{' '}
                                  {formatTime(
                                    alternative.slot,
                                    candidateTimezone
                                  )}{' '}
                                  ({candidateTimezone})
                                </span>
                                <span>{alternative.interviewerTimezone}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card
              id="candidate-self-scheduling"
              className="scroll-mt-24 rounded-[28px] border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/50 backdrop-blur"
            >
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <UserCheck className="h-5 w-5 text-emerald-600" />
                      {t('candidate.title')}
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      {t('candidate.description')}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {activeScenario.badge}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[24px] bg-slate-100 p-4">
                  <div className="text-sm text-slate-500">
                    {t('candidate.current_stage_label')}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {allStagesBooked
                      ? t('candidate.completed')
                      : currentStagePlan?.stage.label}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {candidateName} · {candidateEmail}
                  </div>
                </div>

                {candidateOptions.length ? (
                  <div className="space-y-3">
                    {candidateOptions.map((option, index) => {
                      const isSelected =
                        selectedCandidateOption?.slot === option.slot;
                      const optionTime = formatTime(
                        option.slot,
                        candidateTimezone
                      );

                      return (
                        <button
                          key={`${option.stageId}-${option.interviewerId}-${option.slot}`}
                          type="button"
                          data-testid={`candidate-option-${index}`}
                          aria-label={t('candidate.option_aria', {
                            stage: option.stageLabel,
                            interviewer: option.interviewerName,
                            time: optionTime,
                          })}
                          onClick={() =>
                            currentStagePlan
                              ? setSelectedCandidateOptions((prev) => ({
                                  ...prev,
                                  [currentStagePlan.stage.id]: option,
                                }))
                              : undefined
                          }
                          className={cn(
                            'w-full rounded-[24px] border p-4 text-left transition',
                            isSelected
                              ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300/50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          )}
                        >
                          <div className="font-medium">
                            {optionTime} ({candidateTimezone})
                          </div>
                          <div
                            className={cn(
                              'mt-1 text-sm',
                              isSelected ? 'text-slate-200' : 'text-slate-600'
                            )}
                          >
                            {t('candidate.option_subtitle', {
                              interviewer: option.interviewerName,
                              stage: option.stageLabel,
                            })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    {t('candidate.all_booked')}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={!selectedCandidateOption || !nextPendingStagePlan}
                    onClick={() =>
                      nextPendingStagePlan && selectedCandidateOption
                        ? bookStage(
                            nextPendingStagePlan.stage.id,
                            selectedCandidateOption,
                            'candidate'
                          )
                        : undefined
                    }
                  >
                    <CalendarClock className="mr-2 h-4 w-4" />
                    {t('candidate.confirm')}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!nextPendingStagePlan}
                    onClick={() =>
                      nextPendingStagePlan
                        ? markNoShow(
                            nextPendingStagePlan.stage.id,
                            nextPendingStagePlan.alternatives
                          )
                        : undefined
                    }
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t('candidate.simulate_no_show')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card
              id="planner-output"
              className="scroll-mt-24 rounded-[28px] border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/50 backdrop-blur"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  {t('planner.title')}
                </CardTitle>
                <CardDescription className="text-slate-600">
                  {plannerResult?.summary || t('planner.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-medium">{t('planner.recruiter_brief')}</div>
                  <div className="mt-2">
                    {plannerResult?.recruiterBrief || t('planner.placeholder')}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-medium">{t('planner.next_actions')}</div>
                  <div className="mt-2 space-y-2">
                    {(plannerResult?.nextActions.length
                      ? plannerResult.nextActions
                      : [t('planner.placeholder')]).map((item, index) => (
                      <p key={`planner-next-${index}`}>{item}</p>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-medium">{t('planner.risks')}</div>
                  <div className="mt-2 space-y-2">
                    {(plannerResult?.risks.length
                      ? plannerResult.risks
                      : [t('planner.placeholder')]).map((item, index) => (
                      <p key={`planner-risk-${index}`}>{item}</p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Mail className="h-5 w-5 text-sky-600" />
                  {t('notifications.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-medium">
                    {t('notifications.candidate_confirmation_title')}
                  </div>
                  <div className="mt-2">
                    {plannerResult?.candidateConfirmation ||
                      t('notifications.candidate_confirmation_body', {
                        candidate: candidateName,
                        role: jobTitle,
                      })}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-medium">
                    {t('notifications.interviewer_reminder_title')}
                  </div>
                  <div className="mt-2">
                    {plannerResult?.interviewerReminder ||
                      t('notifications.interviewer_reminder_body')}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="font-medium">
                    {t('notifications.no_show_policy_title')}
                  </div>
                  <div className="mt-2">
                    {plannerResult?.noShowPolicy ||
                      t('notifications.no_show_policy_body')}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Users className="h-5 w-5 text-amber-600" />
                  {t('operations.title')}
                </CardTitle>
                <CardDescription className="text-slate-600">
                  {t('operations.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {operationsCards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-[24px] bg-slate-100 p-4"
                    >
                      <div className="text-sm text-slate-500">{card.label}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 md:text-base">
                        {card.value}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card
              id="workflow"
              className="scroll-mt-24 rounded-[28px] border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/50 backdrop-blur"
            >
              <CardHeader>
                <CardTitle className="text-xl">{t('guide.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="flow">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="flow">{t('guide.tabs.flow')}</TabsTrigger>
                    <TabsTrigger value="logic">
                      {t('guide.tabs.logic')}
                    </TabsTrigger>
                    <TabsTrigger value="actions">
                      {t('guide.tabs.actions')}
                    </TabsTrigger>
                    <TabsTrigger value="next">{t('guide.tabs.next')}</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="flow"
                    className="space-y-3 pt-4 text-sm text-slate-700"
                  >
                    {flowSteps.map((step, index) => (
                      <div
                        key={`flow-step-${index}`}
                        className="rounded-[24px] border border-slate-200 p-4"
                      >
                        <div className="font-medium">{step.title}</div>
                        <div className="mt-1 text-slate-600">
                          {step.description}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent
                    value="logic"
                    className="space-y-3 pt-4 text-sm text-slate-700"
                  >
                    {logicItems.map((item, index) => (
                      <p key={`logic-item-${index}`}>{item}</p>
                    ))}
                  </TabsContent>
                  <TabsContent
                    value="actions"
                    className="space-y-3 pt-4 text-sm text-slate-700"
                  >
                    {actionItems.map((item, index) => (
                      <p key={`action-item-${index}`}>{item}</p>
                    ))}
                  </TabsContent>
                  <TabsContent
                    value="next"
                    className="space-y-3 pt-4 text-sm text-slate-700"
                  >
                    <p>{t('guide.next.intro')}</p>
                    {nextItems.map((item, index) => (
                      <p key={`next-item-${index}`}>{item}</p>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card
              id="agent-activity"
              className="scroll-mt-24 rounded-[28px] border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/50 backdrop-blur"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                  {t('activity.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agentLog.map((item, index) => (
                    <div
                      key={`agent-log-${index}`}
                      className="rounded-2xl border border-slate-200 p-3 text-sm text-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="text-sm text-slate-500">
                  {t('activity.footer')}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
