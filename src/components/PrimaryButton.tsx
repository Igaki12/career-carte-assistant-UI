import { Button, type ButtonProps } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const gradientFlow = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const waveDrift = keyframes`
  0% {
    transform: translateX(-18%) translateY(20%) rotate(0deg);
    opacity: 0.18;
  }
  50% {
    transform: translateX(10%) translateY(-18%) rotate(8deg);
    opacity: 0.32;
  }
  100% {
    transform: translateX(-18%) translateY(20%) rotate(0deg);
    opacity: 0.18;
  }
`;

const sheenSweep = keyframes`
  0% {
    transform: translateX(-135%) skewX(-18deg);
    opacity: 0;
  }
  24% {
    opacity: 0;
  }
  42% {
    opacity: 0.45;
  }
  60% {
    opacity: 0;
  }
  100% {
    transform: translateX(135%) skewX(-18deg);
    opacity: 0;
  }
`;

function PrimaryButton({ children, sx, _hover, _active, _disabled, isDisabled, disabled, ...props }: ButtonProps) {
  const isButtonDisabled = Boolean(isDisabled || disabled);

  return (
    <Button
      color={isButtonDisabled ? 'gray.100' : 'white'}
      position="relative"
      overflow="hidden"
      borderRadius="md"
      borderWidth="1px"
      borderColor={isButtonDisabled ? 'rgba(148, 163, 184, 0.2)' : 'rgba(226, 232, 240, 0.24)'}
      bgGradient={
        isButtonDisabled
          ? 'linear(115deg, rgba(100, 116, 139, 0.72), rgba(148, 163, 184, 0.66), rgba(203, 213, 225, 0.58))'
          : 'linear(115deg, #334155 0%, #475569 24%, #64748b 48%, #475569 72%, #334155 100%)'
      }
      backgroundSize="260% 260%"
      boxShadow={
        isButtonDisabled
          ? 'inset 0 1px 0 rgba(255, 255, 255, 0.20)'
          : '0 14px 30px rgba(71, 85, 105, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.24)'
      }
      animation={isButtonDisabled ? 'none' : `${gradientFlow} 9s ease-in-out infinite`}
      transition="transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, filter 0.18s ease"
      _before={{
        content: '""',
        position: 'absolute',
        inset: '-75%',
        bg: isButtonDisabled
          ? 'linear-gradient(135deg, rgba(248, 250, 252, 0.22), transparent 44%, rgba(100, 116, 139, 0.12))'
          : 'radial-gradient(ellipse at 20% 50%, rgba(226, 232, 240, 0.22), transparent 34%), radial-gradient(ellipse at 72% 44%, rgba(100, 116, 139, 0.28), transparent 32%)',
        filter: isButtonDisabled ? 'none' : 'blur(10px)',
        animation: isButtonDisabled ? 'none' : `${waveDrift} 6.8s ease-in-out infinite`,
        pointerEvents: 'none',
      }}
      _after={{
        content: '""',
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '42%',
        left: 0,
        bg: isButtonDisabled ? 'transparent' : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.42), transparent)',
        animation: isButtonDisabled ? 'none' : `${sheenSweep} 4.8s ease-in-out infinite`,
        pointerEvents: 'none',
      }}
      _hover={{
        transform: 'translateY(-1px)',
        borderColor: 'rgba(241, 245, 249, 0.42)',
        boxShadow: '0 18px 38px rgba(71, 85, 105, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.28)',
        filter: 'saturate(1.04)',
        ..._hover,
      }}
      _active={{
        transform: 'translateY(0)',
        boxShadow: '0 9px 22px rgba(71, 85, 105, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        ..._active,
      }}
      _disabled={{
        opacity: 1,
        cursor: 'not-allowed',
        transform: 'none',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        filter: 'grayscale(0.28)',
        ..._disabled,
      }}
      sx={{
        isolation: 'isolate',
        '& > *': {
          position: 'relative',
          zIndex: 1,
        },
        ...sx,
      }}
      isDisabled={isDisabled}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  );
}

export default PrimaryButton;
