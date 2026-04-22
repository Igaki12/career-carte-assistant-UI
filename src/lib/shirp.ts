import type {
  ShirpDetailCategoryKey,
  ShirpDetailFieldData,
  ShirpDetailsData,
  ShirpKey,
} from '../types';

type ShirpDetailDefinition = {
  label: string;
  promptHint: string;
  items: Record<string, string>;
};

const DETAIL_DEFINITION_BASE = {
  S: {
    externalConditions: {
      label: '外的条件',
      promptHint: '現状の収入、労働時間、勤務形態、作業環境、雇用の安定性への満足',
      items: {
        income: '収入',
        workingHours: '労働時間',
        workStyle: '勤務形態',
        workEnvironment: '作業環境',
        employmentStability: '雇用の安定性',
      },
    },
    jobContent: {
      label: '仕事内容',
      promptHint: '現在の仕事内容そのもの、達成感、能力発揮、成長実感、自律性、多様性への満足',
      items: {
        jobContent: '仕事内容そのもの',
        accomplishment: '達成感',
        abilityUtilization: '能力発揮',
        growthFeeling: '成長実感',
        autonomy: '自律性',
        diversity: '多様性',
      },
    },
    relationshipsAndOrgFit: {
      label: '人間関係・組織適応',
      promptHint: '上司・同僚との関係、組織文化への適応、心理的安全性、相談可能性',
      items: {
        supervisorRelationship: '上司との関係',
        colleagueRelationship: '同僚との関係',
        organizationalCultureFit: '組織文化への適応',
        psychologicalSafety: '心理的安全性',
        consultationAvailability: '相談可能性',
      },
    },
    selfEvaluationAndAcceptance: {
      label: '自己評価・自己納得',
      promptHint: '自身への評価、適性の実感、興味との一致、道義的納得感',
      items: {
        selfEvaluation: '自身への評価',
        aptitudeFit: '適性の実感',
        interestAlignment: '興味との一致',
        moralAlignment: '道義的納得感',
      },
    },
  },
  H: {
    treatmentPreferences: {
      label: '処遇面の希望',
      promptHint: '将来望む収入、安定性、昇進や役割の希望',
      items: {
        desiredIncome: '収入',
        desiredStability: '安定性',
        desiredPromotionRole: '昇進・役割',
      },
    },
    workPreferences: {
      label: '仕事面の希望',
      promptHint: '将来望む仕事内容、専門性、管理職志向、専門職志向、創造性、研究性、対人性、奉仕性・社会的意義',
      items: {
        desiredJobContent: '仕事内容',
        desiredSpecialization: '専門性',
        managementOrientation: '管理職志向',
        specialistOrientation: '専門職志向',
        creativity: '創造性',
        researchOrientation: '研究性',
        interpersonalOrientation: '対人性',
        serviceSocialMeaning: '奉仕性・社会的意義',
      },
    },
    workStylePreferences: {
      label: '働き方の希望',
      promptHint: '将来望む勤務形態、労働時間、勤務地、柔軟性',
      items: {
        desiredWorkStyle: '勤務形態',
        desiredWorkingHours: '労働時間',
        desiredLocation: '勤務地',
        desiredFlexibility: '柔軟性',
      },
    },
    selfRealizationPreferences: {
      label: '自己実現面の希望',
      promptHint: '能力発揮、達成感、自律性、性格や興味との一致、道義的納得感、社会的評価の希望',
      items: {
        desiredAbilityUtilization: '能力発揮',
        desiredAccomplishment: '達成感',
        desiredAutonomy: '自律性',
        desiredInterestAlignment: '性格・興味との一致',
        desiredMoralAlignment: '道義的納得感',
        desiredSocialRecognition: '社会的評価',
      },
    },
  },
  I: {
    capabilityExperienceIssues: {
      label: '能力・経験上の課題',
      promptHint: 'スキル、資格、実務経験、情報収集に関する不足や課題',
      items: {
        skillGap: 'スキル不足',
        qualificationGap: '資格不足',
        experienceGap: '実務経験不足',
        informationGap: '情報不足',
      },
    },
    healthLifeConstraints: {
      label: '健康・生活上の制約',
      promptHint: '健康、体力、家庭、介護・育児、時間不足、資金不足など生活上の制約',
      items: {
        healthConstraint: '健康',
        physicalConstraint: '体力',
        familyConstraint: '家庭',
        caregivingParentingConstraint: '介護・育児',
        timeConstraint: '時間不足',
        financialConstraint: '資金不足',
      },
    },
    psychologicalIssues: {
      label: '心理的課題',
      promptHint: '自信不足、不安、迷い、自己評価の低さなど現在の心理的課題',
      items: {
        lackOfConfidence: '自信不足',
        anxiety: '不安',
        indecision: '迷い',
        lowSelfEvaluation: '自己評価の低さ',
      },
    },
    organizationalEnvironmentalConstraints: {
      label: '組織・環境上の制約',
      promptHint: '組織制度、機会の少なさ、年齢・ライフステージ、周囲の理解不足など環境要因の制約',
      items: {
        organizationalSystemsConstraint: '組織制度',
        lackOfOpportunities: '機会の少なさ',
        ageLifeStageConstraint: '年齢・ライフステージ',
        lackOfUnderstanding: '周囲の理解不足',
      },
    },
  },
  R: {
    capabilityResources: {
      label: '能力資源',
      promptHint: '資格、スキル、経験、実績など活用できる能力資源',
      items: {
        qualification: '資格',
        skill: 'スキル',
        experience: '経験',
        achievement: '実績',
      },
    },
    interpersonalResources: {
      label: '対人資源',
      promptHint: '協力者、上司、同僚、家族、メンター・相談相手などの支援',
      items: {
        supporter: '協力者',
        supervisorSupport: '上司',
        colleagueSupport: '同僚',
        familySupport: '家族',
        mentorOrAdvisor: 'メンター・相談相手',
      },
    },
    psychologicalResources: {
      label: '心理資源',
      promptHint: '自己効力感、学習意欲、継続力、自己理解、回復力など内的資源',
      items: {
        selfEfficacy: '自己効力感',
        learningMotivation: '学習意欲',
        persistence: '継続力',
        selfUnderstanding: '自己理解',
        resilience: '回復力',
      },
    },
    environmentalResources: {
      label: '環境資源',
      promptHint: '使える時間や資金、学習機会、社内制度、社外ネットワークなどの環境資源',
      items: {
        availableTime: '使える時間',
        availableFunds: '使える資金',
        learningOpportunities: '学習機会',
        internalSystems: '社内制度',
        externalNetwork: '社外ネットワーク',
      },
    },
    fitResources: {
      label: '適合資源',
      promptHint: '性格、興味、価値観、道義的納得感など継続を支える適合性',
      items: {
        personalityFit: '性格との適合',
        interestFit: '興味との適合',
        valueAlignment: '価値観との一致',
        moralAlignment: '道義的納得感',
      },
    },
  },
  P: {
    explorationActions: {
      label: '探索行動',
      promptHint: '次回までの情報収集、自己分析、相談の計画',
      items: {
        informationGathering: '情報収集',
        selfAnalysis: '自己分析',
        consultation: '相談',
      },
    },
    learningActions: {
      label: '学習行動',
      promptHint: '次回までの学習、資格取得準備、書類作成、実績整理の計画',
      items: {
        learning: '学習',
        certificationPreparation: '資格取得準備',
        documentPreparation: '書類作成',
        achievementOrganization: '実績整理',
      },
    },
    executionActions: {
      label: '実行行動',
      promptHint: '次回までの異動希望提出、面談設定、ネットワーク形成の計画',
      items: {
        transferRequest: '異動希望提出',
        meetingSetup: '面談設定',
        networkBuilding: 'ネットワーク形成',
      },
    },
    executionManagement: {
      label: '実行管理',
      promptHint: '期限、優先順位、相談先、成果確認方法など実行管理の計画',
      items: {
        deadline: '期限',
        priority: '優先順位',
        consultationContact: '相談先',
        progressCheckMethod: '成果確認方法',
      },
    },
  },
} as const satisfies Record<ShirpDetailCategoryKey, Record<string, ShirpDetailDefinition>>;

