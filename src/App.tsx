import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  Icon,
  IconButton,
  Stack,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { FaMicrophone, FaPaperPlane, FaUserDoctor, FaWandMagicSparkles } from 'react-icons/fa6';
import ApiKeyModal from './components/ApiKeyModal';
import KartePanel from './components/KartePanel';
import ProcessingIndicator from './components/ProcessingIndicator';
import VrmStage from './components/VrmStage';
import type { ConversationMessage, KarteData, KarteKey, LlmResponse, ModeType } from './types';

const INITIAL_KARTE: KarteData = {
  A: null,
  B: null,
  C: null,
  D: null,
  E: null,
  F: null,
  G: null,
};

const ITEM_DESCRIPTIONS = `
A. 主訴 (いま困っていること/話したいこと)
B. キャリア歴 (経験・強み・転機)
C. 現在の業務状況 (役割・満足点・不満点)
D. キャリア観・価値観
E. 将来イメージ (3~5年後)
F. 学び・成長ニーズ
G. 面談で話したいテーマ (期待点)
`;

const MODE_DESCRIPTIONS: Record<ModeType, string> = {
  step: '質問に一つずつ答えながら、7項目を丁寧に埋めていくモードです。',
  free: 'まずは自由に話してもらい、最後にAIがカルテを整理・要約するモードです。',
};

const greetingForMode = (mode: ModeType) =>
  mode === 'step'
    ? 'こんにちは。キャリアメンターです。現在一番気になっていることや、今日ご相談されたい「主訴」について教えてください。'
    : 'こんにちは。キャリアメンターです。今感じていることや考えていることを、順番にこだわらず自由に話してみてください。';

const buildSystemPrompt = (mode: ModeType, karte: KarteData, forceAnalysis = false) => {
  const karteJson = JSON.stringify(karte, null, 2);
  if (mode === 'step') {
    return `
あなたは経験豊富なキャリアメンターです。
以下の7項目を丁寧に埋めるため、順次ヒアリングを行ってください。

# 目標
${ITEM_DESCRIPTIONS}

# 現在のカルテ
${karteJson}

# 指示
1. ユーザーの発話から情報を抽出し、カルテを更新してください。
2. 未記入の項目については会話の流れを意識して一つずつ質問してください。
3. 共感や相槌を交え、話しやすい雰囲気を保ちます。
4. すべて埋まったら完了を伝え、まとめに入ります。

# 出力 (JSONのみ)
{
  "reply": "ユーザーへの返答",
  "updated_karte": { "A": "...", "C": "..." },
  "is_complete": boolean
}
`.trim();
  }

  if (!forceAnalysis) {
    return `
あなたはキャリアメンターとして自由対話モードでユーザーに寄り添います。

# 目的
- ユーザーが自由に話せるように傾聴し、深掘り質問やプロービングを行います。
- まだ情報を整理しようと焦らず、話を引き出してください。

# 出力 (JSONのみ)
{
  "reply": "共感や深掘りの返答",
  "updated_karte": {},
  "is_complete": false
}
`.trim();
  }

  return `
あなたは自由対話の内容を整理してカルテを埋めるフェーズに入りました。

# 目標
${ITEM_DESCRIPTIONS}

# これまでのカルテ
${karteJson}

# 指示
1. 会話履歴から情報を抽出し、カルテ項目を可能な限り埋めてください。
2. 未記入の項目があれば丁寧に補足質問をしてください。
3. 全て埋まったら、まとめと次のアクションを提示します。

# 出力 (JSONのみ)
{
  "reply": "まとめ、または不足部分を確認する質問",
  "updated_karte": { ... },
  "is_complete": boolean
}
`.trim();
};

