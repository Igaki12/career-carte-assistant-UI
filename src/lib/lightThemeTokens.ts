export const lightPageBg = 'linear(135deg, #ffffff 0%, #f8fafc 52%, #e5e7eb 100%)';
export const lightPanelBg = 'rgba(255, 255, 255, 0.74)';
export const lightPanelStrongBg = 'rgba(255, 255, 255, 0.92)';
export const lightPanelSubtleBg = 'rgba(248, 250, 252, 0.82)';
export const lightText = 'gray.900';
export const lightMutedText = 'gray.600';
export const lightSubtleText = 'gray.500';
export const lightBorder = 'rgba(148, 163, 184, 0.32)';
export const lightBorderStrong = 'rgba(100, 116, 139, 0.44)';
export const lightTopLine = 'linear(to-r, transparent, rgba(148, 163, 184, 0.54), rgba(100, 116, 139, 0.68), transparent)';
export const lightBottomLine = 'linear(to-r, transparent, rgba(203, 213, 225, 0.72), rgba(148, 163, 184, 0.64), transparent)';
export const lightShadow = '0 24px 70px rgba(15, 23, 42, 0.12)';
export const lightModalShadow = '0 32px 96px rgba(15, 23, 42, 0.20)';
export const lightModalChromeBg = 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.96))';

export const lightFormSurfaceProps = {
  bg: 'white',
  color: lightText,
  borderColor: lightBorder,
  _placeholder: { color: lightSubtleText },
  _hover: { borderColor: lightBorderStrong },
  _focus: { borderColor: 'rgba(71, 85, 105, 0.72)', boxShadow: '0 0 0 1px rgba(100, 116, 139, 0.28)' },
} as const;

export const lightOutlineButtonProps = {
  variant: 'outline',
  color: lightText,
  borderColor: lightBorderStrong,
  _hover: { bg: 'gray.100', borderColor: 'rgba(71, 85, 105, 0.62)' },
} as const;

export const lightTableActionButtonProps = {
  variant: 'outline',
  color: lightText,
  borderColor: lightBorderStrong,
  _hover: { bg: 'gray.100', color: lightText, borderColor: 'rgba(71, 85, 105, 0.62)' },
  _disabled: {
    color: 'gray.400',
    borderColor: 'gray.200',
    opacity: 0.65,
  },
} as const;
