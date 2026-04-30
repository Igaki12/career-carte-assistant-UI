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
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
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
    <Box minH="100dvh" bgGradient="linear(to-br, gray.900, teal.900, gray.800)" color="white">
      <Container maxW="5xl" py={{ base: 10, md: 16 }}>
        <Flex direction={{ base: 'column', lg: 'row' }} gap={10} align="stretch">
          <Stack flex="1" spacing={6} justify="center">
            <Box>
              <Heading size="2xl" lineHeight="short">
                Career Karte Assistant
              </Heading>
              <Text mt={4} color="gray.200" fontSize="lg">
                一般ユーザー・企業管理者・キャリアコンサルタント共通のログイン入口です。
              </Text>
            </Box>
            <Alert status="info" bg="whiteAlpha.200" color="white" borderRadius="lg">
              <AlertIcon color="teal.200" />
              現在はデモ認証です。任意のIDとパスワードでログインできます。
            </Alert>
            <Text color="gray.300" fontSize="sm">
              ユーザー自身による新規登録は用意せず、管理者が作成したアカウントを配布する前提の画面構成です。
            </Text>
            <Link as={RouterLink} to="/admin/login" color="orange.200" fontWeight="semibold">
              システム管理者はこちら
            </Link>
          </Stack>

          <Box flex="1" bg="white" color="gray.800" borderRadius="lg" p={{ base: 6, md: 8 }} boxShadow="xl">
            <form onSubmit={handleSubmit}>
              <Stack spacing={5}>
                <Stack spacing={1}>
                  <Heading size="lg">ログイン</Heading>
                  <Text color="gray.500" fontSize="sm">
                    所属ロールを選択して進んでください。
                  </Text>
                </Stack>
                <FormControl isRequired>
                  <FormLabel>アカウントID / メールアドレス</FormLabel>
                  <Input value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="demo@example.com" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>パスワード</FormLabel>
                  <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="任意の値" />
                </FormControl>
                <FormControl>
                  <FormLabel>ログイン種別</FormLabel>
                  <Select value={role} onChange={(event) => setRole(event.target.value as Exclude<DemoAuthRole, 'admin'>)}>
                    <option value="user">一般ユーザー</option>
                    <option value="company-admin">企業管理者</option>
                    <option value="consultant">キャリアコンサルタント</option>
                  </Select>
                </FormControl>
                <Stack spacing={3}>
                  <Checkbox isChecked={remember} onChange={(event) => setRemember(event.target.checked)}>
                    常にログインした状態にしておく
                  </Checkbox>
                  <Checkbox isChecked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)}>
                    利用条件に同意する
                  </Checkbox>
                  <Button variant="link" colorScheme="teal" alignSelf="flex-start" onClick={termsDisclosure.onOpen}>
                    利用条件を確認する
                  </Button>
                </Stack>
                <Button type="submit" colorScheme="teal" size="lg">
                  ログイン
                </Button>
                <Divider />
                <Text fontSize="xs" color="gray.500">
                  本番実装ではサーバー側認証、権限、テナント紐付け、パスワード再発行を接続します。
                </Text>
              </Stack>
            </form>
          </Box>
        </Flex>
      </Container>

      <Modal isOpen={termsDisclosure.isOpen} onClose={termsDisclosure.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>利用条件</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3} color="gray.700">
              <Text>このシステムはキャリア面談の事前準備とカルテ作成を支援するデモです。</Text>
              <Text>AIの応答は参考情報であり、実際の面談や専門家の判断を置き換えるものではありません。</Text>
              <Text>デモ版では入力情報がブラウザ内に保存されます。共有端末での利用時はログアウトしてください。</Text>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button
              colorScheme="teal"
              onClick={() => {
                setAcceptedTerms(true);
                termsDisclosure.onClose();
              }}
            >
              同意して閉じる
            </Button>
            <Button variant="ghost" onClick={termsDisclosure.onClose}>
              閉じる
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default Login;
