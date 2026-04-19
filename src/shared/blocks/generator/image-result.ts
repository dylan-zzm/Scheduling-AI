export function parseTaskResult(taskResult: string | null) {
  if (!taskResult) {
    return null;
  }

  try {
    return JSON.parse(taskResult);
  } catch (error) {
    console.warn('Failed to parse taskResult:', error);
    return null;
  }
}

export function extractImageUrls(result: any): string[] {
  if (!result) {
    return [];
  }

  const output =
    result.output ?? result.images ?? result.results ?? result.data;

  if (!output) {
    return [];
  }

  if (typeof output === 'string') {
    return [output];
  }

  if (Array.isArray(output)) {
    return output
      .flatMap((item) => {
        if (!item) return [];
        if (typeof item === 'string') return [item];
        if (typeof item === 'object') {
          const candidate =
            item.url ??
            item.uri ??
            item.image ??
            item.src ??
            item.imageUrl ??
            item.output;
          return typeof candidate === 'string' ? [candidate] : [];
        }
        return [];
      })
      .filter(Boolean);
  }

  if (typeof output === 'object') {
    const candidate =
      output.url ??
      output.uri ??
      output.image ??
      output.src ??
      output.imageUrl ??
      output.output;
    if (typeof candidate === 'string') {
      return [candidate];
    }
  }

  return [];
}
