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
        bg: 'gray.100',
        color: 'gray.800',
      },
    },
  },
});

export default theme;
