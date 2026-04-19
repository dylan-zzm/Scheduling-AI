import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

export function renderWithIntl(
  ui: ReactElement,
  {
    locale = 'en',
    messages = {},
  }: {
    locale?: string;
    messages?: Record<string, unknown>;
  } = {}
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}
