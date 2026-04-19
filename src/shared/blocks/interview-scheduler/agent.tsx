'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  Mail,
  RefreshCcw,
  Sparkles,
  UserCheck,
  Users,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Separator } from '@/shared/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

import {
  buildRecommendations,
  formatInTimezone,
  INTERVIEWERS,
  InterviewStage,
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

function getTimezoneOptions(t: ReturnType<typeof useTranslations>): TimezoneOption[] {
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

  const [candidateName, setCandidateName] = useState(() =>
    t('defaults.candidate_name')
  );
  const [candidateEmail, setCandidateEmail] = useState(() =>
    t('defaults.candidate_email')
  );
  const [candidateTimezone, setCandidateTimezone] = useState(
    'Asia/Singapore'
  );
  const [jobTitle, setJobTitle] = useState(() => t('defaults.job_title'));
  const [notes, setNotes] = useState(() => t('defaults.notes'));
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

  const recommendations = useMemo(
    () => buildRecommendations(candidateTimezone, stages),
    [candidateTimezone, stages]
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
      const isAnonymousDemoFallback =
        message.includes('status: 401') || message.includes('no auth');

      if (!isAnonymousDemoFallback) {
        toast.error(message);
      }

      setAgentLog([
        t('activity.run.read_profile', {
          candidate: candidateName,
          role: jobTitle,
        }),
        t('activity.run.detect_timezone', {
          timezone: candidateTimezone,
        }),
        t('activity.run.checked_calendars'),
        t('activity.run.sequenced_rounds'),
        t('activity.run.generated_options'),
      ]);
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

  return (
    <section
      id="demo"
      className={cn(
        'scroll-mt-24 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_32%),linear-gradient(to_bottom,#f8fafc,#eef2ff)] px-4 py-8 md:px-6',
        className
      )}
    >
      {srOnlyTitle ? <h2 className="sr-only">{srOnlyTitle}</h2> : null}

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-6">
          <Card
            id="overview"
            className="scroll-mt-24 relative overflow-hidden rounded-[28px] border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/60 backdrop-blur"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-500 to-amber-400" />
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl tracking-tight md:text-3xl">
                    {t('page.title')}
                  </CardTitle>
                  <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">
                    {t('page.description')}
                  </CardDescription>
                </div>
                <Badge className="rounded-full px-3 py-1 text-sm" variant="secondary">
                  <Sparkles className="mr-1 h-4 w-4" />
                  {t('badge')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
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
                <Label htmlFor="candidate-timezone">{t('form.candidate_timezone')}</Label>
                <Select value={candidateTimezone} onValueChange={setCandidateTimezone}>
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
                            {status ? (
                              <Badge>{statusLabels[status]}</Badge>
                            ) : null}
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
                              onClick={() => rescheduleStage(stage.id, alternatives)}
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
                                {formatTime(alternative.slot, candidateTimezone)} (
                                {candidateTimezone})
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
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                {t('candidate.title')}
              </CardTitle>
              <CardDescription className="text-slate-600">
                {t('candidate.description')}
              </CardDescription>
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
                    const isSelected = selectedCandidateOption?.slot === option.slot;
                    const optionTime = formatTime(option.slot, candidateTimezone);

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
                {t('dashboard.title')}
              </CardTitle>
              <CardDescription className="text-slate-600">
                {t('dashboard.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[24px] bg-slate-100 p-4">
                  <div className="text-sm text-slate-500">
                    {t('dashboard.stages_configured')}
                  </div>
                  <div className="mt-1 text-3xl font-semibold text-slate-900">
                    {stages.length}
                  </div>
                </div>
                <div className="rounded-[24px] bg-slate-100 p-4">
                  <div className="text-sm text-slate-500">{t('dashboard.booked')}</div>
                  <div
                    className="mt-1 text-3xl font-semibold text-slate-900"
                    data-testid="booked-count"
                  >
                    {totalBooked}
                  </div>
                </div>
                <div className="rounded-[24px] bg-slate-100 p-4">
                  <div className="text-sm text-slate-500">
                    {t('dashboard.interviewers')}
                  </div>
                  <div className="mt-1 text-3xl font-semibold text-slate-900">
                    {INTERVIEWERS.length}
                  </div>
                </div>
                <div className="rounded-[24px] bg-slate-100 p-4">
                  <div className="text-sm text-slate-500">
                    {t('dashboard.candidate_timezone')}
                  </div>
                  <div className="mt-1 break-all text-sm font-semibold text-slate-900">
                    {candidateTimezone}
                  </div>
                </div>
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
                  <TabsTrigger value="logic">{t('guide.tabs.logic')}</TabsTrigger>
                  <TabsTrigger value="actions">{t('guide.tabs.actions')}</TabsTrigger>
                  <TabsTrigger value="next">{t('guide.tabs.next')}</TabsTrigger>
                </TabsList>
                <TabsContent value="flow" className="space-y-3 pt-4 text-sm text-slate-700">
                  {flowSteps.map((step, index) => (
                    <div
                      key={`flow-step-${index}`}
                      className="rounded-[24px] border border-slate-200 p-4"
                    >
                      <div className="font-medium">{step.title}</div>
                      <div className="mt-1 text-slate-600">{step.description}</div>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="logic" className="space-y-3 pt-4 text-sm text-slate-700">
                  {logicItems.map((item, index) => (
                    <p key={`logic-item-${index}`}>{item}</p>
                  ))}
                </TabsContent>
                <TabsContent value="actions" className="space-y-3 pt-4 text-sm text-slate-700">
                  {actionItems.map((item, index) => (
                    <p key={`action-item-${index}`}>{item}</p>
                  ))}
                </TabsContent>
                <TabsContent value="next" className="space-y-3 pt-4 text-sm text-slate-700">
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
              <div className="text-sm text-slate-500">{t('activity.footer')}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
