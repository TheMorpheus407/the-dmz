import type { Preview } from '@storybook/svelte';
import { themes } from '@storybook/theming';

import '../src/lib/ui/tokens/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      theme: themes.light,
    },
    backgrounds: {
      default: 'green',
      values: [
        { name: 'green', value: '#0d1117' },
        { name: 'amber', value: '#1c1917' },
        { name: 'high-contrast', value: '#000000' },
        { name: 'enterprise', value: '#f8fafc' },
      ],
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'green',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['green', 'amber', 'high-contrast', 'enterprise'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'green';
      return {
        setup: () => {
          document.documentElement.dataset.theme = theme;

          if (theme === 'high-contrast' || theme === 'enterprise') {
            document.documentElement.dataset.scanlines = 'off';
            document.documentElement.dataset.curvature = 'off';
            document.documentElement.dataset.glow = 'off';
            document.documentElement.dataset.noise = 'off';
            document.documentElement.dataset.vignette = 'off';
          } else {
            document.documentElement.dataset.scanlines = 'on';
            document.documentElement.dataset.curvature = 'on';
            document.documentElement.dataset.glow = 'on';
            document.documentElement.dataset.noise = 'off';
            document.documentElement.dataset.vignette = 'on';
          }
        },
        Template: Story,
      };
    },
  ],
};

export default preview;
