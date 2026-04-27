import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Heading, Stack, Text } from '@chakra-ui/react';

function Home() {
  return (
    <Box minH="100dvh" bgGradient="linear(to-b, gray.900, gray.800)" color="white">
      <Container maxW="3xl" py={{ base: 16, md: 24 }}>
        <Stack spacing={8}>
          <Heading size="2xl" lineHeight="short">
            Career Karte Assistant
          </Heading>
          <Text fontSize="lg" color="gray.200">
            キャリアの棚卸しや目標整理をサポートするAIコンシェルジュです。面談カルテを使って、
            思考の抜け漏れを減らしながら次のアクションを一緒に考えていきます。
          </Text>
          <Button
            as={RouterLink}
            to="/user/demographics"
            variant="solid"
            colorScheme="orange"
            size="lg"
            alignSelf="flex-start"
            px={10}
          >
            プロフィールを設定
          </Button>
          <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align="stretch" w="full">
            <Button
              as={RouterLink}
              to="/app/initial"
              colorScheme="teal"
              size="lg"
              px={10}
              py={{ base: 7, md: 6 }}
              minH={{ base: '64px', md: '48px' }}
              flex="1"
            >
              初回面談を始める
            </Button>
            <Button
              as={RouterLink}
              to="/app/continuous"
              variant="outline"
              colorScheme="teal"
              size="lg"
              px={10}
              py={{ base: 7, md: 6 }}
              minH={{ base: '64px', md: '48px' }}
              flex="1"
            >
              継続面談を始める
            </Button>
          </Stack>

          <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
            <Button as={RouterLink} to="/user" variant="outline" colorScheme="teal">
              ユーザーダッシュボード画面
            </Button>
            <Button as={RouterLink} to="/consultant" variant="outline" colorScheme="purple">
              コンサルタント画面
            </Button>
            <Button as={RouterLink} to="/admin" variant="outline" colorScheme="orange">
              管理者画面
            </Button>
            <Button as={RouterLink} to="/company-admin" variant="outline" colorScheme="pink">
              企業管理者画面
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

export default Home;
