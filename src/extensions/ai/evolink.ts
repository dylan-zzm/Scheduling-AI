import { getUuid } from '@/shared/lib/hash';

import { saveFiles } from '.';
import {
  AIConfigs,
  AIFile,
  AIGenerateParams,
  AIImage,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
} from './types';

export interface EvolinkConfigs extends AIConfigs {
  apiKey: string;
  baseUrl?: string;
  customStorage?: boolean;
}

interface EvolinkErrorResponse {
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
}

interface EvolinkGenerateResponse extends EvolinkErrorResponse {
  created?: number;
  id?: string;
  model?: string;
  progress?: number;
  status?: string;
  task_info?: {
    can_cancel?: boolean;
    estimated_time?: number;
  };
}

interface EvolinkTaskResponse extends EvolinkErrorResponse {
  created?: number;
  id?: string;
  model?: string;
  progress?: number;
  results?: string[];
  status?: string;
  task_info?: {
    can_cancel?: boolean;
  };
}

/**
 * Evolink provider
 * @docs https://docs.evolink.ai/en/api-manual/image-series/nanobanana/nanobanana-2-image-generate
 */
export class EvolinkProvider implements AIProvider {
  readonly name = 'evolink';
  configs: EvolinkConfigs;

  private baseUrl: string;

  constructor(configs: EvolinkConfigs) {
    this.configs = configs;
    this.baseUrl = configs.baseUrl || 'https://api.evolink.ai';
  }

  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const { mediaType, model, prompt, options } = params;

    if (mediaType !== AIMediaType.IMAGE) {
      throw new Error(`mediaType not supported: ${mediaType}`);
    }

    if (!model) {
      throw new Error('model is required');
    }

    if (!prompt) {
      throw new Error('prompt is required');
    }

    const payload: Record<string, any> = {
      model,
      prompt,
      size: options?.size ?? 'auto',
      quality: options?.quality ?? '2K',
    };

    if (options?.image_input && Array.isArray(options.image_input)) {
      payload.image_urls = options.image_input;
    }

    const modelParams: Record<string, any> = {};
    if (typeof options?.web_search === 'boolean') {
      modelParams.web_search = options.web_search;
    }
    if (options?.thinking_level) {
      modelParams.thinking_level = options.thinking_level;
    }
    if (Object.keys(modelParams).length > 0) {
      payload.model_params = modelParams;
    }

    const data = await this.request<EvolinkGenerateResponse>({
      path: '/v1/images/generations',
      method: 'POST',
      body: payload,
    });

    if (!data.id) {
      throw new Error('generate image failed: no task id');
    }

    return {
      taskStatus: this.mapStatus(data.status),
      taskId: data.id,
      taskInfo: {
        status: data.status,
        createTime: this.toDate(data.created),
      },
      taskResult: data,
    };
  }

  async query({ taskId }: { taskId: string }): Promise<AITaskResult> {
    const data = await this.request<EvolinkTaskResponse>({
      path: `/v1/tasks/${taskId}`,
      method: 'GET',
    });

    const taskStatus = this.mapStatus(data.status);
    let images = this.buildImages(data);

    if (taskStatus === AITaskStatus.SUCCESS && images.length > 0) {
      images = await this.maybeSaveImages(images);
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        images,
        status: data.status,
        errorCode: data.error?.code,
        errorMessage: data.error?.message,
        createTime: this.toDate(data.created),
      },
      taskResult: data,
    };
  }

  private async request<T>({
    path,
    method,
    body,
  }: {
    path: string;
    method: 'GET' | 'POST';
    body?: Record<string, any>;
  }): Promise<T> {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.configs.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await resp.json()) as T & EvolinkErrorResponse;

    if (!resp.ok) {
      throw new Error(
        data.error?.message || `request failed with status: ${resp.status}`
      );
    }

    if (data.error?.message) {
      throw new Error(data.error.message);
    }

    return data;
  }

  private buildImages(data: EvolinkTaskResponse): AIImage[] {
    if (!Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((imageUrl) => ({
      id: '',
      createTime: this.toDate(data.created),
      imageUrl,
    }));
  }

  private async maybeSaveImages(images: AIImage[]): Promise<AIImage[]> {
    if (!this.configs.customStorage) {
      return images;
    }

    const filesToSave: AIFile[] = images
      .map((image, index) => {
        if (!image.imageUrl) {
          return null;
        }

        return {
          url: image.imageUrl,
          contentType: 'image/png',
          key: `evolink/image/${getUuid()}.png`,
          index,
          type: 'image',
        } satisfies AIFile;
      })
      .filter(Boolean) as AIFile[];

    if (filesToSave.length === 0) {
      return images;
    }

    const uploadedFiles = await saveFiles(filesToSave);
    if (!uploadedFiles) {
      return images;
    }

    uploadedFiles.forEach((file) => {
      if (!file.url || file.index === undefined) {
        return;
      }

      const image = images[file.index];
      if (image) {
        image.imageUrl = file.url;
      }
    });

    return images;
  }

  private mapStatus(status?: string): AITaskStatus {
    switch (status) {
      case 'pending':
        return AITaskStatus.PENDING;
      case 'processing':
        return AITaskStatus.PROCESSING;
      case 'completed':
        return AITaskStatus.SUCCESS;
      case 'failed':
        return AITaskStatus.FAILED;
      default:
        return AITaskStatus.PENDING;
    }
  }

  private toDate(unixSeconds?: number) {
    return unixSeconds ? new Date(unixSeconds * 1000) : new Date();
  }
}
