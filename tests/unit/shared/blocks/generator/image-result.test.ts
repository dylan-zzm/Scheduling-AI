import { describe, expect, it } from 'vitest';

import {
  extractImageUrls,
  parseTaskResult,
} from '@/shared/blocks/generator/image-result';

describe('image-result', () => {
  it('parses stored task JSON safely', () => {
    expect(
      parseTaskResult(
        '{"images":[{"imageUrl":"https://cdn.example.com/a.png"}]}'
      )
    ).toEqual({
      images: [{ imageUrl: 'https://cdn.example.com/a.png' }],
    });

    expect(parseTaskResult('invalid-json')).toBeNull();
  });

  it('extracts urls from normalized taskInfo image arrays', () => {
    expect(
      extractImageUrls({
        images: [{ imageUrl: 'https://cdn.example.com/a.png' }],
      })
    ).toEqual(['https://cdn.example.com/a.png']);
  });

  it('extracts urls from raw provider results arrays', () => {
    expect(
      extractImageUrls({
        results: [
          'https://cdn.example.com/a.png',
          'https://cdn.example.com/b.png',
        ],
      })
    ).toEqual([
      'https://cdn.example.com/a.png',
      'https://cdn.example.com/b.png',
    ]);
  });
});
