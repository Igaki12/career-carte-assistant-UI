export const lightPageBg = 'linear(135deg, #ffffff 0%, #f7f7f8 52%, #eeeeef 100%)';
export const lightPanelBg = 'rgba(250, 250, 251, 0.78)';
export const lightPanelStrongBg = 'rgba(252, 252, 253, 0.94)';
export const lightPanelSubtleBg = 'rgba(244, 244, 245, 0.86)';
export const lightText = '#27272a';
export const lightMutedText = '#52525b';
export const lightSubtleText = '#71717a';
export const lightBorder = 'rgba(82, 82, 91, 0.26)';
export const lightBorderStrong = 'rgba(63, 63, 70, 0.42)';
export const lightTopLine = 'linear(104deg, transparent 0%, rgba(75, 85, 99, 0.10) 9%, rgba(31, 41, 55, 0.74) 17%, rgba(156, 163, 175, 0.30) 28%, rgba(75, 85, 99, 0.58) 39%, rgba(31, 41, 55, 0.76) 56%, rgba(75, 85, 99, 0.46) 74%, transparent 100%)';
export const lightBottomLine = 'linear(112deg, transparent 0%, rgba(156, 163, 175, 0.20) 12%, rgba(75, 85, 99, 0.46) 20%, rgba(31, 41, 55, 0.38) 38%, rgba(156, 163, 175, 0.52) 49%, rgba(75, 85, 99, 0.34) 79%, transparent 100%)';
export const lightShadow = '0 24px 70px rgba(63, 63, 70, 0.14)';
export const lightModalShadow = '0 32px 96px rgba(39, 39, 42, 0.20)';
export const lightModalChromeBg = 'linear-gradient(135deg, rgba(252, 252, 253, 0.98), rgba(244, 244, 245, 0.96))';

export const lightFormSurfaceProps = {
  bg: '#fcfcfd',
  color: lightText,
  borderColor: lightBorder,
  _placeholder: { color: lightSubtleText },
  _hover: { borderColor: lightBorderStrong },
  _focus: { borderColor: 'rgba(63, 63, 70, 0.62)', boxShadow: '0 0 0 1px rgba(63, 63, 70, 0.24)' },
} as const;

export const lightOutlineButtonProps = {
  variant: 'outline',
  color: lightText,
  borderColor: lightBorderStrong,
  _hover: { bg: 'rgba(244, 244, 245, 0.86)', borderColor: 'rgba(63, 63, 70, 0.56)' },
} as const;

export const lightTableActionButtonProps = {
  variant: 'outline',
  color: lightText,
  borderColor: lightBorderStrong,
  _hover: { bg: 'rgba(244, 244, 245, 0.86)', color: lightText, borderColor: 'rgba(63, 63, 70, 0.56)' },
  _disabled: {
    color: '#a1a1aa',
    borderColor: 'rgba(82, 82, 91, 0.18)',
    opacity: 0.65,
  },
} as const;
