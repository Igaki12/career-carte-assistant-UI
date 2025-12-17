import { Box, Container, Heading, Text } from '@chakra-ui/react';

function ConsultantHome() {
  return (
    <Box minH="100vh" bg="gray.900" color="white">
      <Container maxW="4xl" py={16}>
        <Heading size="lg" mb={4}>
          Consultant Dashboard
        </Heading>
        <Text color="gray.300">コンサルタント向けダッシュボード（準備中）</Text>
      </Container>
    </Box>
  );
}

export default ConsultantHome;