type ShirpDetailDefinitionMap = typeof DETAIL_DEFINITION_BASE;

export const SHIRP_LABELS: Record<ShirpKey, string> = {
  S: 'S. 現状 (Satisfaction/現状)',
  H: 'H. 希望 (Hope/希望)',
  I: 'I. 課題 (Issue/課題)',
  R: 'R. 資源 (Resource/資源)',
  P: 'P. 計画 (Plan/計画)',
  '#': '# その他 (自由記述)',
};

const buildDetailFieldLabels = <K extends ShirpDetailCategoryKey>(category: K) =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(DETAIL_DEFINITION_BASE[category]).map(([field, definition]) => [field, definition.label]),
    ) as Record<keyof ShirpDetailDefinitionMap[K] & string, string>,
  );

const buildDetailPromptHints = <K extends ShirpDetailCategoryKey>(category: K) =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(DETAIL_DEFINITION_BASE[category]).map(([field, definition]) => [field, definition.promptHint]),
    ) as Record<keyof ShirpDetailDefinitionMap[K] & string, string>,
  );

const buildDetailItemLabels = <K extends ShirpDetailCategoryKey>(category: K) =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(DETAIL_DEFINITION_BASE[category]).map(([field, definition]) => [field, Object.freeze({ ...definition.items })]),
    ) as Record<keyof ShirpDetailDefinitionMap[K] & string, Record<string, string>>,
  );

