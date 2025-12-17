import { Box, Container, Heading, Text } from '@chakra-ui/react';

function Admin() {
  return (
    <Box minH="100vh" bg="gray.900" color="white">
      <Container maxW="4xl" py={16}>
        <Heading size="lg" mb={4}>
          Admin Console
        </Heading>
        <Text color="gray.300">管理者向け画面（準備中）</Text>
      </Container>
    </Box>
  );
}

export default Admin;
