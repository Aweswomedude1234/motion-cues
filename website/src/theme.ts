import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

/**
 * SteadyCues builds on Astryx's neutral theme (quiet grays, Figtree): a misty off-white page
 * that picks up the fog in the hero photograph, white cards, neutral ink, and moss green as
 * the only accent. The page runs in light mode; the dark values are used where MediaTheme
 * flips a surface, such as the demo dock and the closing photo band.
 */
export const steadyTheme = defineTheme({
  name: 'steadycues',
  extends: neutralTheme,
  tokens: {
    '--color-background-body': ['#F4F5F2', '#1C1C1C'],
    '--color-background-surface': ['#F4F5F2', '#1C1C1C'],
    '--color-background-card': ['#FFFFFF', '#262626'],
    '--color-background-popover': ['#FFFFFF', '#262626'],
    '--color-background-muted': ['#EBEDE8', '#2E2E2E'],
    '--color-text-primary': ['#161716', '#F2F2F2'],
    '--color-text-secondary': ['#595C57', '#C4C4C4'],
    '--color-icon-primary': ['#161716', '#F2F2F2'],
    '--color-icon-secondary': ['#595C57', '#C4C4C4'],
    '--color-border': ['#16171614', '#FFFFFF1F'],
    '--color-border-emphasized': ['#D3D6CF', '#4A4A4A'],
    '--color-accent': ['#161716', '#F2F2F2'],
    '--color-accent-muted': ['#4B634014', '#CFE0B81F'],
    '--color-text-accent': ['#4B6340', '#CFE0B8'],
    '--color-icon-accent': ['#4B6340', '#CFE0B8'],
  },
});
