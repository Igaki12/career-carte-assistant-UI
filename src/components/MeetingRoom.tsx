import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { FaMicrophone, FaPaperPlane, FaUpDown, FaUserDoctor, FaWandMagicSparkles } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import ApiKeyModal from './ApiKeyModal';
import KartePanel from './KartePanel';
import ProcessingIndicator from './ProcessingIndicator';
import VrmStage from './VrmStage';
import { INITIAL_SHIRP_STEP_ORDER, SHIRP_KEYS } from '../types';
import type { ConversationMessage, KarteData, LlmResponse, ShirpData, ShirpKey } from '../types';

type MeetingType = 'initial' | 'continuous';

type ContinuousMode = 'normal' | 'turn';

type Props = {
  meetingType: MeetingType;
  continuousMode?: ContinuousMode;
};

const LOCAL_STORAGE_KARTE_KEY = 'cca-karte';

const createEmptyKarte = (): KarteData => ({
  demographics: {
    name: null,
    age: null,
    company: null,
    jobTitle: null,
    workLocationPrefecture: null,
    jobChangeCount: null,
    yearsOfService: null,
    gender: null,
    maritalStatus: null,
    childrenCount: null,
    youngestChildAge: null,
  },
  shirp: {
    S: null,
    H: null,
    I: null,
    R: null,
    P: null,
    '#': null,
  },
  survey: {
    factors: {
      growth_orientation: null,
      problem_solving_orientation: null,
      organization_contribution_orientation: null,
      interpersonal_adaptation_orientation: null,
      emotional_response_tendency: null,
    },
    lastUpdated: null,
  },
});

const SHIRP_GUIDE = `
S (Satisfaction/現状):
- 組織適応
- 自身への評価
- 良好な人間関係
- #そのほかの現状
H (Hope/希望):
- 希望する収入
- 希望する仕事内容
- 希望する勤務形態
- #そのほかの希望
I (Issue/課題):
- スキルの課題
- 健康上の課題
- 年齢の課題
- 家庭の課題
- #そのほかの課題
R (Resource/資源):
- 強みとなる資格
- 強みとなる経験
- 強みとなる協力者
- 強みとなる時間や資金
- #そのほかの強み
P (Plan/プラン):
- S〜Rの情報を元に、AIが解決に向けたプランを生成する。
# (その他):
- S〜Pに当てはまらない内容や、面談中の雑談・余談などを記録する自由記述欄。
`;

const greetingForMeeting = (meetingType: MeetingType) =>
  meetingType === 'initial'
    ? 'こんにちは。キャリアメンターです。まずは現状について伺います。今の仕事で満足している点や、気になっている点を教えてください。なお、この対話は事前準備であり、実際の面談が本番です。'
    : 'こんにちは。キャリアメンターです。今日は自由にお話しください。必要に応じて、前回のカルテ内容を更新していきます。なお、この対話は事前準備であり、実際の面談が本番です。';

const AI_RESPONSE_GUIDELINES = `
# AI応答ガイドライン
- トーンは「安心感」「共感」「フラット」を徹底してください。
- この会話は事前準備であり、実際の面談が本番であることを必ず明示してください。
- 次の禁止事項を厳守してください:
  1) 転職を直接推奨しない
  2) 法律・医療の断定をしない
  3) 会社批判への誘導をしない
`;

const getInitialProgress = (shirp: ShirpData) => {
  const total = INITIAL_SHIRP_STEP_ORDER.length;
  const filled = INITIAL_SHIRP_STEP_ORDER.reduce((acc, key) => (shirp[key] ? acc + 1 : acc), 0);
  return Math.round((filled / total) * 100);
};

const getNextInitialKey = (shirp: ShirpData): ShirpKey | null =>
  INITIAL_SHIRP_STEP_ORDER.find((key) => !shirp[key]) ?? null;

