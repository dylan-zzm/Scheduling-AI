import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { InterviewSchedulerAgent } from '@/shared/blocks/interview-scheduler';
import { getMetadata } from '@/shared/lib/seo';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const revalidate = 3600;

export const generateMetadata = getMetadata({
  metadataKey: 'ai.interview_scheduler.metadata',
  canonicalUrl: '/ai-interview-scheduler',
});

export default async function AiInterviewSchedulerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('ai.interview_scheduler');

  const page: DynamicPage = {
    sections: {
      hero: {
        title: t('page.title'),
        description: t('page.description'),
        background_image: {
          src: '/imgs/bg/tree.jpg',
          alt: 'hero background',
        },
      },
      scheduler: {
        component: <InterviewSchedulerAgent srOnlyTitle={t('page.title')} />,
      },
    },
  };

  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
