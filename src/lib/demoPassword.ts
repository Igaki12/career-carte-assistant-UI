export type DemoPasswordValidationResult = {
  isValid: boolean;
  message: string | null;
};

export type DemoPasswordNotification = {
  id: string;
  accountId: string;
  accountName: string;
  email: string;
  roleLabel: string;
  temporaryPassword: string;
  issuedAt: string;
  subject: string;
  body: string;
};

type DemoPasswordNotificationInput = {
  accountId: string;
  accountName: string;
  email: string;
  roleLabel: string;
  issuedAt?: string;
};

const PASSWORD_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const PASSWORD_DIGITS = '23456789';
const PASSWORD_SYMBOLS = '!@#$%';

const pickRandomChar = (source: string) => {
  const randomValue =
    typeof crypto !== 'undefined' && 'getRandomValues' in crypto
      ? crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
      : Math.random();
  return source[Math.floor(randomValue * source.length)];
};

const shuffle = (value: string[]) => {
  const next = [...value];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomValue =
      typeof crypto !== 'undefined' && 'getRandomValues' in crypto
        ? crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
        : Math.random();
    const target = Math.floor(randomValue * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next.join('');
};

export const buildDemoPasswordIssuedAt = () => new Date().toLocaleString('ja-JP');

export const generateTemporaryPassword = () => {
  const pool = PASSWORD_LETTERS + PASSWORD_DIGITS + PASSWORD_SYMBOLS;
  const chars = [
    pickRandomChar(PASSWORD_LETTERS),
    pickRandomChar(PASSWORD_DIGITS),
    pickRandomChar(PASSWORD_SYMBOLS),
  ];

  while (chars.length < 12) {
    chars.push(pickRandomChar(pool));
  }

  return shuffle(chars);
};

export const validateDemoPassword = (password: string): DemoPasswordValidationResult => {
  if (password.length < 8) {
    return { isValid: false, message: '新しいパスワードは8文字以上で入力してください。' };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { isValid: false, message: '新しいパスワードには英字と数字を含めてください。' };
  }
  return { isValid: true, message: null };
};

export const buildPasswordNotification = ({
  accountId,
  accountName,
  email,
  roleLabel,
  issuedAt = buildDemoPasswordIssuedAt(),
}: DemoPasswordNotificationInput): DemoPasswordNotification => {
  const temporaryPassword = generateTemporaryPassword();
  const subject = 'Career Karte Assistant アカウント情報のご案内';
  const body = [
    `${accountName} 様`,
    '',
    'Career Karte Assistant のアカウント情報をお知らせします。',
    '以下の一時パスワードでログインし、初回利用時にアプリ内のアカウント情報確認からパスワードを再設定してください。',
    '',
    `アカウントID: ${accountId}`,
    `メールアドレス: ${email}`,
    `権限: ${roleLabel}`,
    `一時パスワード: ${temporaryPassword}`,
    `発行日時: ${issuedAt}`,
    '',
    'この通知文はアプリ内で作成されたものです。送信は既存の業務メーラーで行ってください。',
  ].join('\n');

  return {
    id: `${accountId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    accountId,
    accountName,
    email,
    roleLabel,
    temporaryPassword,
    issuedAt,
    subject,
    body,
  };
};

export const copyTextToClipboard = async (text: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('クリップボードを利用できません。');
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error('クリップボードへのコピーに失敗しました。');
  }
};
