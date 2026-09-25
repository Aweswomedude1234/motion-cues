import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

/**
 * SteadyCues keeps Astryx's neutral theme (quiet grays, Figtree) and adds one brand hue,
 * a calm teal, for accent text and icons. Buttons stay neutral so the dots stay the star.
 */
export const steadyTheme = defineTheme({
  name: 'steadycues',
  extends: neutralTheme,
  tokens: {
    '--color-text-accent': ['#0E7490', '#67E8F9'],
    '--color-icon-accent': ['#0E7490', '#22D3EE'],
  },
});
