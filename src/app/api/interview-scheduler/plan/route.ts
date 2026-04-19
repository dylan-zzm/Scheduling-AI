import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import {
  buildInterviewPlannerMessages,
  InterviewPlannerInput,
  parseInterviewPlannerResult,
} from '@/shared/blocks/interview-scheduler/planner';
import { createEvolinkChatCompletion } from '@/shared/services/evolink-chat';

export async function POST(req: Request) {
  try {
    const isPublicDemoEnabled =
      process.env.INTERVIEW_SCHEDULER_PUBLIC_DEMO_ENABLED === 'true';
    const user = await getUserInfo();
    if (!user && !isPublicDemoEnabled) {
      return respErr('no auth, please sign in');
    }

    const body = (await req.json()) as InterviewPlannerInput;

    if (
      !body?.candidateName ||
      !body?.candidateEmail ||
      !body?.candidateTimezone ||
      !body?.jobTitle ||
      !Array.isArray(body?.recommendations)
    ) {
      return respErr('invalid params');
    }

    const messages = buildInterviewPlannerMessages(body);
    const content = await createEvolinkChatCompletion({
      model: 'gpt-5.4',
      messages,
    });
    const plan = parseInterviewPlannerResult(content);

    return respData(plan);
  } catch (e: any) {
    console.log('interview planner failed:', e);
    return respErr(e.message || 'interview planner failed');
  }
}
