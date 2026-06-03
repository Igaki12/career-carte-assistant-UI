import {
  Box,
  Checkbox,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PrimaryButton from '../components/PrimaryButton';
import {
  createDemoAuthSession,
  getDefaultRouteForRole,
  saveDemoAuthSession,
  type DemoAuthSession,
} from '../lib/demoAuth';
import {
  createEmptyDemoUserState,
  createDemographicsFromDemoAccount,
  saveDemoUserState,
} from '../lib/demoUserState';
import { findDemoAccount, resolveDemoLoginRole } from '../lib/demoAccounts';
import {
  lightBottomLine,
  lightFormSurfaceProps,
  lightMutedText,
  lightPageBg,
  lightText,
  lightTopLine,
} from '../lib/lightThemeTokens';

type LoginProps = {
  session: DemoAuthSession | null;
  onLogin: (session: DemoAuthSession) => void;
};

const getReturnTo = (search: string) => {
  const params = new URLSearchParams(search);
  const returnTo = params.get('returnTo');
  return returnTo && returnTo.startsWith('/') ? returnTo : null;
};

function Login({ session, onLogin }: LoginProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (!session) return;
    navigate(getReturnTo(location.search) ?? getDefaultRouteForRole(session.role), { replace: true });
  }, [location.search, navigate, session]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountId.trim() || !password.trim()) {
      toast({
        title: 'メールアドレスとパスワードを入力してください',
        status: 'warning',
        duration: 2400,
        isClosable: true,
      });
      return;
    }
    const matchedAccount = findDemoAccount(accountId);
    if (matchedAccount?.role === 'admin') {
      toast({
        title: '管理者専用ログインを使用してください',
        status: 'warning',
        duration: 2400,
        isClosable: true,
      });
      return;
    }

    const role = resolveDemoLoginRole(accountId);
    const tenantId = matchedAccount?.tenantId ?? undefined;
    const nextSession = createDemoAuthSession({
      accountId,
      password,
      role,
      tenantId,
      remember,
    });
    saveDemoAuthSession(nextSession);
    const nextUserState = createEmptyDemoUserState();
    saveDemoUserState({
      ...nextUserState,
      tenantId: matchedAccount?.tenantId ?? nextUserState.tenantId,
      demographics:
        matchedAccount && (matchedAccount.role === 'user' || matchedAccount.role === 'company-admin')
          ? createDemographicsFromDemoAccount(matchedAccount)
          : nextUserState.demographics,
      demographicsSavedAt:
        matchedAccount && (matchedAccount.role === 'user' || matchedAccount.role === 'company-admin')
          ? new Date().toISOString()
          : nextUserState.demographicsSavedAt,
    });
    onLogin(nextSession);
    navigate(getReturnTo(location.search) ?? getDefaultRouteForRole(role), { replace: true });
  };

  return (
    <Box
      height="100dvh"
      overflowY="auto"
      bgGradient={lightPageBg}
      color={lightText}
    >
      <Container maxW="5xl" minH="100dvh" py={{ base: 10, md: 16 }} display="flex" flexDirection="column">
        <Flex direction={{ base: 'column', lg: 'row' }} gap={10} align="stretch" flex="1">
          <Stack flex="1" spacing={6} justify="center">
            <Box>
              <Heading
                size="2xl"
                lineHeight="short"
                bgGradient="linear(110deg, #0f3f5a, #165e83, #0f3f5a, #5d9bb5)"
                bgClip="text"
                backgroundSize="240% 240%"
                sx={{
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 1px 0 rgba(255, 255, 255, 0.82), 0 12px 26px rgba(63, 63, 70, 0.12)',
                  animation: 'loginTitleGradient 12s ease-in-out infinite',
                  '@keyframes loginTitleGradient': {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                  },
                }}
              >
                Career Karte Assistant
              </Heading>
              <Text mt={3} fontSize="xs" color={lightMutedText} letterSpacing="0.02em">
                © 2026 HRdock All rights reserved.
              </Text>
            </Box>
          </Stack>

          <Box
            flex="1"
            bg="transparent"
            color={lightText}
            borderRadius="0"
            borderTopWidth="0"
            borderBottomWidth="0"
            borderLeftWidth="0"
            borderRightWidth="0"
            p={{ base: 6, md: 8 }}
            position="relative"
            _before={{
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: { base: '5px', md: '7px' },
              bgGradient: lightTopLine,
            }}
            _after={{
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: { base: '5px', md: '7px' },
              bgGradient: lightBottomLine,
            }}
            boxShadow="0 28px 80px rgba(63, 63, 70, 0.12)"
            backdropFilter="blur(14px)"
          >
            <form onSubmit={handleSubmit}>
              <Stack spacing={5}>
                <Stack spacing={1}>
                  <Heading size="lg">ログイン</Heading>
                  <Text color={lightMutedText} fontSize="sm">
                    メールアドレスを入力してください。
                  </Text>
                </Stack>
                <FormControl isRequired>
                  <FormLabel>メールアドレス</FormLabel>
                  <Input
                    type="email"
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    placeholder="demo@example.com"
                    {...lightFormSurfaceProps}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>パスワード</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="任意の値"
                    {...lightFormSurfaceProps}
                  />
                </FormControl>
                <Checkbox
                  isChecked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  colorScheme="blue"
                >
                  常にログインした状態にしておく
                </Checkbox>
                <PrimaryButton type="submit" size="lg">
                  ログイン
                </PrimaryButton>
              </Stack>
            </form>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}

export default Login;
