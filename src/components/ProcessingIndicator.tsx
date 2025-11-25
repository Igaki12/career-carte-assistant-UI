import { HStack, Text, Box } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const bounce = keyframes`
  0%, 100% { transform: translateY(0); opacity: 0.4; }
  50% { transform: translateY(-4px); opacity: 1; }
`;

const Dot = ({ delay }: { delay: number }) => (
  <Box
    w={2}
    h={2}
    borderRadius="full"
    bg="blue.500"
    animation={`${bounce} 1.2s ease-in-out infinite`}
    style={{ animationDelay: `${delay}s` }}
  />
);

type Props = {
  message: string;
};

const ProcessingIndicator = ({ message }: Props) => {
  if (!message) return null;
  return (
    <HStack spacing={3} py={2} px={4} bg="gray.50" borderTopWidth="1px" borderColor="gray.100">
      <HStack spacing={1}>
        <Dot delay={0} />
        <Dot delay={0.2} />
        <Dot delay={0.4} />
      </HStack>
      <Text fontSize="sm" color="gray.600">
        {message}
      </Text>
    </HStack>
  );
};

export default ProcessingIndicator;
