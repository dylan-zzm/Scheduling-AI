import { getAllConfigs } from '@/shared/models/config';

export interface EvolinkChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface EvolinkChatResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

export async function createEvolinkChatCompletion({
  model = 'gpt-5.4',
  messages,
  temperature = 0.2,
  maxTokens = 1800,
}: {
  model?: string;
  messages: EvolinkChatMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  const configs = await getAllConfigs();
  const apiKey = configs.evolink_api_key;

  if (!apiKey) {
    throw new Error('evolink_api_key is not set');
  }

  const baseUrl = configs.evolink_base_url || 'https://api.evolink.ai';

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      // EvoLink's GPT-5.4 endpoint rejects `max_tokens` and expects
      // `max_completion_tokens` instead.
      max_completion_tokens: maxTokens,
      stream: false,
    }),
  });

  const data = (await response.json()) as EvolinkChatResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.message || `request failed with status: ${response.status}`
    );
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('empty response from Evolink chat completion');
  }

  return content;
}
