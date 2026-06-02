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
  openAiApiKey?: string;
  geminiApiKey?: string;
  onSave: (value: { openAiApiKey: string; geminiApiKey: string }) => void;
};

const ApiKeyModal = ({ isOpen, openAiApiKey = '', geminiApiKey = '', onSave }: ApiKeyModalProps) => {
  const [openAiValue, setOpenAiValue] = useState(openAiApiKey);
  const [geminiValue, setGeminiValue] = useState(geminiApiKey);
  const [openAiError, setOpenAiError] = useState('');
  const [geminiError, setGeminiError] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    let canceled = false;
    queueMicrotask(() => {
      if (canceled) return;
      setOpenAiValue(openAiApiKey);
      setGeminiValue(geminiApiKey);
      setOpenAiError('');
      setGeminiError('');
    });
    return () => {
      canceled = true;
    };
  }, [geminiApiKey, isOpen, openAiApiKey]);

  const handleSave = () => {
    const trimmedOpenAiKey = openAiValue.trim();
    const trimmedGeminiKey = geminiValue.trim();

    if (trimmedOpenAiKey.length < 10 || !trimmedOpenAiKey.startsWith('sk-')) {
      setOpenAiError('有効なOpenAI APIキーを入力してください。');
      return;
    }

    if (trimmedGeminiKey && trimmedGeminiKey.length < 10) {
      setGeminiError('Gemini APIキーが短すぎます。空欄のままでも保存できます。');
      return;
    }

    onSave({
      openAiApiKey: trimmedOpenAiKey,
      geminiApiKey: trimmedGeminiKey,
    });
    setOpenAiValue('');
    setGeminiValue('');
    setOpenAiError('');
    setGeminiError('');
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
                OpenAIキーは会話と音声認識に必須です。Geminiキーは任意で、入力されている場合のみTTSに使用します。キーはブラウザ内にのみ保存され、サーバーには保存されません。
              </AlertDescription>
            </Alert>
            <Stack spacing={2}>
              <Text fontSize="sm" color="#3f6678">
                OpenAI API Key (必須)
              </Text>
              <Input
                type="password"
                placeholder="sk-********************************"
                value={openAiValue}
                onChange={(e) => {
                  setOpenAiValue(e.target.value);
                  if (openAiError) setOpenAiError('');
                }}
              />
              {openAiError && (
                <Text fontSize="xs" color="red.500">
                  {openAiError}
                </Text>
              )}
            </Stack>
            <Stack spacing={2}>
              <Text fontSize="sm" color="#3f6678">
                Gemini API Key (任意 / TTS専用)
              </Text>
              <Input
                type="password"
                placeholder="A********************************"
                value={geminiValue}
                onChange={(e) => {
                  setGeminiValue(e.target.value);
                  if (geminiError) setGeminiError('');
                }}
              />
              {geminiError && (
                <Text fontSize="xs" color="red.500">
                  {geminiError}
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
