import type {
  ShirpDetailCategoryKey,
  ShirpDetailKeyMap,
  ShirpDetailsData,
  ShirpKey,
} from '../types';

export const SHIRP_LABELS: Record<ShirpKey, string> = {
  S: 'S. 現状 (Satisfaction/現状)',
  H: 'H. 希望 (Hope/希望)',
  I: 'I. 課題 (Issue/課題)',
  R: 'R. 資源 (Resource/資源)',
  P: 'P. プラン (Plan/プラン)',
  '#': '# その他 (自由記述)',
};

export const SHIRP_HINTS: Record<ShirpKey, string> = {
  S: '組織適応 / 自身への評価 / 良好な人間関係 / #そのほかの現状',
  H: '希望する収入 / 希望する仕事内容 / 希望する勤務形態 / #そのほかの希望',
  I: 'スキルの課題 / 健康上の課題 / 年齢の課題 / 家庭の課題 / #そのほかの課題',
  R: '強みとなる資格 / 強みとなる経験 / 強みとなる協力者 / 強みとなる時間や資金 / #そのほかの強み',
  P: 'S〜Rの情報を元に、AIが解決に向けたプランを生成する',
  '#': 'S〜Pに当てはまらない内容や、面談中の雑談・余談などを記録する自由記述欄',
};

export const SHIRP_DETAIL_LABELS: {
  [K in ShirpDetailCategoryKey]: Record<ShirpDetailKeyMap[K], string>;
} = {
  S: {
    organizationFit: '組織適応',
    selfEvaluation: '自身への評価',
    relationshipQuality: '良好な人間関係',
    otherCurrent: '#そのほかの現状',
  },
  H: {
    desiredIncome: '希望する収入',
    desiredWork: '希望する仕事内容',
    desiredWorkStyle: '希望する勤務形態',
    otherHope: '#そのほかの希望',
  },
  I: {
    skillIssue: 'スキルの課題',
    healthIssue: '健康上の課題',
    ageIssue: '年齢の課題',
    familyIssue: '家庭の課題',
    otherIssue: '#そのほかの課題',
  },
  R: {
    strengthQualification: '強みとなる資格',
    strengthExperience: '強みとなる経験',
    supporters: '強みとなる協力者',
    timeOrMoney: '強みとなる時間や資金',
    otherResource: '#そのほかの強み',
  },
};

export const SHIRP_DETAIL_PROMPT_HINTS: {
  [K in ShirpDetailCategoryKey]: Record<ShirpDetailKeyMap[K], string>;
} = {
  S: {
    organizationFit: '職場や組織へのなじみやすさ、働きやすさ、組織文化との相性',
    selfEvaluation: '本人が感じている自己評価、仕事への手応え、自信の度合い',
    relationshipQuality: '上司・同僚・部下との関係や、安心して働ける人間関係の状態',
    otherCurrent: '現状について、他の分類に入りきらない補足や余談',
  },
  H: {
    desiredIncome: '将来望む収入水準や報酬面の希望',
    desiredWork: '今後やってみたい仕事内容や役割の希望',
    desiredWorkStyle: '働き方や勤務形態に関する希望',
    otherHope: '希望について、他の分類に入りきらない補足や余談',
  },
  I: {
    skillIssue: 'スキルや経験面で感じている不足や課題',
    healthIssue: '体調や健康面での懸念や働き方への影響',
    ageIssue: '年齢に関連して感じる不安や制約',
    familyIssue: '家庭事情や生活面が仕事に与える課題',
    otherIssue: '課題について、他の分類に入りきらない補足や余談',
  },
  R: {
    strengthQualification: '資格や専門性など、強みとして活かせるもの',
    strengthExperience: '職務経験や実績など、再現性のある強み',
    supporters: '相談相手や支援者など、頼れる協力者',
    timeOrMoney: '使える時間や資金など、行動を支える資源',
    otherResource: '資源について、他の分類に入りきらない補足や余談',
  },
};

export const SHIRP_DETAIL_CATEGORY_KEYS: readonly ShirpDetailCategoryKey[] = Object.freeze(['S', 'H', 'I', 'R']);

export const SHIRP_DETAIL_FIELDS: {
  [K in ShirpDetailCategoryKey]: readonly ShirpDetailKeyMap[K][];
} = {
  S: Object.freeze(['organizationFit', 'selfEvaluation', 'relationshipQuality', 'otherCurrent']),
  H: Object.freeze(['desiredIncome', 'desiredWork', 'desiredWorkStyle', 'otherHope']),
  I: Object.freeze(['skillIssue', 'healthIssue', 'ageIssue', 'familyIssue', 'otherIssue']),
  R: Object.freeze(['strengthQualification', 'strengthExperience', 'supporters', 'timeOrMoney', 'otherResource']),
};

export const INITIAL_REQUIRED_SHIRP_DETAIL_STEPS = Object.freeze([
  { category: 'S', field: 'organizationFit' },
  { category: 'S', field: 'selfEvaluation' },
  { category: 'S', field: 'relationshipQuality' },
  { category: 'H', field: 'desiredIncome' },
  { category: 'H', field: 'desiredWork' },
  { category: 'H', field: 'desiredWorkStyle' },
  { category: 'I', field: 'skillIssue' },
  { category: 'I', field: 'healthIssue' },
  { category: 'I', field: 'ageIssue' },
  { category: 'I', field: 'familyIssue' },
  { category: 'R', field: 'strengthQualification' },
  { category: 'R', field: 'strengthExperience' },
  { category: 'R', field: 'supporters' },
  { category: 'R', field: 'timeOrMoney' },
] as const);

export const createEmptyShirpDetails = (): ShirpDetailsData => ({
  S: {
    organizationFit: null,
    selfEvaluation: null,
    relationshipQuality: null,
    otherCurrent: null,
  },
  H: {
    desiredIncome: null,
    desiredWork: null,
    desiredWorkStyle: null,
    otherHope: null,
  },
  I: {
    skillIssue: null,
    healthIssue: null,
    ageIssue: null,
    familyIssue: null,
    otherIssue: null,
  },
  R: {
    strengthQualification: null,
    strengthExperience: null,
    supporters: null,
    timeOrMoney: null,
    otherResource: null,
  },
});

export const cloneShirpDetails = (details: ShirpDetailsData): ShirpDetailsData => ({
  S: { ...details.S },
  H: { ...details.H },
  I: { ...details.I },
  R: { ...details.R },
});

export const isShirpDetailCategoryKey = (value: ShirpKey): value is ShirpDetailCategoryKey =>
  SHIRP_DETAIL_CATEGORY_KEYS.includes(value as ShirpDetailCategoryKey);

export const getInitialDetailStepLabel = <K extends ShirpDetailCategoryKey>(
  category: K,
  field: ShirpDetailKeyMap[K],
) => `${SHIRP_LABELS[category]} / ${SHIRP_DETAIL_LABELS[category][field]}`;
