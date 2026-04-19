import { describe, expect, it } from 'vitest';

import { getAIManagerWithConfigs } from '@/shared/services/ai';

describe('getAIManagerWithConfigs', () => {
  it('registers the Evolink provider when an api key is configured', () => {
    const manager = getAIManagerWithConfigs({
      evolink_api_key: 'sk-test',
      evolink_base_url: 'https://api.evolink.ai',
      evolink_custom_storage: 'false',
    } as any);

    const provider = manager.getProvider('evolink');

    expect(provider).toBeDefined();
    expect(provider?.name).toBe('evolink');
  });
});
