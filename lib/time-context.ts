const DEFAULT_APP_TIME_ZONE = process.env.APP_TIMEZONE || 'Asia/Seoul';

interface ZonedDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
}

function getNumericPart(
  parts: Intl.DateTimeFormatPart[],
  type: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'
): number {
  const value = parts.find((part) => part.type === type)?.value;
  return value ? Number.parseInt(value, 10) : 0;
}

function getZonedDateTimeParts(
  date: Date,
  timeZone: string = DEFAULT_APP_TIME_ZONE
): ZonedDateTimeParts {
  const numericParts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const weekday = new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    weekday: 'long',
  }).format(date);

  return {
    year: getNumericPart(numericParts, 'year'),
    month: getNumericPart(numericParts, 'month'),
    day: getNumericPart(numericParts, 'day'),
    hour: getNumericPart(numericParts, 'hour'),
    minute: getNumericPart(numericParts, 'minute'),
    second: getNumericPart(numericParts, 'second'),
    weekday,
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function getTimeZoneOffsetLabel(
  date: Date,
  timeZone: string = DEFAULT_APP_TIME_ZONE
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  }).formatToParts(date);

  const label = parts.find((part) => part.type === 'timeZoneName')?.value;
  return label ? label.replace('GMT', 'UTC') : 'UTC';
}

function getTimeZoneOffsetMinutes(
  date: Date,
  timeZone: string = DEFAULT_APP_TIME_ZONE
): number {
  const label = getTimeZoneOffsetLabel(date, timeZone);
  const match = label.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    return 0;
  }

  const [, sign, hours, minutes = '00'] = match;
  const totalMinutes =
    Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);

  return sign === '-' ? -totalMinutes : totalMinutes;
}

export function getAppTimeZone(): string {
  return DEFAULT_APP_TIME_ZONE;
}

export function formatCurrentTimeForPrompt(
  now: Date = new Date(),
  timeZone: string = DEFAULT_APP_TIME_ZONE
): string {
  const parts = getZonedDateTimeParts(now, timeZone);
  const offsetLabel = getTimeZoneOffsetLabel(now, timeZone);

  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)} (${timeZone}, ${offsetLabel}, ${parts.weekday})`;
}

export function buildCurrentTimePromptContext(
  now: Date = new Date(),
  timeZone: string = DEFAULT_APP_TIME_ZONE
): string {
  const parts = getZonedDateTimeParts(now, timeZone);
  const today = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterdayParts = getZonedDateTimeParts(yesterday, timeZone);
  const tomorrowParts = getZonedDateTimeParts(tomorrow, timeZone);
  const thisMonthStart = `${parts.year}-${pad2(parts.month)}-01`;
  const thisMonthEnd = `${parts.year}-${pad2(parts.month)}-${pad2(new Date(parts.year, parts.month, 0).getDate())}`;
  const previousMonth = parts.month === 1
    ? { year: parts.year - 1, month: 12 }
    : { year: parts.year, month: parts.month - 1 };
  const previousMonthStart = `${previousMonth.year}-${pad2(previousMonth.month)}-01`;
  const previousMonthEnd = `${previousMonth.year}-${pad2(previousMonth.month)}-${pad2(new Date(previousMonth.year, previousMonth.month, 0).getDate())}`;

  return [
    `현재 기준 시각: ${formatCurrentTimeForPrompt(now, timeZone)}`,
    `상대 날짜 해석 기준: 오늘=${today}, 어제=${yesterdayParts.year}-${pad2(yesterdayParts.month)}-${pad2(yesterdayParts.day)}, 내일=${tomorrowParts.year}-${pad2(tomorrowParts.month)}-${pad2(tomorrowParts.day)}, 이번 달=${thisMonthStart}~${thisMonthEnd}, 지난달=${previousMonthStart}~${previousMonthEnd}`,
    '중요: 사용자가 "오늘", "어제", "내일", "이번 주", "지난주", "이번 달", "지난달"처럼 상대 날짜를 말하면 반드시 위 기준 시각과 시간대를 기준으로 절대 날짜 범위를 해석하세요.',
    '질문에 상대 날짜가 포함되면 explanation에 해석한 실제 날짜 범위를 구체적으로 적으세요.',
    '모델의 내부 지식이나 서버 기본 시간대를 임의로 사용하지 마세요.',
  ].join('\n');
}

export function getStartOfTodayInAppTimeZone(
  now: Date = new Date(),
  timeZone: string = DEFAULT_APP_TIME_ZONE
): Date {
  const parts = getZonedDateTimeParts(now, timeZone);
  const midnightUtc = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0)
  );
  const offsetMinutes = getTimeZoneOffsetMinutes(midnightUtc, timeZone);

  return new Date(midnightUtc.getTime() - offsetMinutes * 60 * 1000);
}
