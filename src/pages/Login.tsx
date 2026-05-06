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
  Select,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { type FormEvent, useEffect, useState } from 'react';
import { FiSettings } from 'react-icons/fi';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import PrimaryButton from '../components/PrimaryButton';
import {
  createDemoAuthSession,
  getDefaultRouteForRole,
  saveDemoAuthSession,
  type DemoAuthRole,
  type DemoAuthSession,
} from '../lib/demoAuth';

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
  const termsDisclosure = useDisclosure();
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Exclude<DemoAuthRole, 'admin'>>('user');
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
        title: 'IDとパスワードを入力してください',
        status: 'warning',
        duration: 2400,
        isClosable: true,
      });
      return;
    }
    if (!acceptedTerms) {
      toast({
        title: '利用条件への同意が必要です',
        status: 'warning',
        duration: 2400,
        isClosable: true,
      });
      return;
    }

    const nextSession = createDemoAuthSession({
      accountId,
      password,
      role,
      remember,
    });
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
              <Text mt={4} color="gray.200" fontSize="lg">
                一般ユーザー・企業管理者・キャリアコンサルタント共通のログイン入口です。
              </Text>
            </Box>
            <Alert status="info" bg="whiteAlpha.200" color="white" borderRadius="lg">
              <AlertIcon color="blue.200" />
              現在はデモ認証です。任意のIDとパスワードでログインできます。
            </Alert>
            <Text color="gray.300" fontSize="sm">
              ユーザー自身による新規登録は用意せず、管理者が作成したアカウントを配布する前提の画面構成です。
            </Text>
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
                    権限を選択して進んでください。
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
                <FormControl>
                  <FormLabel>権限</FormLabel>
                  <Select
                    value={role}
                    onChange={(event) => setRole(event.target.value as Exclude<DemoAuthRole, 'admin'>)}
                    bg="whiteAlpha.900"
                    color="gray.900"
                    borderColor="whiteAlpha.600"
                  >
                    <option value="user">一般ユーザー</option>
                    <option value="company-admin">企業管理者</option>
                    <option value="consultant">キャリアコンサルタント</option>
                  </Select>
                </FormControl>
                <Stack spacing={3}>
                  <Checkbox isChecked={remember} onChange={(event) => setRemember(event.target.checked)}>
                    常にログインした状態にしておく
                  </Checkbox>
                  <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                    <Checkbox isChecked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)}>
                      利用条件に同意する
                    </Checkbox>
                    <Button variant="link" color="blue.200" onClick={termsDisclosure.onOpen} ml="auto">
                      利用条件を確認する
                    </Button>
                  </Flex>
                </Stack>
                <PrimaryButton type="submit" size="lg">
                  ログイン
                </PrimaryButton>
                <Divider borderColor="whiteAlpha.300" />
                <Text fontSize="xs" color="whiteAlpha.700">
                  本番実装ではサーバー側認証、権限、テナント紐付け、パスワード再発行を接続します。
                </Text>
              </Stack>
            </form>
          </Box>
        </Flex>
        <Box pt={8} textAlign="right">
          <Link
            as={RouterLink}
            to="/admin/login"
            color="orange.200"
            fontWeight="semibold"
            display="inline-flex"
            alignItems="center"
            gap={2}
          >
            <FiSettings />
            システム管理者はこちら
          </Link>
        </Box>
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
            利用条件
          </ModalHeader>
          <ModalCloseButton color="whiteAlpha.800" _hover={{ bg: 'whiteAlpha.160', color: 'white' }} />
          <ModalBody py={6}>
            <Stack spacing={3} color="rgba(255, 255, 255, 0.84)">
              <Text>このシステムはキャリア面談の事前準備とカルテ作成を支援するデモです。</Text>
              <Text>AIの応答は参考情報であり、実際の面談や専門家の判断を置き換えるものではありません。</Text>
              <Text>デモ版では入力情報がブラウザ内に保存されます。共有端末での利用時はログアウトしてください。</Text>
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

export default Login;
