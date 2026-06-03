import {
  Alert,
  AlertIcon,
  Box,
  Checkbox,
  Container,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { type FormEvent, useEffect, useState } from 'react';
import { FiArrowLeft, FiShield } from 'react-icons/fi';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import PrimaryButton from '../components/PrimaryButton';
import {
  createDemoAuthSession,
  getDefaultRouteForRole,
  saveDemoAuthSession,
  type DemoAuthSession,
} from '../lib/demoAuth';
import {
  lightBottomLine,
  lightFormSurfaceProps,
  lightMutedText,
  lightPageBg,
  lightText,
  lightTopLine,
} from '../lib/lightThemeTokens';

type AdminLoginProps = {
  session: DemoAuthSession | null;
  onLogin: (session: DemoAuthSession) => void;
};

const getReturnTo = (search: string) => {
  const params = new URLSearchParams(search);
  const returnTo = params.get('returnTo');
  return returnTo && returnTo.startsWith('/admin') ? returnTo : null;
};

function AdminLogin({ session, onLogin }: AdminLoginProps) {
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
        title: '管理者IDとパスワードを入力してください',
        status: 'warning',
        duration: 2400,
        isClosable: true,
      });
      return;
    }
    const nextSession = createDemoAuthSession({
      accountId,
      password,
      role: 'admin',
      remember,
    });
    saveDemoAuthSession(nextSession);
    onLogin(nextSession);
    navigate(getReturnTo(location.search) ?? '/admin', { replace: true });
  };

  return (
    <Box
      height="100dvh"
      overflowY="auto"
      bgGradient={lightPageBg}
      color={lightText}
    >
      <Container maxW="md" minH="100dvh" py={{ base: 10, md: 16 }} display="flex" flexDirection="column" justifyContent="center">
        <Stack spacing={6}>
          <Stack spacing={3}>
            <Heading
              size="xl"
              lineHeight="short"
              bgGradient="linear(110deg, #27272a, #3f3f46, #27272a, #71717a)"
              bgClip="text"
              backgroundSize="240% 240%"
              sx={{
                WebkitTextFillColor: 'transparent',
                textShadow:
                  '0 1px 0 rgba(255, 255, 255, 0.82), 0 12px 26px rgba(63, 63, 70, 0.12)',
                animation: 'adminLoginTitleGradient 12s ease-in-out infinite',
                '@keyframes adminLoginTitleGradient': {
                  '0%': { backgroundPosition: '0% 50%' },
                  '50%': { backgroundPosition: '100% 50%' },
                  '100%': { backgroundPosition: '0% 50%' },
                },
              }}
            >
              System Administrator
            </Heading>
            <Text color={lightMutedText} fontSize="sm">
              ユーザー・企業管理者とは分離した、システム管理者専用のログイン入口です。
            </Text>
          </Stack>
        <Box
          bg="transparent"
          color={lightText}
          borderRadius="0"
          p={{ base: 6, md: 8 }}
          position="relative"
          boxShadow="0 28px 80px rgba(63, 63, 70, 0.12)"
          backdropFilter="blur(14px)"
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
        >
          <form onSubmit={handleSubmit}>
            <Stack spacing={5}>
              <Stack spacing={2}>
                <Heading size="lg" display="flex" alignItems="center" gap={2}>
                  <FiShield />
                  管理者ログイン
                </Heading>
                <Text color={lightMutedText}>
                  システム管理者専用の入口です。ユーザー・企業管理者とは別のログイン画面です。
                </Text>
              </Stack>
              <Alert status="warning" bg="orange.50" color="orange.900" borderRadius="lg">
                <AlertIcon color="orange.500" />
                デモ認証のため、任意の管理者IDとパスワードでログインできます。
              </Alert>
              <FormControl isRequired>
                <FormLabel>管理者ID</FormLabel>
                <Input
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  placeholder="admin"
                  {...lightFormSurfaceProps}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>管理者パスワード</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="任意の値"
                  {...lightFormSurfaceProps}
                />
              </FormControl>
              <Stack spacing={3}>
                <Checkbox isChecked={remember} onChange={(event) => setRemember(event.target.checked)}>
                  常にログインした状態にしておく
                </Checkbox>
              </Stack>
              <PrimaryButton type="submit" size="lg">
                管理者画面へログイン
              </PrimaryButton>
              <Text fontSize="xs" color="#71717a">
                デモ版のパスワード再設定・一時パスワード発行は画面確認用で、ログイン時の照合には反映されません。本番実装ではサーバー側認証へ接続します。
              </Text>
              <Divider borderColor="rgba(82, 82, 91, 0.18)" />
              <Link
                as={RouterLink}
                to="/login"
                color="gray.700"
                fontWeight="semibold"
                display="inline-flex"
                alignItems="center"
                gap={2}
              >
                <FiArrowLeft />
                一般ユーザー・企業管理者ログインへ戻る
              </Link>
            </Stack>
          </form>
        </Box>
        </Stack>
      </Container>

    </Box>
  );
}

export default AdminLogin;
