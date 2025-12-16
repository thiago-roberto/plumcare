// PlumCare theme using Titan Intake brand colors (Orange & Cream)
import type { MantineThemeOverride } from '@mantine/core';

// Titan Intake brand color palette - Orange & Cream
export const plumcareColors = {
  // Primary orange palette
  orange: [
    '#fff8f0',
    '#ffead9',
    '#ffd4b3',
    '#ffbd8c',
    '#ffa666',
    '#ff8f40',
    '#ff5500', // 6 - Primary orange
    '#e64d00',
    '#cc4400',
    '#b33c00',
  ] as const,

  // Cream/neutral palette
  cream: [
    '#fffdf7',
    '#fff9ed',
    '#fff5e3',
    '#f0ebe0',
    '#e0d9cc',
    '#ccc4b5',
    '#a8a090',
    '#8a8275',
    '#6b645a',
    '#4d4840',
  ] as const,
};

export const plumcareTheme: MantineThemeOverride = {
  primaryColor: 'plumcareOrange',
  colors: {
    plumcareOrange: plumcareColors.orange,
    plumcareCream: plumcareColors.cream,
  },
  headings: {
    fontFamily: 'Inter, sans-serif',
    sizes: {
      h1: {
        fontSize: '1.75rem',
        fontWeight: '600',
        lineHeight: '1.3',
      },
      h2: {
        fontSize: '1.375rem',
        fontWeight: '600',
        lineHeight: '1.4',
      },
      h3: {
        fontSize: '1.125rem',
        fontWeight: '500',
        lineHeight: '1.5',
      },
    },
  },
  fontFamily: 'Inter, sans-serif',
  fontSizes: {
    xs: '0.6875rem',
    sm: '0.875rem',
    md: '0.875rem',
    lg: '1.0rem',
    xl: '1.125rem',
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
};
