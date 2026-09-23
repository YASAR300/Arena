import { COLORS } from './colors';
import { SPACING, RADIUS, SHADOWS, SCREEN } from './layout';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from './typography';

/**
 * Unified Theme Configuration for Feedants Arena Mobile Application
 * Perfectly aligned with the Objective_Page.png design tokens
 */
export const THEME = {
  colors: {
    ...COLORS,
    // Pixel-matched UI tokens
    brandDarkTeal: '#005F60',
    brandTeal: '#008080',
    brandMint: '#E6F4F4',
    brandLightMint: '#F0F9F9',
    mintTagBg: '#EAF6F6',
    mintTagText: '#007A78',
    cardBorder: '#EBF0F2',
    dateGridBorder: '#EAEFF2',
    pillEngBg: '#005F60',
    pillInactiveText: '#4A5568',
    chipBg: '#F1F4F6',
    chipText: '#374151',
    hurryUpText: '#007A78',
    rewardGold: '#F59E0B',
    rewardSilver: '#94A3B8',
    rewardBronze: '#D97706',
    rewardStar: '#0D9488',
    referralBg: '#E8F8F5',
    referralBorder: '#C7EFE6',
    referralBtn: '#007A78',
    adBorder: '#CBD5E1',
    registeredPillBg: '#E6F4EA',
    registeredPillText: '#0D8A4E',
  },
  spacing: SPACING,
  radius: RADIUS,
  shadows: SHADOWS,
  fonts: {
    sizes: FONT_SIZES,
    weights: FONT_WEIGHTS,
    lineHeights: LINE_HEIGHTS,
  },
  screen: SCREEN,
};

export default THEME;
