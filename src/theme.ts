import { extendTheme } from '@chakra-ui/react';
import type { ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: `'Noto Sans JP', 'Inter', 'Hiragino Sans', 'Yu Gothic', sans-serif`,
    body: `'Noto Sans JP', 'Inter', 'Hiragino Sans', 'Yu Gothic', sans-serif`,
  },
  styles: {
    global: {
      body: {
        bg: 'rgba(22, 94, 131, 0.08)',
        color: '#1f4f68',
      },
    },
  },
});

export default theme;
