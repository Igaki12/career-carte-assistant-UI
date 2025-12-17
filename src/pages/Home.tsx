import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Heading, Stack, Text } from '@chakra-ui/react';

function Home() {
  return (
    <Box minH="100vh" bgGradient="linear(to-b, gray.900, gray.800)" color="white">
      <Container maxW="3xl" py={{ base: 16, md: 24 }}>
        <Stack spacing={6}>
          <Heading size="2xl" lineHeight="short">
            Career Carte Assistant
          </Heading>
          <Text fontSize="lg" color="gray.200">
            キャリアのモヤモヤを整理できるAIアシスタントです。カルテ形式で思考を整え、
            あなたに合った伴走体験を提供します。
          </Text>
          <Button
            as={RouterLink}
            to="/app"
            colorScheme="teal"
            size="lg"
            alignSelf="flex-start"
            px={10}
          >
            カルテを開く
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

export default Home;
