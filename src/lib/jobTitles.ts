export const JOB_TITLE_OPTIONS = [
  '営業職',
  '事務/管理職',
  '販売/サービススタッフ職',
  'クリエイティブ職',
  '医療/福祉職',
  '専門/資格（弁護士等）職',
  'IT/エンジニア職',
  '製造/技術職',
  '物流/軽作業職',
  '公務/教育職',
  'その他',
] as const;

export type JobTitleOption = (typeof JOB_TITLE_OPTIONS)[number];

export const DEFAULT_JOB_TITLE: JobTitleOption = 'その他';