const buildCategoryHint = (category: ShirpDetailCategoryKey) =>
  Object.values(DETAIL_DEFINITION_BASE[category])
    .map((definition) => definition.label)
    .join(' / ');

export const SHIRP_HINTS: Record<ShirpKey, string> = {
  S: buildCategoryHint('S'),
  H: buildCategoryHint('H'),
  I: buildCategoryHint('I'),
  R: buildCategoryHint('R'),
  P: buildCategoryHint('P'),
  '#': 'S〜Pに当てはまらない内容や、面談中の雑談・余談などを記録する自由記述欄',
};

export const SHIRP_DETAIL_DEFINITIONS: Readonly<Record<ShirpDetailCategoryKey, Record<string, ShirpDetailDefinition>>> =
  Object.freeze(DETAIL_DEFINITION_BASE);

export const SHIRP_DETAIL_CATEGORY_KEYS: readonly ShirpDetailCategoryKey[] = Object.freeze(
  Object.keys(SHIRP_DETAIL_DEFINITIONS) as ShirpDetailCategoryKey[],
);

export const SHIRP_DETAIL_FIELDS = Object.freeze(
  Object.fromEntries(
    SHIRP_DETAIL_CATEGORY_KEYS.map((category) => [category, Object.freeze(Object.keys(SHIRP_DETAIL_DEFINITIONS[category]))]),
  ) as Record<ShirpDetailCategoryKey, readonly string[]>,
);

export const SHIRP_DETAIL_LABELS = Object.freeze(
  Object.fromEntries(SHIRP_DETAIL_CATEGORY_KEYS.map((category) => [category, buildDetailFieldLabels(category)])) as Record<
    ShirpDetailCategoryKey,
    Record<string, string>
  >,
);

export const SHIRP_DETAIL_PROMPT_HINTS = Object.freeze(
  Object.fromEntries(SHIRP_DETAIL_CATEGORY_KEYS.map((category) => [category, buildDetailPromptHints(category)])) as Record<
    ShirpDetailCategoryKey,
    Record<string, string>
  >,
);

