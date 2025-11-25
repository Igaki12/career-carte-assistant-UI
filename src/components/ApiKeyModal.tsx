import { useEffect, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
} from '@chakra-ui/react';

type ApiKeyModalProps = {
  isOpen: boolean;
  currentKey?: string;
  onSave: (value: string) => void;
};

const ApiKeyModal = ({ isOpen, currentKey = '', onSave }: ApiKeyModalProps) => {
  const [value, setValue] = useState(currentKey);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValue(currentKey);
      setError('');
    }
  }, [currentKey, isOpen]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed.length < 10 || !trimmed.startsWith('sk-')) {
      setError('有効なOpenAI APIキーを入力してください。');
      return;
    }
    onSave(trimmed);
    setValue('');
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={() => undefined} isCentered closeOnOverlayClick={false}>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>APIキーを貼り付けて開始</ModalHeader>
        <ModalBody>
          <Stack spacing={4}>
            <Alert status="info" variant="subtle" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                キーはブラウザ内にのみ保存されます。通信は直接OpenAIに送られ、サーバーには保存されません。
              </AlertDescription>
            </Alert>
            <Stack spacing={2}>
              <Text fontSize="sm" color="gray.600">
                OpenAI API Key (sk-...)
              </Text>
              <Input
                type="password"
                placeholder="sk-********************************"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              {error && (
                <Text fontSize="xs" color="red.500">
                  {error}
                </Text>
              )}
            </Stack>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" w="full" onClick={handleSave}>
            保存して開始
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ApiKeyModal;
