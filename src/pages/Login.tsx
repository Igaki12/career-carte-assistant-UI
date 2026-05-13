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
  createDemographicsFromDemoAccount,
  loadDemoUserState,
  saveDemoUserState,
} from '../lib/demoUserState';
import { findDemoAccount, resolveDemoLoginRole } from '../lib/demoAccounts';

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
        title: 'IDとパスワードを入力してください',
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
    if (matchedAccount) {
      const currentState = loadDemoUserState();
      saveDemoUserState({
        ...currentState,
        tenantId: matchedAccount.tenantId ?? currentState.tenantId,
        demographics:
          matchedAccount.role === 'user' || matchedAccount.role === 'company-admin'
            ? createDemographicsFromDemoAccount(matchedAccount)
            : currentState.demographics,
        demographicsSavedAt:
          matchedAccount.role === 'user' || matchedAccount.role === 'company-admin'
            ? new Date().toISOString()
            : currentState.demographicsSavedAt,
      });
    }
    saveDemoAuthSession(nextSession);
    onLogin(nextSession);
    navigate(getReturnTo(location.search) ?? getDefaultRouteForRole(role), { replace: true });
  };

  return (
    <Box
      height="100dvh"
      overflowY="auto"
      bgGradient="linear(135deg, #0f172a 0%, #1e293b 48%, #334155 100%)"
      color="white"
    >
      <Container maxW="5xl" minH="100dvh" py={{ base: 10, md: 16 }} display="flex" flexDirection="column">
        <Flex direction={{ base: 'column', lg: 'row' }} gap={10} align="stretch" flex="1">
          <Stack flex="1" spacing={6} justify="center">
            <Box>
              <Heading
                size="2xl"
                lineHeight="short"
                bgGradient="linear(110deg, #f1f5f9, #cbd5e1, #f8fafc, #94a3b8)"
                bgClip="text"
                backgroundSize="240% 240%"
                sx={{
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 1px 0 rgba(255, 255, 255, 0.32), 0 -1px 0 rgba(15, 23, 42, 0.55), 0 10px 24px rgba(15, 23, 42, 0.4)',
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
            </Box>
          </Stack>

          <Box
            flex="1"
            bg="transparent"
            color="white"
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
              bgGradient: 'linear(to-r, transparent, rgba(148, 163, 184, 0.8), rgba(203, 213, 225, 0.9), transparent)',
            }}
            _after={{
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: { base: '5px', md: '7px' },
              bgGradient: 'linear(to-r, transparent, rgba(100, 116, 139, 0.7), rgba(148, 163, 184, 0.8), transparent)',
            }}
            boxShadow="0 28px 80px rgba(15, 23, 42, 0.4)"
            backdropFilter="blur(14px)"
          >
            <form onSubmit={handleSubmit}>
              <Stack spacing={5}>
                <Stack spacing={1}>
                  <Heading size="lg">ログイン</Heading>
                  <Text color="whiteAlpha.800" fontSize="sm">
                    アカウントIDまたはメールアドレスを入力してください。
                  </Text>
                </Stack>
                <FormControl isRequired>
                  <FormLabel>アカウントID / メールアドレス</FormLabel>
                  <Input
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    placeholder="demo@example.com"
                    bg="whiteAlpha.900"
                    color="gray.900"
                    borderColor="whiteAlpha.600"
                    _placeholder={{ color: 'gray.500' }}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>パスワード</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="任意の値"
                    bg="whiteAlpha.900"
                    color="gray.900"
                    borderColor="whiteAlpha.600"
                    _placeholder={{ color: 'gray.500' }}
                  />
                </FormControl>
                <Stack spacing={3}>
                  <Checkbox isChecked={remember} onChange={(event) => setRemember(event.target.checked)}>
                    常にログインした状態にしておく
                  </Checkbox>
                </Stack>
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