const buildInitialPrompt = (shirp: ShirpData, nextKey: ShirpKey | null) => {
  const currentKey = nextKey ?? 'S';
  return `
あなたは経験豊富なキャリアメンターです。初回面談ではSHIRP形式のうち、S→H→I→Rの順で情報を埋めます。

# SHIRPガイド
${SHIRP_GUIDE}

# 現在のカルテ(SHIRP)
${JSON.stringify(shirp, null, 2)}

# 今回フォーカスする項目
${currentKey}

${AI_RESPONSE_GUIDELINES}

# 指示
1. ユーザーの発話から情報を抽出し、該当項目を更新してください。
2. 今回は「${currentKey}」の内容を深掘りする質問を1つだけ行ってください。
3. S,H,I,Rが全て埋まった場合は、P(プラン)を生成し、面談のまとめを返してください。
4. 3の完了時は、カルテ確認と保存完了まで案内してください。具体的には「カルテ内容を確認し、問題なければ『このカルテを保存』を押して初回面談を終了してください。保存後はユーザホームに戻ります。」という趣旨を reply に含めてください。
5. 余談やS〜Pに当てはまらない内容は#に記録してください。

# 出力 (JSONのみ)
{
  "reply": "ユーザーへの返答",
  "updated_shirp": { "S": "..." },
  "is_complete": boolean
}
`.trim();
};

const buildContinuousPrompt = (shirp: ShirpData) => `
あなたはキャリアメンターとして自由対話モードでユーザーに寄り添います。

# SHIRPガイド
${SHIRP_GUIDE}

# 現在のカルテ(SHIRP)
${JSON.stringify(shirp, null, 2)}

${AI_RESPONSE_GUIDELINES}

# 指示
1. ユーザーが自由に話せるように傾聴し、深掘り質問やプロービングを行います。
2. ユーザーの発話から得た情報で、SHIRPを部分的に更新してください。

# 出力 (JSONのみ)
{
  "reply": "共感や深掘りの返答",
  "updated_shirp": { "H": "..." },
  "is_complete": false
}
`.trim();

const buildContinuousFinalizePrompt = (shirp: ShirpData) => `
あなたは自由対話の内容を整理し、SHIRPカルテを更新して簡単なフィードバックを提示します。

# SHIRPガイド
${SHIRP_GUIDE}

# 現在のカルテ(SHIRP)
${JSON.stringify(shirp, null, 2)}

${AI_RESPONSE_GUIDELINES}

# 指示
1. 会話履歴から情報を抽出し、SHIRP項目を可能な限り埋めてください。
2. 足りない項目は補足し、P(プラン)を生成してください。
3. 面談後のキャリアに関する簡単なフィードバックを80~120文字で作成してください。
4. reply の最後に、カルテ確認と保存完了まで案内してください。具体的には「カルテ内容を確認し、問題なければ『このカルテを保存』を押して面談を終了してください。保存後はユーザホームに戻ります。」という趣旨を含めてください。

# 出力 (JSONのみ)
{
  "reply": "まとめ・補足質問",
  "updated_shirp": { "P": "..." },
  "feedback": "フィードバック内容",
  "is_complete": true
}
`.trim();

const safeParse = (content: string): LlmResponse | null => {
  try {
    return JSON.parse(content) as LlmResponse;
  } catch {
    return null;
  }
};

const updateShirp = (prev: KarteData, updates?: Partial<Record<ShirpKey, string>>) => {
  if (!updates) return prev;
  const nextShirp = { ...prev.shirp };
  SHIRP_KEYS.forEach((key) => {
    const value = updates[key];
    if (value) {
      nextShirp[key] = value;
    }
  });
  return { ...prev, shirp: nextShirp };
};

