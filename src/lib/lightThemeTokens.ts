export const lightPageBg = 'linear(135deg, #ffffff 0%, #f7f7f8 52%, #eeeeef 100%)';
export const lightPanelBg = 'rgba(250, 250, 251, 0.78)';
export const lightPanelStrongBg = 'rgba(252, 252, 253, 0.94)';
export const lightPanelSubtleBg = 'rgba(244, 244, 245, 0.86)';
export const lightText = '#12384d';
export const lightMutedText = '#3f6678';
export const lightSubtleText = '#66889a';
export const lightBorder = 'rgba(22, 94, 131, 0.30)';
export const lightBorderStrong = 'rgba(22, 94, 131, 0.46)';
export const lightTopLine = 'linear(to-r, transparent, rgba(22, 94, 131, 0.50), rgba(61, 121, 150, 0.68), transparent)';
export const lightBottomLine = 'linear(to-r, transparent, rgba(116, 164, 187, 0.58), rgba(22, 94, 131, 0.46), transparent)';
export const lightShadow = '0 24px 70px rgba(22, 94, 131, 0.14)';
export const lightModalShadow = '0 32px 96px rgba(22, 94, 131, 0.20)';
export const lightModalChromeBg = 'linear-gradient(135deg, rgba(252, 252, 253, 0.98), rgba(244, 244, 245, 0.96))';

export const lightFormSurfaceProps = {
  bg: '#fcfcfd',
  color: lightText,
  borderColor: lightBorder,
  _placeholder: { color: lightSubtleText },
  _hover: { borderColor: lightBorderStrong },
  _focus: { borderColor: 'rgba(22, 94, 131, 0.72)', boxShadow: '0 0 0 1px rgba(22, 94, 131, 0.28)' },
} as const;

export const lightOutlineButtonProps = {
  variant: 'outline',
  color: lightText,
  borderColor: lightBorderStrong,
  _hover: { bg: 'rgba(244, 244, 245, 0.86)', borderColor: 'rgba(22, 94, 131, 0.62)' },
} as const;

export const lightTableActionButtonProps = {
  variant: 'outline',
  color: lightText,
  borderColor: lightBorderStrong,
  _hover: { bg: 'rgba(244, 244, 245, 0.86)', color: lightText, borderColor: 'rgba(22, 94, 131, 0.62)' },
  _disabled: {
    color: '#8aa7b5',
    borderColor: 'rgba(22, 94, 131, 0.18)',
    opacity: 0.65,
  },
} as const;
