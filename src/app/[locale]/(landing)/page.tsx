import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { InterviewSchedulerAgent } from '@/shared/blocks/interview-scheduler';
import { getMetadata } from '@/shared/lib/seo';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const revalidate = 3600;
export const generateMetadata = getMetadata({
  metadataKey: 'ai.interview_scheduler.metadata',
  canonicalUrl: '/',
});

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ai = await getTranslations('ai.interview_scheduler');
  const t = await getTranslations('pages.index');

  const page: DynamicPage = t.raw('page');
  page.title = ai('page.title');
  page.description = ai('page.description');
  page.sections = page.sections || {};
  page.sections.hero = {
    ...(page.sections.hero || {}),
    id: 'hero',
    component: (
      <InterviewSchedulerAgent
        srOnlyTitle={ai('page.title')}
        className="pt-20 md:pt-24"
      />
    ),
  };

  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