const MeetingRoom = ({ meetingType, continuousMode = 'normal' }: Props) => {
  const toast = useToast();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [isApiModalOpen, setApiModalOpen] = useState(false);
  const [karte, setKarte] = useState<KarteData>(createEmptyKarte);
  const [messages, setMessages] = useState<ConversationMessage[]>([
    { role: 'assistant', content: greetingForMeeting(meetingType) },
  ]);
  const [textValue, setTextValue] = useState('');
  const [processingText, setProcessingText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTextareaExpanded, setTextareaExpanded] = useState(false);
  const [isKarteModalOpen, setKarteModalOpen] = useState(false);
  const [apiUsageCount, setApiUsageCount] = useState(0);
  const [hasSessionStarted, setSessionStarted] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [hasLoadedStoredKarte, setLoadedStoredKarte] = useState(false);
  const [hasStoredKarte, setHasStoredKarte] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ConversationMessage[]>(messages);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioSourceUrlRef = useRef<string | null>(null);
  const audioResumePositionRef = useRef<number>(0);
  const shouldResumeAudioRef = useRef(false);

  const isInitialMeeting = meetingType === 'initial';
  const isTurnTakingMode = !isInitialMeeting && continuousMode === 'turn';
  const maxApiCalls = isInitialMeeting ? 10 : 7; // 初回面談は10回、継続面談は7回までAPI呼び出し可能（フィードバック生成を含む）
  const conversationQuotaLimit = Math.max(isInitialMeeting ? maxApiCalls : maxApiCalls - 1, 0);
  const hasConversationQuota = apiUsageCount < conversationQuotaLimit;
  const hasApiBudget = apiUsageCount < maxApiCalls;
  const hasUsedApi = hasSessionStarted || apiUsageCount > 0;
  const remainingMessages = Math.max(conversationQuotaLimit - apiUsageCount, 0);
  const isBusy = Boolean(processingText);

  const textareaPlaceholder = useMemo(() => {
    if (apiUsageCount === 0) {
      return 'テキスト入力はこちら...';
    }
    if (remainingMessages === 0) {
      return 'これ以上のテキストは送信することができません';
    }
    return `あと${remainingMessages}回メッセージを送信できます`;
  }, [apiUsageCount, remainingMessages]);

  const initialProgress = useMemo(() => getInitialProgress(karte.shirp), [karte.shirp]);

  const disposeActiveAudio = useCallback(() => {
    const current = activeAudioRef.current;
    if (current) {
      current.pause();
    }
    if (audioSourceUrlRef.current) {
      URL.revokeObjectURL(audioSourceUrlRef.current);
      audioSourceUrlRef.current = null;
    }
    activeAudioRef.current = null;
    audioResumePositionRef.current = 0;
    shouldResumeAudioRef.current = false;
    setIsSpeaking(false);
  }, []);

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
    const greeting = greetingForMeeting(meetingType);
    const initialHistory: ConversationMessage[] = [{ role: 'assistant', content: greeting }];
    setMessages(initialHistory);
    messagesRef.current = initialHistory;
    setProcessingText('');
    setConversationStarted(false);
    setApiUsageCount(0);
    setSessionStarted(false);
    setFeedbackText('');
  }, [meetingType]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (meetingType !== 'continuous') return;
    if (hasLoadedStoredKarte) return;

    const stored = window.localStorage.getItem(LOCAL_STORAGE_KARTE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as KarteData;
        setKarte(parsed);
        setHasStoredKarte(true);
      } catch {
        setKarte(createEmptyKarte());
      }
    } else {
      setKarte(createEmptyKarte());
    }
    setLoadedStoredKarte(true);
  }, [hasLoadedStoredKarte, meetingType]);

  useEffect(() => {
    if (meetingType === 'initial') {
      setKarte(createEmptyKarte());
    }
  }, [meetingType]);

  useEffect(() => {
    if (!apiKey) {
      setApiModalOpen(true);
    }
  }, [apiKey]);

  useEffect(
    () => () => {
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      disposeActiveAudio();
    },
    [disposeActiveAudio],
  );

  useEffect(() => {
    const audio = activeAudioRef.current;
    if (!audio) return;
    if (isKarteModalOpen) {
      if (!audio.paused) {
        audioResumePositionRef.current = audio.currentTime;
        shouldResumeAudioRef.current = true;
        audio.pause();
        setIsSpeaking(false);
      }
      return;
    }
    if (shouldResumeAudioRef.current) {
      audio.currentTime = audioResumePositionRef.current;
      const playPromise = audio.play();
      shouldResumeAudioRef.current = false;
      if (playPromise) {
        playPromise
          .then(() => {
            setIsSpeaking(true);
          })
          .catch(() => {
            if (activeAudioRef.current === audio) {
              disposeActiveAudio();
            }
          });
      } else {
        setIsSpeaking(true);
      }
    }
  }, [disposeActiveAudio, isKarteModalOpen]);

  const toggleTextareaExpanded = useCallback(() => {
    setTextareaExpanded((prev) => !prev);
  }, []);

  const notifyApiLimit = useCallback(
    (customMessage?: string) => {
      toast({
        title: 'API使用制限に達しました',
        description: customMessage || 'これ以上メッセージを送信できません。',
        status: 'warning',
        duration: 4000,
      });
    },
    [toast],
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
            voice: 'sage',
          }),
        });
        if (!response.ok) {
          throw new Error('音声生成リクエストに失敗しました。');
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        disposeActiveAudio();
        const audio = new Audio(url);
        audio.playbackRate = 1.2;
        activeAudioRef.current = audio;
        audioSourceUrlRef.current = url;
        audioResumePositionRef.current = 0;
        shouldResumeAudioRef.current = false;

        const handleAudioComplete = () => {
          if (activeAudioRef.current === audio) {
            disposeActiveAudio();
          } else {
            URL.revokeObjectURL(url);
          }
        };

        audio.onended = handleAudioComplete;
        audio.onerror = handleAudioComplete;

        if (isKarteModalOpen) {
          shouldResumeAudioRef.current = true;
        } else {
          try {
            await audio.play();
            setIsSpeaking(true);
          } catch (playError) {
            if (activeAudioRef.current === audio) {
              disposeActiveAudio();
            } else {
              URL.revokeObjectURL(url);
            }
            throw playError;
          }
        }
      } catch (error) {
        console.error(error);
        toast({
          title: '音声再生に失敗しました',
          description: (error as Error).message,
          status: 'error',
          duration: 4000,
        });
      }
    },
    [apiKey, disposeActiveAudio, isKarteModalOpen, toast],
  );

  const runLLMProcess = useCallback(
    async (history: ConversationMessage[], finalize = false) => {
      if (!ensureApiKey()) return;
      const nextKey = isInitialMeeting ? getNextInitialKey(karte.shirp) : null;
      const systemPrompt = isInitialMeeting
        ? buildInitialPrompt(karte.shirp, nextKey)
        : finalize
          ? buildContinuousFinalizePrompt(karte.shirp)
          : buildContinuousPrompt(karte.shirp);

      setProcessingText(finalize ? 'カルテとフィードバックを整理しています...' : 'AI思考中...');
      setApiUsageCount((prev) => Math.min(prev + 1, maxApiCalls));

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

        const parsed = safeParse(content);
        if (!parsed) throw new Error('AI応答のJSON解析に失敗しました。');

        setKarte((prev) => updateShirp(prev, parsed.updated_shirp));

        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          content: parsed.reply,
        };
        setMessages((prev) => {
          const updated = [...prev, assistantMessage];
          messagesRef.current = updated;
          return updated;
        });

        if (finalize && parsed.feedback) {
          setFeedbackText(parsed.feedback);
        }

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
    [apiKey, ensureApiKey, isInitialMeeting, karte.shirp, maxApiCalls, playTextToSpeech, toast],
  );

  const handleUserMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      if (!hasConversationQuota) {
        notifyApiLimit(
          isInitialMeeting ? undefined : `継続面談は${conversationQuotaLimit}回までメッセージを送信できます。`,
        );
        return;
      }
      if (!ensureApiKey()) return;
      const nextUsageCount = apiUsageCount + 1;
      if (conversationQuotaLimit > 0 && nextUsageCount === conversationQuotaLimit) {
        notifyApiLimit('今回の送信が最後のメッセージです。');
      }
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
    [apiUsageCount, conversationQuotaLimit, ensureApiKey, hasConversationQuota, isInitialMeeting, notifyApiLimit, runLLMProcess],
  );

  const insertTextAtCursor = useCallback((incomingText: string) => {
    if (!incomingText) return;
    const textarea = textareaRef.current;
    const shouldPreserveFocus = textarea ? document.activeElement === textarea : false;
    setTextValue((prev) => {
      if (!textarea) {
        return `${prev}${incomingText}`;
      }
      const selectionStart = shouldPreserveFocus ? (textarea.selectionStart ?? prev.length) : prev.length;
      const selectionEnd = shouldPreserveFocus ? (textarea.selectionEnd ?? prev.length) : prev.length;
      const nextValue = prev.slice(0, selectionStart) + incomingText + prev.slice(selectionEnd);

      requestAnimationFrame(() => {
        if (!shouldPreserveFocus) return;
        const cursorPosition = selectionStart + incomingText.length;
        textarea.selectionStart = cursorPosition;
        textarea.selectionEnd = cursorPosition;
      });

      return nextValue;
    });
  }, []);

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

        if (isTurnTakingMode) {
          await handleUserMessage(text);
        } else {
          insertTextAtCursor(text);
        }
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
    [apiKey, ensureApiKey, handleUserMessage, insertTextAtCursor, isTurnTakingMode, toast],
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

  const getTurnTakingConversationHistory = useCallback(() => {
    return messagesRef.current.filter((message, index) => !(index === 0 && message.role === 'assistant'));
  }, []);

  const handleOpenKarteModal = useCallback(() => {
    if (isBusy) {
      toast({
        title: 'AIが処理中です',
        description: '結果を待ってからもう一度お試しください。',
        status: 'info',
        duration: 3000,
      });
      return;
    }

    setKarteModalOpen(true);
  }, [isBusy, toast]);

  const handleCloseKarteModal = useCallback(() => {
    setKarteModalOpen(false);
  }, []);

  const handleFinalizeContinuous = useCallback(async () => {
    if (isInitialMeeting) return;
    if (!hasApiBudget) {
      notifyApiLimit('API制限に達したためフィードバックを生成できません。');
      return;
    }
    if (!ensureApiKey()) return;
    const finalInputHistory = isTurnTakingMode ? getTurnTakingConversationHistory() : messagesRef.current;
    await runLLMProcess(finalInputHistory, true);
    setKarteModalOpen(true);
  }, [ensureApiKey, getTurnTakingConversationHistory, hasApiBudget, isInitialMeeting, isTurnTakingMode, notifyApiLimit, runLLMProcess]);

  const persistKarte = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LOCAL_STORAGE_KARTE_KEY, JSON.stringify(karte));
  }, [karte]);

  const handleSubmitKarte = useCallback(() => {
    disposeActiveAudio();
    persistKarte();
    setKarteModalOpen(false);
    toast({
      title: 'カルテを保存しました',
      description: '面談を終了し、ユーザホームへ移動します。',
      status: 'success',
      duration: 2500,
    });
    navigate('/user');
  }, [disposeActiveAudio, navigate, persistKarte, toast]);

  const apiStatusLabel = apiKey ? 'API Key: 設定済' : 'API Key: 未設定';
  const apiStatusColor = apiKey ? 'green' : 'gray';

  return (
    <Box bg="gray.100" minH="100dvh" h="100dvh" py={{ base: 4, md: 6 }} px={{ base: 3, md: 6 }} overflow="hidden">
      <ApiKeyModal
        isOpen={isApiModalOpen}
        currentKey={apiKey}
        onSave={(value) => {
          setApiKey(value);
          setApiModalOpen(false);
        }}
      />

      <Flex direction="column" maxW="1200px" mx="auto" gap={4} bg="transparent" h="100%" minH={0} overflow="hidden">
        <Flex direction={{ base: 'column', md: 'row' }} gap={4} flex="1" minH={0} overflow="hidden">
          <Box
            flexShrink={0}
            w="full"
            maxW={{ base: '100%', md: '45%' }}
            flex={{ base: 'none', md: '0 0 45%' }}
            minH={0}
            display="flex"
            flexDirection="column"
            gap={4}
          >
            <Box
              bg="white"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="gray.200"
              boxShadow="sm"
              p={{ base: 4, md: 6 }}
              display={!hasUsedApi ? 'block' : { base: 'none', md: 'block' }}
              flexShrink={0}
            >
              <Flex direction="column" align={{ base: 'flex-start', md: 'center' }} gap={4}>
                <HStack spacing={3}>
                  <Icon as={FaUserDoctor} color="blue.500" boxSize={6} />
                  <Box>
                    <Text fontWeight="bold" fontSize="lg">
                      {isInitialMeeting ? '初回面談ルーム' : '継続面談ルーム'}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {isInitialMeeting
                        ? 'SHIRPの順次ヒアリングでカルテを作成します'
                        : '自由対話でカルテを更新し、フィードバックをまとめます'}
                    </Text>
                  </Box>
                </HStack>
                <Flex align={{ base: 'flex-start', md: 'center' }} gap={3} wrap="wrap">
                  <Badge colorScheme={apiStatusColor}>{apiStatusLabel}</Badge>
                  {!isInitialMeeting && (
                    <Badge colorScheme={continuousMode === 'turn' ? 'purple' : 'blue'}>
                      {continuousMode === 'turn' ? 'ターンテイキングモード (Realtime API・未実装)' : '通常モード'}
                    </Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setApiModalOpen(true)}>
                    API設定
                  </Button>
                </Flex>
                {!isInitialMeeting && !hasStoredKarte && (
                  <Box bg="orange.50" borderRadius="lg" px={3} py={2} borderWidth="1px" borderColor="orange.200">
                    <Text fontSize="xs" color="orange.700">
                      初回面談のカルテが未保存のため、空のカルテで開始します。
                    </Text>
                  </Box>
                )}
              </Flex>
              <Button mt={6} colorScheme="blue" size="md" w="full" onClick={() => setSessionStarted(true)} isDisabled={hasUsedApi}>
                {isInitialMeeting ? '初回面談を開始する' : '継続面談を開始する'}
              </Button>
            </Box>

            <VrmStage
              isSpeaking={isSpeaking}
              conversationStarted={conversationStarted}
              progress={initialProgress}
              showProgress={isInitialMeeting}
            />
          </Box>

          <Flex
            direction="column"
            flex="1"
            gap={4}
            minH={0}
            display={hasUsedApi ? 'flex' : { base: 'none', md: 'flex' }}
          >
            <Box
              bg="white"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="gray.200"
              boxShadow="lg"
              display="flex"
              flexDirection="column"
              flex="1"
              minH={0}
              overflow="hidden"
            >
              {isTurnTakingMode ? (
                <Box flex="1" minH={0} overflowY="auto" px={{ base: 3, md: 4 }} py={4} bg="gray.50">
                  <Stack spacing={3}>
                    <Box bg="purple.50" borderRadius="lg" px={3} py={2} borderWidth="1px" borderColor="purple.200">
                      <Text fontSize="xs" color="purple.700">
                        Realtime APIは未実装です。現在は音声入力ベースで会話し、終了時に会話履歴とカルテを使って1回だけ更新します。
                      </Text>
                    </Box>
                    <KartePanel data={karte} />
                  </Stack>
                </Box>
              ) : (
                <Box ref={chatContainerRef} flex="1" minH={0} overflowY="auto" px={{ base: 3, md: 4 }} py={4} bg="gray.50">
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
              )}
              <ProcessingIndicator message={processingText} />
              <Box borderTopWidth="1px" borderColor="gray.100" p={4}>
                <Stack spacing={3}>
                  {isTurnTakingMode ? (
                    <Flex gap={3} align="center" justify="center">
                      <IconButton
                        aria-label="音声入力"
                        icon={<FaMicrophone />}
                        colorScheme={isRecording ? 'red' : 'blue'}
                        isDisabled={isBusy || !hasConversationQuota}
                        onClick={toggleRecording}
                        isRound
                        minW="56px"
                        h="56px"
                      />
                      <Text fontSize="sm" color="gray.600">
                        マイクで話すと自動で送信されます（残り{remainingMessages}回）
                      </Text>
                    </Flex>
                  ) : (
                    <Flex gap={3} align="center">
                      <IconButton
                        aria-label="音声入力"
                        icon={<FaMicrophone />}
                        colorScheme={isRecording ? 'red' : 'blue'}
                        isDisabled={isBusy || !hasConversationQuota}
                        onClick={toggleRecording}
                        isRound
                        minW="56px"
                        h="56px"
                      />
                      <Box position="relative" flex="1">
                        <Textarea
                          ref={textareaRef}
                          value={textValue}
                          onChange={(e) => setTextValue(e.target.value)}
                          placeholder={textareaPlaceholder}
                          borderRadius="xl"
                          bg="white"
                          borderColor="gray.200"
                          resize="none"
                          rows={isTextareaExpanded ? 6 : 2}
                          flex="1"
                          pr="2"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.shiftKey) {
                              e.preventDefault();
                              handleUserMessage(textValue);
                            }
                          }}
                          isDisabled={isBusy}
                        />
                        <IconButton
                          aria-label={isTextareaExpanded ? 'テキストエリアを縮小' : 'テキストエリアを拡張'}
                          icon={<FaUpDown />}
                          onClick={toggleTextareaExpanded}
                          variant="solid"
                          colorScheme="blackAlpha"
                          opacity={0.6}
                          _hover={{ opacity: 0.9 }}
                          size="sm"
                          position="absolute"
                          top="2"
                          right="2"
                          borderRadius="lg"
                        />
                      </Box>
                      <IconButton
                        aria-label="送信"
                        icon={<FaPaperPlane />}
                        colorScheme="blue"
                        onClick={() => handleUserMessage(textValue)}
                        isDisabled={!textValue.trim() || isBusy || !hasConversationQuota}
                        borderRadius="full"
                        minW="56px"
                        h="56px"
                      />
                    </Flex>
                  )}
                  <Stack spacing={2}>
                    {!isTurnTakingMode && (
                      <Button leftIcon={<FaWandMagicSparkles />} variant="ghost" colorScheme="purple" onClick={handleOpenKarteModal} isDisabled={messages.length <= 1 || isBusy}>
                        カルテを確認
                      </Button>
                    )}
                    {!isInitialMeeting && (
                      <Button variant="solid" colorScheme="teal" onClick={handleFinalizeContinuous} isDisabled={messages.length <= 1 || isBusy}>
                        面談を終了してフィードバックを見る
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Flex>
        </Flex>
      </Flex>

      <Modal isOpen={isKarteModalOpen} onClose={handleCloseKarteModal} size="xl" scrollBehavior="inside" isCentered>
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent borderRadius="2xl" mx={{ base: 3, md: 0 }} maxH="90dvh" display="flex" flexDirection="column">
          <ModalHeader>
            <Flex align="center" justify="left" gap={3} wrap="wrap">
              <Text fontSize="lg" fontWeight="bold">
                キャリアカルテを確認
              </Text>
              {isInitialMeeting && (
                <Badge colorScheme={initialProgress >= 100 ? 'green' : 'purple'} borderRadius="md" size="lg">
                  {initialProgress}%
                </Badge>
              )}
            </Flex>
            <Text fontSize="sm" color="gray.500" mt={1}>
              作成されたカルテをスクロールしながら確認してください
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pt={0}>
            <Stack spacing={4}>
              {!isInitialMeeting && feedbackText && (
                <Box bg="teal.50" borderRadius="lg" borderWidth="1px" borderColor="teal.200" p={4}>
                  <Text fontSize="sm" fontWeight="bold" color="teal.700" mb={2}>
                    面談フィードバック
                  </Text>
                  <Text fontSize="sm" color="teal.800">
                    {feedbackText}
                  </Text>
                </Box>
              )}
              <KartePanel data={karte} />
            </Stack>
          </ModalBody>
          <ModalFooter flexDir={{ base: 'column', sm: 'row' }} gap={3}>
            <Button w="full" colorScheme="blue" onClick={handleCloseKarteModal}>
              トークに戻る
            </Button>
            <Button w="full" variant="outline" colorScheme="purple" onClick={handleSubmitKarte}>
              このカルテを保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MeetingRoom;
