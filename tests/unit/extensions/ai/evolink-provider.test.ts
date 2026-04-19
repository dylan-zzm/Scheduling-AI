import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EvolinkProvider } from '@/extensions/ai/evolink';
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';
import {
  createJsonResponse,
  getFetchRequestJson,
} from '../../../utils/http';

describe('EvolinkProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a Nano Banana generation task for text-to-image', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      createJsonResponse(
        {
          id: 'task-unified-123',
          status: 'pending',
          created: 1757165031,
          model: 'gemini-3.1-flash-image-preview',
        },
        { status: 200 }
      )
    );

    const provider = new EvolinkProvider({ apiKey: 'test-key' });
    const result = await provider.generate({
      params: {
        mediaType: AIMediaType.IMAGE,
        model: 'gemini-3.1-flash-image-preview',
        prompt: 'A banana spaceship floating in the clouds',
      },
    });

    expect(result.taskId).toBe('task-unified-123');
    expect(result.taskStatus).toBe(AITaskStatus.PENDING);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.evolink.ai/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
        body: JSON.stringify({
          model: 'gemini-3.1-flash-image-preview',
          prompt: 'A banana spaceship floating in the clouds',
          size: 'auto',
          quality: '2K',
        }),
      })
    );
  });

  it('maps image-to-image options into Evolink request fields', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      createJsonResponse(
        {
          id: 'task-unified-456',
          status: 'processing',
          created: 1757165031,
        },
        { status: 200 }
      )
    );

    const provider = new EvolinkProvider({ apiKey: 'test-key' });
    await provider.generate({
      params: {
        mediaType: AIMediaType.IMAGE,
        model: 'gemini-3.1-flash-image-preview',
        prompt: 'Turn this cat into a watercolor postcard',
        callbackUrl: 'http://localhost:3000/api/ai/notify/evolink',
        options: {
          image_input: ['https://cdn.example.com/reference.png'],
          size: '1:1',
          quality: '4K',
          thinking_level: 'high',
          web_search: true,
        },
      },
    });

    expect(getFetchRequestJson(fetchMock)).toEqual({
      model: 'gemini-3.1-flash-image-preview',
      prompt: 'Turn this cat into a watercolor postcard',
      size: '1:1',
      quality: '4K',
      image_urls: ['https://cdn.example.com/reference.png'],
      model_params: {
        thinking_level: 'high',
        web_search: true,
      },
    });
  });

  it('maps completed task results into AI images', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      createJsonResponse(
        {
          id: 'task-unified-789',
          status: 'completed',
          created: 1757165031,
          results: ['https://cdn.example.com/generated.png'],
        },
        { status: 200 }
      )
    );

    const provider = new EvolinkProvider({ apiKey: 'test-key' });
    const result = await provider.query({ taskId: 'task-unified-789' });

    expect(result.taskStatus).toBe(AITaskStatus.SUCCESS);
    expect(result.taskInfo?.images).toEqual([
      expect.objectContaining({
        imageUrl: 'https://cdn.example.com/generated.png',
      }),
    ]);
  });
});
