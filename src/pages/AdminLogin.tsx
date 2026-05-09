import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure,
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
  const termsDisclosure = useDisclosure();
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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
    if (!acceptedTerms) {
      toast({
        title: '管理者利用条件への同意が必要です',
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
      bgGradient="linear(135deg, #0f172a 0%, #1e293b 48%, #334155 100%)"
      color="white"
    >
      <Container maxW="md" minH="100dvh" py={{ base: 10, md: 16 }} display="flex" flexDirection="column" justifyContent="center">
        <Stack spacing={6}>
          <Stack spacing={3}>
            <Heading
              size="xl"
              lineHeight="short"
              bgGradient="linear(110deg, #f8fafc, #cbd5e1, #f1f5f9, #94a3b8)"
              bgClip="text"
              backgroundSize="240% 240%"
              sx={{
                WebkitTextFillColor: 'transparent',
                textShadow:
                  '0 1px 0 rgba(255, 255, 255, 0.3), 0 -1px 0 rgba(15, 23, 42, 0.6), 0 10px 24px rgba(15, 23, 42, 0.4)',
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
            <Text color="gray.300" fontSize="sm">
              ユーザー・企業管理者とは分離した、システム管理者専用のログイン入口です。
            </Text>
          </Stack>
        <Box
          bg="transparent"
          color="white"
          borderRadius="0"
          p={{ base: 6, md: 8 }}
          position="relative"
          boxShadow="0 28px 80px rgba(15, 23, 42, 0.4)"
          backdropFilter="blur(14px)"
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
        >
          <form onSubmit={handleSubmit}>
            <Stack spacing={5}>
              <Stack spacing={2}>
                <Heading size="lg" display="flex" alignItems="center" gap={2}>
                  <FiShield />
                  管理者ログイン
                </Heading>
                <Text color="whiteAlpha.800">
                  システム管理者専用の入口です。ユーザー・企業管理者とは別のログイン画面です。
                </Text>
              </Stack>
              <Alert status="warning" bg="whiteAlpha.200" color="white" borderRadius="lg">
                <AlertIcon color="yellow.200" />
                デモ認証のため、任意の管理者IDとパスワードでログインできます。
              </Alert>
              <FormControl isRequired>
                <FormLabel>管理者ID</FormLabel>
                <Input
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  placeholder="admin"
                  bg="whiteAlpha.900"
                  color="gray.900"
                  borderColor="whiteAlpha.600"
                  _placeholder={{ color: 'gray.500' }}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>管理者パスワード</FormLabel>
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
                <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                  <Checkbox isChecked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)}>
                    管理者利用条件に同意する
                  </Checkbox>
                  <Button variant="link" color="blue.200" ml="auto" onClick={termsDisclosure.onOpen}>
                    管理者利用条件を確認する
                  </Button>
                </Flex>
              </Stack>
              <PrimaryButton type="submit" size="lg">
                管理者画面へログイン
              </PrimaryButton>
              <Text fontSize="xs" color="whiteAlpha.700">
                デモ版のパスワード再設定・一時パスワード発行は画面確認用で、ログイン時の照合には反映されません。本番実装ではサーバー側認証へ接続します。
              </Text>
              <Divider borderColor="whiteAlpha.300" />
              <Link
                as={RouterLink}
                to="/login"
                color="blue.200"
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

      <Modal isOpen={termsDisclosure.isOpen} onClose={termsDisclosure.onClose} size="lg">
        <ModalOverlay bg="blackAlpha.760" backdropFilter="blur(6px)" />
        <ModalContent
          bg="rgba(15, 23, 42, 0.96)"
          color="white"
          borderRadius="0"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          boxShadow="0 30px 90px rgba(0, 0, 0, 0.56)"
          overflow="hidden"
          position="relative"
          _before={{
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            bgGradient: 'linear(to-r, transparent, rgba(148, 163, 184, 0.7), rgba(226, 232, 240, 0.92), transparent)',
          }}
        >
          <ModalHeader borderBottomWidth="1px" borderColor="whiteAlpha.160" pt={8}>
            管理者利用条件
          </ModalHeader>
          <ModalCloseButton color="whiteAlpha.800" _hover={{ bg: 'whiteAlpha.160', color: 'white' }} />
          <ModalBody py={6}>
            <Stack spacing={3} color="rgba(255, 255, 255, 0.84)">
              <Text>管理者画面ではアカウント、企業設定、カルテ出力など強い権限を扱います。</Text>
              <Text>本番実装では管理者専用の認証、監査ログ、操作権限をサーバー側で管理します。</Text>
              <Text>デモ版では操作確認用のため、実データや機密情報は入力しないでください。</Text>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2} borderTopWidth="1px" borderColor="whiteAlpha.160">
            <PrimaryButton
              onClick={() => {
                setAcceptedTerms(true);
                termsDisclosure.onClose();
              }}
            >
              同意して閉じる
            </PrimaryButton>
            <Button variant="ghost" color="whiteAlpha.900" _hover={{ bg: 'whiteAlpha.160', color: 'white' }} onClick={termsDisclosure.onClose}>
              閉じる
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default AdminLogin;
