import { describe, expect, it } from 'vitest';

import {
  DEFAULT_IMAGE_PROVIDER,
  getAvailableImageModels,
  getDefaultImageModel,
} from '@/shared/blocks/generator/image-catalog';

describe('image-catalog', () => {
  it('defaults to Evolink for the Nano Banana experience', () => {
    expect(DEFAULT_IMAGE_PROVIDER).toBe('evolink');
    expect(getDefaultImageModel('text-to-image')).toBe(
      'gemini-3.1-flash-image-preview'
    );
  });

  it('returns scene-aware models for each provider', () => {
    expect(
      getAvailableImageModels('image-to-image', 'evolink').map(
        (option) => option.value
      )
    ).toEqual(['gemini-3.1-flash-image-preview']);

    expect(
      getAvailableImageModels('text-to-image', 'fal').some((option) =>
        option.value.includes('nano-banana-pro')
      )
    ).toBe(true);
  });
});
