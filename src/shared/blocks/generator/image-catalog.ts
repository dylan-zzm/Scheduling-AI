export type ImageGeneratorTab = 'text-to-image' | 'image-to-image';

export interface ImageModelOption {
  value: string;
  label: string;
  provider: string;
  scenes: ImageGeneratorTab[];
}

export interface ImageProviderOption {
  value: string;
  label: string;
}

export const DEFAULT_IMAGE_PROVIDER = 'evolink';

export const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  {
    value: 'gemini-3.1-flash-image-preview',
    label: 'Nano Banana 2',
    provider: 'evolink',
    scenes: ['text-to-image', 'image-to-image'],
  },
  {
    value: 'google/nano-banana-pro',
    label: 'Nano Banana Pro',
    provider: 'replicate',
    scenes: ['text-to-image', 'image-to-image'],
  },
  {
    value: 'bytedance/seedream-4',
    label: 'Seedream 4',
    provider: 'replicate',
    scenes: ['text-to-image', 'image-to-image'],
  },
  {
    value: 'fal-ai/nano-banana-pro',
    label: 'Nano Banana Pro',
    provider: 'fal',
    scenes: ['text-to-image'],
  },
  {
    value: 'fal-ai/nano-banana-pro/edit',
    label: 'Nano Banana Pro',
    provider: 'fal',
    scenes: ['image-to-image'],
  },
  {
    value: 'fal-ai/bytedance/seedream/v4/edit',
    label: 'Seedream 4',
    provider: 'fal',
    scenes: ['image-to-image'],
  },
  {
    value: 'fal-ai/z-image/turbo',
    label: 'Z-Image Turbo',
    provider: 'fal',
    scenes: ['text-to-image'],
  },
  {
    value: 'fal-ai/flux-2-flex',
    label: 'Flux 2 Flex',
    provider: 'fal',
    scenes: ['text-to-image'],
  },
  {
    value: 'gemini-3-pro-image-preview',
    label: 'Gemini 3 Pro Image Preview',
    provider: 'gemini',
    scenes: ['text-to-image', 'image-to-image'],
  },
  {
    value: 'nano-banana-pro',
    label: 'Nano Banana Pro',
    provider: 'kie',
    scenes: ['text-to-image', 'image-to-image'],
  },
];

export const IMAGE_PROVIDER_OPTIONS: ImageProviderOption[] = [
  {
    value: 'evolink',
    label: 'EvoLink',
  },
  {
    value: 'replicate',
    label: 'Replicate',
  },
  {
    value: 'fal',
    label: 'Fal',
  },
  {
    value: 'gemini',
    label: 'Gemini',
  },
  {
    value: 'kie',
    label: 'Kie',
  },
];

export function getAvailableImageModels(
  scene: ImageGeneratorTab,
  provider: string
) {
  return IMAGE_MODEL_OPTIONS.filter(
    (option) => option.scenes.includes(scene) && option.provider === provider
  );
}

export function getDefaultImageModel(
  scene: ImageGeneratorTab,
  provider = DEFAULT_IMAGE_PROVIDER
) {
  return getAvailableImageModels(scene, provider)[0]?.value ?? '';
}
