import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createJsonResponse, getFetchRequestJson } from '../../../utils/http';

const getAllConfigs = vi.fn();

vi.mock('@/shared/models/config', () => ({
  getAllConfigs,
}));

describe('createEvolinkChatCompletion', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('sends max_completion_tokens for GPT-style EvoLink chat requests', async () => {
    getAllConfigs.mockResolvedValue({
      evolink_api_key: 'test-key',
      evolink_base_url: 'https://api.evolink.ai',
    });

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      createJsonResponse({
        choices: [
          {
            message: {
              content: 'planner output',
            },
          },
        ],
      })
    );

    const { createEvolinkChatCompletion } = await import(
      '@/shared/services/evolink-chat'
    );

    const content = await createEvolinkChatCompletion({
      model: 'gpt-5.4',
      messages: [
        {
          role: 'user',
          content: 'Plan this interview schedule.',
        },
      ],
      maxTokens: 900,
      temperature: 0.2,
    });

    expect(content).toBe('planner output');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.evolink.ai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      })
    );
    expect(getFetchRequestJson(fetchMock)).toEqual({
      model: 'gpt-5.4',
      messages: [
        {
          role: 'user',
          content: 'Plan this interview schedule.',
        },
      ],
      temperature: 0.2,
      max_completion_tokens: 900,
      stream: false,
    });
  });
});
