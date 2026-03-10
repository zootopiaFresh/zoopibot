const DEFAULT_SCHEMA_TAGS_BY_NAME: Record<string, string[]> = {
  '00-enums': ['enum', '상태값', '코드값', '플래그', 'del_yn', 'show_yn', 'use_yn'],
  '00-relations': ['join', '조인', '관계', 'fk', '연결', '매핑'],
  '01-member': [
    'member',
    '회원',
    '고객',
    '유저',
    '가입',
    '가입자',
    '탈퇴',
    '휴면',
    '등급',
    '로그인',
    '소셜',
  ],
  '02-pet': [
    'pet',
    '반려동물',
    '펫',
    '강아지',
    '고양이',
    '알레르기',
    '질병',
    '식습관',
    '품종',
  ],
  '03-item': [
    'item',
    'items',
    '상품',
    '제품',
    '카테고리',
    '브랜드',
    '재고',
    '사료',
    '영양',
    'food',
  ],
  '04-order': [
    'order',
    '주문',
    '주문건',
    '결제',
    '매출',
    '구매',
    '판매',
    '환불',
    '취소',
    '장바구니',
    '정산',
  ],
  '05-subscribe': [
    'subscribe',
    'subscription',
    '구독',
    '정기구독',
    '구독자',
    '정기배송',
    '정기결제',
    '유지율',
    '해지',
  ],
  '06-coupon': [
    'coupon',
    'point',
    '쿠폰',
    '포인트',
    '적립',
    '할인',
    '리워드',
    '프리퀀시',
  ],
  '07-event': [
    'event',
    'campaign',
    '이벤트',
    '캠페인',
    '프로모션',
    '출석',
    '응모',
    '경품',
  ],
  '08-content': [
    'content',
    'banner',
    'post',
    '콘텐츠',
    '배너',
    '게시물',
    '포스트',
    '섹션',
    '홈탭',
  ],
  '09-review': [
    'review',
    'reviews',
    '리뷰',
    '후기',
    '평점',
    '별점',
    '신고',
  ],
  '10-delivery': [
    'delivery',
    'shipping',
    '배송',
    '출고',
    '도착',
    '송장',
    '배송지',
    '배송일',
    '새벽배송',
  ],
  '11-alarm': [
    'alarm',
    'push',
    'sms',
    '알림',
    '푸시',
    '문자',
    '마케팅',
    '재입고',
  ],
  '12-partner': [
    'partner',
    'partners',
    'kls',
    'teamfresh',
    '파트너',
    '물류',
    '재고연동',
    '송장',
  ],
  '13-system': [
    'system',
    'admin',
    'faq',
    'notice',
    '시스템',
    '관리자',
    '로그',
    '공지',
    'api',
  ],
  '99-vip': ['vip', 'vvip', '테스트', 'test'],
};

function normalizeTagKey(tag: string): string {
  return tag.trim().toLowerCase();
}

export function getDefaultSchemaTags(promptName: string): string[] {
  return DEFAULT_SCHEMA_TAGS_BY_NAME[promptName] ?? [];
}

export function parseSchemaTags(rawTags?: string | null): string[] {
  if (!rawTags) {
    return [];
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const part of rawTags.split(/[\n,]+/)) {
    const tag = part.trim();
    if (!tag) {
      continue;
    }

    const key = normalizeTagKey(tag);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}

export function normalizeSchemaTagsInput(rawTags?: string | null): string {
  return parseSchemaTags(rawTags).join(', ');
}

export function getMergedSchemaTags(
  promptName: string,
  rawTags?: string | null
): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const tag of [...getDefaultSchemaTags(promptName), ...parseSchemaTags(rawTags)]) {
    const key = normalizeTagKey(tag);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    tags.push(tag);
  }

  return tags;
}
