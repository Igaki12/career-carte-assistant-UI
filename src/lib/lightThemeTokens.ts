export const lightPageBg = 'linear(135deg, #ffffff 0%, #f7f7f8 52%, #eeeeef 100%)';
export const lightPanelBg = 'rgba(250, 250, 251, 0.78)';
export const lightPanelStrongBg = 'rgba(252, 252, 253, 0.94)';
export const lightPanelSubtleBg = 'rgba(244, 244, 245, 0.86)';
export const lightText = '#27272a';
export const lightMutedText = '#52525b';
export const lightSubtleText = '#71717a';
export const lightBorder = 'rgba(82, 82, 91, 0.26)';
export const lightBorderStrong = 'rgba(63, 63, 70, 0.42)';
export const lightTopLine = 'linear(104deg, rgba(75, 85, 99, 0.12) 0%, rgba(31, 41, 55, 0.76) 32%, rgba(75, 85, 99, 0.38) 70%, transparent 100%)';
export const lightBottomLine = 'linear(112deg, rgba(156, 163, 175, 0.16) 0%, rgba(31, 41, 55, 0.48) 31%, rgba(75, 85, 99, 0.30) 72%, transparent 100%)';
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