export const SHIRP_DETAIL_ITEM_LABELS = Object.freeze(
  Object.fromEntries(SHIRP_DETAIL_CATEGORY_KEYS.map((category) => [category, buildDetailItemLabels(category)])) as Record<
    ShirpDetailCategoryKey,
    Record<string, Record<string, string>>
  >,
);

export const INITIAL_REQUIRED_SHIRP_DETAIL_STEPS = Object.freeze([
  { category: 'S', field: 'externalConditions' },
  { category: 'S', field: 'jobContent' },
  { category: 'S', field: 'relationshipsAndOrgFit' },
  { category: 'S', field: 'selfEvaluationAndAcceptance' },
  { category: 'H', field: 'treatmentPreferences' },
  { category: 'H', field: 'workPreferences' },
  { category: 'H', field: 'workStylePreferences' },
  { category: 'H', field: 'selfRealizationPreferences' },
  { category: 'I', field: 'capabilityExperienceIssues' },
  { category: 'I', field: 'healthLifeConstraints' },
  { category: 'I', field: 'psychologicalIssues' },
  { category: 'I', field: 'organizationalEnvironmentalConstraints' },
  { category: 'R', field: 'capabilityResources' },
  { category: 'R', field: 'interpersonalResources' },
  { category: 'R', field: 'psychologicalResources' },
  { category: 'R', field: 'environmentalResources' },
  { category: 'R', field: 'fitResources' },
] as const);

const createEmptyDetailField = (category: ShirpDetailCategoryKey, field: string): ShirpDetailFieldData => ({
  summary: null,
  items: Object.fromEntries(
    Object.keys(SHIRP_DETAIL_ITEM_LABELS[category][field]).map((itemKey) => [itemKey, null]),
  ) as Record<string, string | null>,
});

export const createEmptyShirpDetails = (): ShirpDetailsData =>
  Object.fromEntries(
    SHIRP_DETAIL_CATEGORY_KEYS.map((category) => [
      category,
      Object.fromEntries(SHIRP_DETAIL_FIELDS[category].map((field) => [field, createEmptyDetailField(category, field)])),
    ]),
  ) as ShirpDetailsData;

export const cloneShirpDetails = (details: ShirpDetailsData): ShirpDetailsData =>
  Object.fromEntries(
    SHIRP_DETAIL_CATEGORY_KEYS.map((category) => [
      category,
      Object.fromEntries(
        SHIRP_DETAIL_FIELDS[category].map((field) => [
          field,
          {
            summary: details[category]?.[field]?.summary ?? null,
            items: Object.fromEntries(
              Object.keys(SHIRP_DETAIL_ITEM_LABELS[category][field]).map((itemKey) => [
                itemKey,
                details[category]?.[field]?.items?.[itemKey] ?? null,
              ]),
            ) as Record<string, string | null>,
          },
        ]),
      ),
    ]),
  ) as ShirpDetailsData;

export const isShirpDetailCategoryKey = (value: ShirpKey): value is ShirpDetailCategoryKey =>
  SHIRP_DETAIL_CATEGORY_KEYS.includes(value as ShirpDetailCategoryKey);

export const getShirpDetailFieldEntries = (category: ShirpDetailCategoryKey) =>
  SHIRP_DETAIL_FIELDS[category].map((field) => [field, SHIRP_DETAIL_DEFINITIONS[category][field]] as const);

export const getShirpDetailItemEntries = (category: ShirpDetailCategoryKey, field: string) =>
  Object.entries(SHIRP_DETAIL_ITEM_LABELS[category][field] ?? {}) as Array<[string, string]>;

export const getInitialDetailStepLabel = (category: ShirpDetailCategoryKey, field: string) =>
  `${SHIRP_LABELS[category]} / ${SHIRP_DETAIL_LABELS[category][field]}`;
