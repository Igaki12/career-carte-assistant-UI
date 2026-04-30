import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
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
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
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
    <Box minH="100dvh" bgGradient="linear(to-br, gray.950, orange.900, gray.900)" color="white">
      <Container maxW="md" py={{ base: 10, md: 16 }}>
        <Box bg="white" color="gray.800" borderRadius="lg" p={{ base: 6, md: 8 }} boxShadow="xl">
          <form onSubmit={handleSubmit}>
            <Stack spacing={5}>
              <Stack spacing={2}>
                <Heading size="lg" color="orange.700">
                  管理者ログイン
                </Heading>
                <Text color="gray.600">
                  システム管理者専用の入口です。ユーザー・企業管理者とは別のログイン画面です。
                </Text>
              </Stack>
              <Alert status="warning" borderRadius="lg">
                <AlertIcon />
                デモ認証のため、任意の管理者IDとパスワードでログインできます。
              </Alert>
              <FormControl isRequired>
                <FormLabel>管理者ID</FormLabel>
                <Input value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="admin" />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>管理者パスワード</FormLabel>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="任意の値" />
              </FormControl>
              <Stack spacing={3}>
                <Checkbox isChecked={remember} onChange={(event) => setRemember(event.target.checked)}>
                  常にログインした状態にしておく
                </Checkbox>
                <Checkbox isChecked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)}>
                  管理者利用条件に同意する
                </Checkbox>
                <Button variant="link" colorScheme="orange" alignSelf="flex-start" onClick={termsDisclosure.onOpen}>
                  管理者利用条件を確認する
                </Button>
              </Stack>
              <Button type="submit" colorScheme="orange" size="lg">
                管理者画面へログイン
              </Button>
              <Divider />
              <Link as={RouterLink} to="/login" color="teal.600" fontWeight="semibold">
                一般ユーザー・企業管理者ログインへ戻る
              </Link>
            </Stack>
          </form>
        </Box>
      </Container>

      <Modal isOpen={termsDisclosure.isOpen} onClose={termsDisclosure.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>管理者利用条件</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3} color="gray.700">
              <Text>管理者画面ではアカウント、企業設定、カルテ出力など強い権限を扱います。</Text>
              <Text>本番実装では管理者専用の認証、監査ログ、操作権限をサーバー側で管理します。</Text>
              <Text>デモ版では操作確認用のため、実データや機密情報は入力しないでください。</Text>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button
              colorScheme="orange"
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

export default AdminLogin;
