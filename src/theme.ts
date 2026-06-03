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
  components: {
    Heading: {
      baseStyle: {
        color: '#18181b',
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: '#f7f7f8',
        color: '#3f3f46',
      },
    },
  },
});

export default theme;