function App() {
  const [mode, setMode] = useState<ModeType>('step');
  const [apiKey, setApiKey] = useState('');
  const [isApiModalOpen, setApiModalOpen] = useState(false);
  const [karte, setKarte] = useState<KarteData>(INITIAL_KARTE);
  const [messages, setMessages] = useState<ConversationMessage[]>([
    { role: 'assistant', content: greetingForMode('step') },
  ]);
  const [textValue, setTextValue] = useState('');
  const [processingText, setProcessingText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assistantBubbleText, setAssistantBubbleText] = useState('');
  const [assistantBubbleKey, setAssistantBubbleKey] = useState(0);
  const toast = useToast();

  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ConversationMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('cca-api-key');
    if (saved) {
      setApiKey(saved);
    } else {
      setApiModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (apiKey) {
      window.localStorage.setItem('cca-api-key', apiKey);
    } else {
      window.localStorage.removeItem('cca-api-key');
    }
  }, [apiKey]);

  useEffect(() => {
    const greeting = greetingForMode(mode);
    const initialHistory: ConversationMessage[] = [{ role: 'assistant', content: greeting }];
    setMessages(initialHistory);
    messagesRef.current = initialHistory;
    setKarte(INITIAL_KARTE);
    setProcessingText('');
    setConversationStarted(false);
  }, [mode]);

  useEffect(() => {
    if (!apiKey) {
      setApiModalOpen(true);
    }
  }, [apiKey]);

  useEffect(
    () => () => {
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const ensureApiKey = useCallback(() => {
    if (apiKey) return true;
    toast({
      title: 'APIキーが必要です',
      description: '先にOpenAIのAPIキーを設定してください。',
      status: 'warning',
      duration: 4000,
    });
    setApiModalOpen(true);
    return false;
  }, [apiKey, toast]);

  const playTextToSpeech = useCallback(
    async (text: string) => {
      if (!apiKey || !text) return;
      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: 'fable',
          }),
        });
        if (!response.ok) {
          throw new Error('音声生成リクエストに失敗しました。');
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        setIsSpeaking(true);
        const playPromise = audio.play();
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
        };
        if (playPromise) {
          await playPromise;
        }
      } catch (error) {
        setIsSpeaking(false);
        console.error(error);
        toast({
          title: '音声再生に失敗しました',
          description: (error as Error).message,
          status: 'error',
          duration: 4000,
        });
      }
    },
    [apiKey, toast],
  );

  const runLLMProcess = useCallback(
    async (history: ConversationMessage[], forceAnalysis = false) => {
      if (!ensureApiKey()) return;
      const systemPrompt = buildSystemPrompt(mode, karte, forceAnalysis);
      setProcessingText(forceAnalysis ? '情報を整理しています...' : 'AI思考中...');

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: systemPrompt }, ...history],
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          throw new Error('OpenAIからの応答がありませんでした。');
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('AI応答の形式が不正です。');

        const parsed = JSON.parse(content) as LlmResponse;

        if (parsed.updated_karte) {
          const updates = parsed.updated_karte as Partial<Record<KarteKey, string>>;
          setKarte((prev) => {
            const next: KarteData = { ...prev };
            (Object.entries(updates) as [KarteKey, string | null][]).forEach(([key, value]) => {
              if (value) {
                next[key] = value;
              }
            });
            return next;
          });
        }

        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          content: parsed.reply,
        };
        setMessages((prev) => {
          const updated = [...prev, assistantMessage];
          messagesRef.current = updated;
          return updated;
        });
        setAssistantBubbleText(parsed.reply);
        setAssistantBubbleKey((prev) => prev + 1);

        setProcessingText('音声生成中...');
        await playTextToSpeech(parsed.reply);
      } catch (error) {
        console.error(error);
        toast({
          title: 'AIの呼び出しに失敗しました',
          description: (error as Error).message,
          status: 'error',
          duration: 5000,
        });
      } finally {
        setProcessingText('');
      }
    },
    [apiKey, ensureApiKey, karte, mode, playTextToSpeech, toast],
  );

  const handleUserMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      if (!ensureApiKey()) return;
      const sanitized = content.trim();
      const updatedHistory: ConversationMessage[] = [
        ...messagesRef.current,
        { role: 'user', content: sanitized },
      ];
      setMessages(updatedHistory);
      messagesRef.current = updatedHistory;
      setConversationStarted(true);
      setTextValue('');
      await runLLMProcess(updatedHistory);
    },
    [ensureApiKey, runLLMProcess],
  );

  const processAudio = useCallback(
    async (blob: Blob) => {
      if (!ensureApiKey()) return;
      setProcessingText('音声を文字に変換中...');
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ja');

      try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('音声認識リクエストに失敗しました。');
        }

        const data = await response.json();
        const text = (data.text as string)?.trim();
        setProcessingText('');
        if (!text) {
          toast({
            title: '音声を認識できませんでした',
            status: 'warning',
          });
          return;
        }

        const updatedHistory: ConversationMessage[] = [
          ...messagesRef.current,
          { role: 'user', content: text },
        ];
        setMessages(updatedHistory);
        messagesRef.current = updatedHistory;
        setConversationStarted(true);
        await runLLMProcess(updatedHistory);
      } catch (error) {
        console.error(error);
        toast({
          title: '音声認識に失敗しました',
          description: (error as Error).message,
          status: 'error',
          duration: 4000,
        });
        setProcessingText('');
      }
    },
    [apiKey, ensureApiKey, runLLMProcess, toast],
  );

  const toggleRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      return;
    }

    if (!ensureApiKey()) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: 'マイクが利用できません',
        description: 'ブラウザが録音に対応していないようです。',
        status: 'error',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        processAudio(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error(error);
      toast({
        title: 'マイクの使用が拒否されました',
        status: 'error',
        duration: 4000,
      });
    }
  };

  const handleForceAnalysis = async () => {
    if (mode !== 'free') return;
    if (!ensureApiKey()) return;
    await runLLMProcess(messagesRef.current, true);
  };

  const apiStatusLabel = apiKey ? 'API Key: 設定済' : 'API Key: 未設定';
  const apiStatusColor = apiKey ? 'green' : 'gray';
  const isBusy = Boolean(processingText);

  return (
    <Box bg="gray.100" minH="100vh" py={{ base: 4, md: 8 }} px={{ base: 3, md: 6 }}>
      <ApiKeyModal
        isOpen={isApiModalOpen}
        currentKey={apiKey}
        onSave={(value) => {
          setApiKey(value);
          setApiModalOpen(false);
        }}
      />

      <Flex
        direction="column"
        maxW="1200px"
        mx="auto"
        gap={4}
        bg="transparent"
      >
        <Box
          bg="white"
          borderRadius="2xl"
          borderWidth="1px"
          borderColor="gray.200"
          boxShadow="sm"
          p={{ base: 4, md: 6 }}
        >
          <Flex direction={{ base: 'column', md: 'row' }} align={{ base: 'flex-start', md: 'center' }} gap={4}>
            <HStack spacing={3}>
              <Icon as={FaUserDoctor} color="blue.500" boxSize={6} />
              <Box>
                <Text fontWeight="bold" fontSize="lg">
                  AIキャリアメンター
                </Text>
                <Text fontSize="sm" color="gray.500">
                  キャリアのモヤモヤを整理しながらVRMカウンセラーと対話しましょう
                </Text>
              </Box>
            </HStack>
            <Flex align="center" gap={3} ml={{ md: 'auto' }}>
              <Badge colorScheme={apiStatusColor}>{apiStatusLabel}</Badge>
              <Button size="sm" variant="outline" onClick={() => setApiModalOpen(true)}>
                API設定
              </Button>
            </Flex>
          </Flex>
          <Flex
            mt={4}
            direction={{ base: 'column', md: 'row' }}
            align={{ base: 'flex-start', md: 'center' }}
            justify="space-between"
            gap={3}
          >
            <ButtonGroup size="sm" variant="outline" isAttached>
              <Button
                onClick={() => setMode('step')}
                colorScheme={mode === 'step' ? 'blue' : undefined}
                variant={mode === 'step' ? 'solid' : 'outline'}
              >
                ① 順次ヒアリング
              </Button>
              <Button
                onClick={() => setMode('free')}
                colorScheme={mode === 'free' ? 'purple' : undefined}
                variant={mode === 'free' ? 'solid' : 'outline'}
              >
                ② 自由対話＆分析
              </Button>
            </ButtonGroup>
            <Text fontSize="sm" color="gray.600">
              {MODE_DESCRIPTIONS[mode]}
            </Text>
          </Flex>
        </Box>

        <Flex direction={{ base: 'column', xl: 'row' }} gap={4}>
          <Stack flex="1" spacing={4}>
            <VrmStage
              isSpeaking={isSpeaking}
              conversationStarted={conversationStarted}
              assistantMessage={assistantBubbleText}
              assistantMessageKey={assistantBubbleKey}
            />
            <Box
              bg="white"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="gray.200"
              boxShadow="lg"
              display="flex"
              flexDirection="column"
              minH="520px"
            >
              <Box
                ref={chatContainerRef}
                flex="1"
                overflowY="auto"
                px={{ base: 3, md: 4 }}
                py={4}
                bg="gray.50"
              >
                {messages.map((message, index) => {
                  const isUser = message.role === 'user';
                  return (
                    <Flex key={`${message.role}-${index}-${message.content.slice(0, 8)}`} justify={isUser ? 'flex-end' : 'flex-start'} mb={3}>
                      <Box
                        bg={isUser ? 'blue.600' : 'white'}
                        color={isUser ? 'white' : 'gray.800'}
                        borderRadius="2xl"
                        borderTopRightRadius={isUser ? '0' : '2xl'}
                        borderTopLeftRadius={isUser ? '2xl' : '0'}
                        px={4}
                        py={3}
                        boxShadow="sm"
                        maxW="80%"
                        fontSize="sm"
                        whiteSpace="pre-wrap"
                      >
                        {message.content}
                      </Box>
                    </Flex>
                  );
                })}
              </Box>
              <ProcessingIndicator message={processingText} />
              <Box borderTopWidth="1px" borderColor="gray.100" p={4}>
                <Stack spacing={3}>
                  <Flex gap={3} align="center">
                    <IconButton
                      aria-label="音声入力"
                      icon={<FaMicrophone />}
                      colorScheme={isRecording ? 'red' : 'blue'}
                      onClick={toggleRecording}
                      isRound
                      minW="56px"
                      h="56px"
                    />
                    <Textarea
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      placeholder="テキスト入力はこちら..."
                      borderRadius="xl"
                      bg="white"
                      borderColor="gray.200"
                      resize="none"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleUserMessage(textValue);
                        }
                      }}
                      isDisabled={isBusy}
                    />
                    <IconButton
                      aria-label="送信"
                      icon={<FaPaperPlane />}
                      colorScheme="blue"
                      onClick={() => handleUserMessage(textValue)}
                      isDisabled={!textValue.trim() || isBusy}
                      borderRadius="full"
                    />
                  </Flex>
                  {mode === 'free' && (
                    <Button
                      leftIcon={<FaWandMagicSparkles />}
                      variant="ghost"
                      colorScheme="purple"
                      onClick={handleForceAnalysis}
                      isDisabled={messages.length <= 1 || isBusy}
                    >
                      今までの話を整理してカルテを作成
                    </Button>
                  )}
                </Stack>
              </Box>
            </Box>
          </Stack>
          <Box flex={{ base: 'none', xl: '0 0 320px' }} display="flex">
            <KartePanel data={karte} />
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
}

export default App;
