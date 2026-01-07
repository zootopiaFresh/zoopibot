# 이벤트 (Event)

> 이벤트, 캠페인, 출석, 경품, 응모 관련 테이블

---

## 📋 테이블 목록

- [entry_ticket](#entry_ticket) - 응모권 테이블
- [event_activity](#event_activity) - 이벤트 활동 (캠페인 내 세부 활동)
- [event_attendance](#event_attendance)
- [event_attendance_apply](#event_attendance_apply)
- [event_campaign](#event_campaign) - 이벤트 캠페인 (최상위 개념)
- [event_condition_status](#event_condition_status) - 이벤트 조건 충족 상태 관리 테이블
- [event_configuration](#event_configuration) - 이벤트 설정 테이블
- [event_coupon](#event_coupon)
- [event_draw_history](#event_draw_history) - 행운권 추첨 이력
- [event_info](#event_info) - 이벤트 정보 테이블
- [event_item_application](#event_item_application)
- [event_item_application_apply](#event_item_application_apply)
- [event_item_application_item_list](#event_item_application_item_list)
- [event_notification](#event_notification) - 이벤트 알림 신청 테이블
- [event_notification_queue](#event_notification_queue) - 이벤트 알림 큐 테이블
- [event_notification_type](#event_notification_type) - 이벤트 알림 타입 테이블
- [event_popup](#event_popup)
- [event_prize](#event_prize) - 이벤트 경품 마스터
- [event_prize_daily_stats](#event_prize_daily_stats) - 경품별 일일 지급 통계

---

## entry_ticket
> 응모권 테이블

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 응모권 번호 |
| member_no | bigint | NO |  |  | 회원 번호 |
| ticket_serial | varchar(50) | NO | UNI |  | 티켓 시리얼 번호 |
| category | varchar(50) | NO |  |  | 티켓 카테고리 |
| issued_source | varchar(20) | NO |  |  | 발급 출처 |
| issued_at | datetime | NO |  | CURRENT_TIMESTAMP | 발급 일시 |
| issued_reason | varchar(100) | YES |  |  | 발급 사유 |
| used_yn | varchar(1) | NO |  | N | 사용 여부(Y/N) |
| used_at | datetime | YES |  |  | 사용 일시 |
| event_info_no | bigint | YES |  |  | 이벤트 정보 번호 |
| expire_date | datetime | NO |  |  | 티켓 만료 일시 |
| campaign_no | bigint | YES |  |  |  |
| activity_no | bigint | YES |  |  | 캠페인 활동 번호 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성 일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |

## event_activity
> 이벤트 활동 (캠페인 내 세부 활동)

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| campaign_no | bigint | NO | MUL |  | 캠페인 FK |
| activity_code | varchar(100) | YES |  |  | 활동 구분명 |
| activity_type | enum('ATTENDANCE','LUCKY_DRAW','PURCHASE','SHARE','RANDOM_COUPON','RAFFLE','DAILY') | NO | MUL |  |  |
| activity_name | varchar(100) | NO |  |  | 활동 이름 |
| required_attendance_count | int | YES |  | 5 | 출석 필요 일수 |
| attendance_time_start | tinyint | YES |  | 11 | 출석 가능 시작 시간 |
| attendance_time_end | tinyint | YES |  | 23 | 출석 가능 종료 시간 |
| attendance_noti_type_code | varchar(50) | YES |  |  | 출석 알림 타입 |
| entry_limit_per_member | int | YES |  | 10 | 회원당 응모 제한 |
| ticket_count_per_entry | int | YES |  | 1 | 응모당 티켓 수 |
| prize_mode | enum('FIXED','LOTTERY','NONE') | YES |  | NONE |  |
| required_purchase_amount | int | YES |  | 0 | 필요 구매 금액 |
| display_order | int | YES |  | 0 |  |
| is_active | char(1) | YES | MUL | Y |  |
| start_date | datetime | YES |  |  |  |
| end_date | datetime | YES |  |  |  |
| daily_open_time | varchar(10) | YES |  |  |  |
| createdAt | datetime | YES |  | CURRENT_TIMESTAMP |  |
| updatedAt | datetime | YES |  | CURRENT_TIMESTAMP |  |

## event_attendance

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| start_date | datetime | NO |  |  | 이벤트 시작 날짜 |
| end_date | datetime | NO |  |  | 이벤트 종료 날짜 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부(Y/N) |
| createdAt | datetime | NO |  |  | 생성 일시 |
| updatedAt | datetime | NO |  |  | 수정 일시 |

## event_attendance_apply

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| event_attendance_no | bigint | NO |  |  |  |
| member_no | bigint | NO |  |  |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## event_campaign
> 이벤트 캠페인 (최상위 개념)

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| campaign_key | varchar(50) | NO | UNI |  | 캠페인 키 (MOON_2025) |
| campaign_name | varchar(100) | NO |  |  | 캠페인 이름 |
| category | varchar(50) | NO | MUL |  | 기존 호환용 |
| start_datetime | datetime | NO |  |  |  |
| end_datetime | datetime | NO |  |  |  |
| vip_only | char(1) | YES |  | N |  |
| del_yn | char(1) | YES |  | N |  |
| status | enum('PENDING','ACTIVE','ENDED') | YES | MUL | PENDING |  |
| createdAt | datetime | YES |  | CURRENT_TIMESTAMP |  |
| updatedAt | datetime | YES |  | CURRENT_TIMESTAMP |  |

## event_condition_status
> 이벤트 조건 충족 상태 관리 테이블

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| member_no | bigint | NO | PRI |  | 회원 번호 |
| condition_type | varchar(100) | NO | PRI |  | 조건 유형 코드 |
| status | tinyint(1) | NO |  | 0 | 조건 충족 여부 (0/1) |
| achieved_at | datetime | YES |  |  | 최초 달성 시각 |
| last_changed_at | datetime | YES |  |  | 상태 최종 변경 시각 |
| last_true_at | datetime | YES |  |  | 마지막으로 달성된 시각 |
| expired_at | datetime | YES |  |  | 조건 만료 시각(옵션) |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |

## event_configuration
> 이벤트 설정 테이블

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 이벤트 설정 번호 |
| event_key | varchar(50) | NO | UNI |  | 이벤트 키 (예: MOON_2025) |
| event_name | varchar(100) | NO |  |  | 이벤트 이름 |
| description | text | YES |  |  | 이벤트 설명 |
| category | varchar(50) | NO | MUL |  | 이벤트 카테고리 (예: MOON_2025_EVENT) |
| start_datetime | datetime | NO |  |  | 이벤트 시작일시 |
| end_datetime | datetime | NO |  |  | 이벤트 종료일시 |
| required_attendance_count | int | NO |  | 5 | 필수 출석 횟수 |
| attendance_available_time_start | tinyint | NO |  | 11 | 출석 가능 시작 시간 (0-23) |
| attendance_available_time_end | tinyint | NO |  | 23 | 출석 가능 종료 시간 (0-23) |
| attendance_noti_type_code | varchar(50) | YES |  |  | event_notification_type의 type_code (출석 리마인더) |
| coupon_noti_type_code | varchar(50) | YES |  |  | event_notification_type의 type_code (쿠폰 리마인더) |
| event_year | int | YES |  |  | 이벤트 연도 |
| is_active | char(1) | YES | MUL | Y | 활성화 여부 (Y/N) |
| del_yn | char(1) | YES |  | N | 삭제 여부 (Y/N) |
| createdAt | datetime | YES |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | YES |  | CURRENT_TIMESTAMP | 수정일시 |

## event_coupon

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 이벤트 쿠폰 번호 |
| campaign_no | bigint | YES |  |  |  |
| activity_no | bigint | NO | MUL |  | event_activity.no 참조 |
| coupon_code | varchar(50) | NO | MUL |  | 쿠폰 코드 (예: RANDOM_COUPON_1) |
| weight | decimal(5,2) | NO |  | 10.00 | 가중치 (확률 비율) |
| limit_weight | decimal(5,2) | YES |  |  | 최대 가중치 한도 (null은 무제한) |
| daily_issue_limit | int | YES |  | 0 | 일일 발급 한도 (0은 무제한) |
| total_issue_limit | int | YES |  |  | 총 발급 한도 (null은 무제한) |
| issued_count | int | NO |  | 0 | 총 발급 건수 |
| is_active | char(1) | NO |  | Y | 활성화 여부 (Y/N) |
| display_order | int | NO |  | 0 | 표시 순서 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |

## event_draw_history
> 행운권 추첨 이력

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 추첨 이력 번호 |
| member_no | int | NO | MUL |  | 회원 번호 |
| event_info_no | bigint | NO |  |  | event_info.no |
| prize_no | bigint | NO | MUL |  | event_prize.no |
| prize_type | enum('POINT','COUPON','GIFT','RAFFLE') | NO |  |  | 경품 타입 |
| prize_name | varchar(100) | NO |  |  | 경품명 (스냅샷) |
| prize_rank | tinyint | YES |  |  | 당첨 등급 |
| prize_value | varchar(200) | YES |  |  | 지급된 값 (포인트액/쿠폰시리얼/선물코드) |
| issue_status | enum('SUCCESS','FAILED','PENDING') | YES |  | SUCCESS | 지급 상태 |
| issue_error_message | text | YES |  |  | 지급 실패 사유 |
| ticket_serials | json | YES |  |  | 사용된 응모권 시리얼 배열 |
| ticket_count | int | NO |  | 1 | 소진된 응모권 수 |
| activity_no | bigint | YES |  |  |  |
| drawn_at | datetime | YES | MUL | CURRENT_TIMESTAMP | 추첨 일시 |
| createdAt | datetime | YES |  | CURRENT_TIMESTAMP |  |
| updatedAt | datetime | YES |  | CURRENT_TIMESTAMP |  |

## event_info
> 이벤트 정보 테이블

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 이벤트 번호 |
| title | varchar(200) | NO |  |  | 이벤트 제목 |
| alias_code | varchar(50) | YES | UNI |  |  |
| description | text | YES |  |  | 이벤트 설명 |
| img_url | varchar(500) | YES |  |  | 이벤트 대표 이미지 |
| event_type | varchar(20) | YES |  |  | 이벤트 유형 |
| category | varchar(50) | YES |  |  | 이벤트 카테고리 |
| start_date | datetime | NO |  |  | 이벤트 시작일 |
| end_date | datetime | NO |  |  | 이벤트 종료일 |
| max_participants | int | YES |  | 0 | 최대 참여자 수 (0=무제한) |
| current_participants | int | YES |  | 0 | 현재 참여자 수 |
| entry_limit_per_member | int | YES |  | 1 | 회원당 참여 제한 횟수 |
| ticket_count_per_entry | int | NO |  | 1 | 응모당 필요한 응모권 수량 |
| status | varchar(20) | NO |  | PENDING | 이벤트 상태 (준비중, 진행중, 마감, 당첨자발표, 종료) |
| vip_yn | varchar(1) | YES |  | N |  |
| del_yn | varchar(1) | NO |  | N | 삭제 여부 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |

## event_item_application

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| start_date | datetime | YES |  |  | 이벤트 시작일시 |
| end_date | datetime | YES |  |  | 이벤트 종료일시 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 (Y/N) |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## event_item_application_apply

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| event_item_application_no | bigint | NO |  |  | 이벤트 아이템 신청 번호 |
| member_no | bigint | NO |  |  | 회원 번호 |
| event_item_application_item_no | bigint | YES |  |  | 이벤트 아이템 신청 상품 번호 |
| item_no | bigint | YES |  |  | 상품 번호 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## event_item_application_item_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| event_item_application_no | bigint | NO |  |  | 이벤트 아이템 신청 번호 |
| item_no | bigint | YES |  |  | 상품 번호 |
| partner_no | bigint | YES |  |  | 파트너 번호 |
| item_name | varchar(100) | YES |  |  | 상품명 |
| img_url | varchar(500) | YES |  |  | 상품 이미지 URL |
| count | bigint | YES |  | 0 | 신청 수량 |
| ordering | int | YES |  |  | 정렬 순서 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## event_notification
> 이벤트 알림 신청 테이블

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 이벤트 알림 신청 번호 |
| member_no | bigint | NO |  |  | 회원 번호 |
| event_info_no | bigint | YES |  |  | 이벤트 번호 (일반 알림의 경우 NULL) |
| notification_type | varchar(50) | NO |  |  | 알림 유형 |
| status | varchar(15) | NO |  | PENDING | 알림 상태 (PENDING/SENT/CANCELED/EXPIRED) |
| payload | json | YES |  |  |  |
| del_yn | varchar(1) | NO |  | N | 삭제 여부 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |
| expired_at | datetime | YES |  | CURRENT_TIMESTAMP |  |
| scheduled_at | datetime | YES |  | CURRENT_TIMESTAMP |  |

## event_notification_queue
> 이벤트 알림 큐 테이블

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 이벤트 알림 큐 번호 |
| event_info_no | bigint | NO |  |  | 이벤트 번호 |
| notification_no | bigint | NO |  |  | 이벤트 알림 신청 번호 |
| trigger_type | varchar(15) | NO |  |  | 트리거 유형 (SCHEDULE/EVENT_CHANGE/MANUAL) |
| detected_time | datetime | NO |  | CURRENT_TIMESTAMP | 이벤트 변경 감지 시간 |
| scheduled_time | datetime | NO |  |  | 알림 발송 예정 시간 |
| processing_status | varchar(15) | NO |  | WAITING | 처리 상태 (WAITING/IN_PROGRESS/COMPLETED/FAILED/RETRY) |
| retry_count | int | NO |  | 0 | 재시도 횟수 |
| max_retry | int | NO |  | 3 | 최대 재시도 횟수 |
| alarm_no | bigint | YES |  |  | 알림 발송 번호 (발송 성공시) |
| error_message | text | YES |  |  | 오류 메시지 (발송 실패시) |
| notification_content | json | YES |  |  | 알림 내용 (제목, 본문, 딥링크 등) |
| del_yn | varchar(1) | NO |  | N | 삭제 여부 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |

## event_notification_type
> 이벤트 알림 타입 테이블

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 알림 타입 번호 |
| type_code | varchar(50) | NO | MUL |  | 알림 타입 코드 (예: SUMMER_RANDOM_COUPON_OPEN) |
| type_name | varchar(100) | NO |  |  | 알림 타입 이름 |
| description | text | YES |  |  | 알림 설명 |
| category | enum('EVENT','PROMOTION','LIVE_COMMERCE','RESTOCK','SYSTEM') | NO | MUL |  | 알림 카테고리 |
| is_daily | char(1) | YES | MUL | N | 일일 반복 발송 여부 (Y/N) |
| default_send_hour | tinyint | YES |  |  | 기본 발송 시간(시) 0-23 |
| default_send_minute | tinyint | YES |  |  | 기본 발송 시간(분) 0-59 |
| start_date | date | NO |  |  | 알림 유효 시작일 |
| end_date | date | NO |  |  | 알림 유효 종료일 |
| title | varchar(200) | NO |  |  | 알림 제목 |
| content | text | NO |  |  | 알림 내용 |
| deeplink | varchar(500) | NO |  |  | 딥링크 URL |
| target_no | bigint | YES |  |  | 타겟 번호 (이벤트 탭 등) |
| is_active | char(1) | YES | MUL | Y | 활성화 여부 (Y/N) |
| del_yn | char(1) | YES |  | N | 삭제 여부 (Y/N) |
| createdAt | datetime | YES |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | YES |  | CURRENT_TIMESTAMP | 수정일시 |
| campaign_no | bigint | YES |  |  | FK to event_campaign (NULL for legacy notifications) |
| notification_type_code | varchar(50) | YES |  |  | Notification type code within campaign |

## event_popup

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(200) | YES |  |  | 팝업 제목 |
| img_url | varchar(200) | YES |  |  | 팝업 이미지 URL |
| openDate | datetime | YES |  |  | 팝업 오픈 날짜 |
| closeDate | datetime | YES |  |  | 팝업 종료 날짜 |
| deeplink | varchar(500) | YES |  |  | 팝업 딥링크 타입 |
| target_no | bigint | YES |  |  | 팝업 타겟 번호 |
| link_url | varchar(500) | YES |  |  | 팝업 링크 URL |
| ordering | int | YES |  | 0 | 팝업 정렬순서 |
| hide_yn | varchar(10) | YES |  | N | 팝업 숨김여부 |
| del_yn | varchar(10) | YES |  | N | 팝업 삭제여부 |
| createdAt | datetime | YES |  |  | 생성일시 |
| updatedAt | datetime | YES |  |  | 수정일시 |

## event_prize
> 이벤트 경품 마스터

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 경품 번호 |
| prize_name | varchar(100) | NO |  |  | 경품명 (예: 1등 10000포인트) |
| prize_type | enum('POINT','COUPON','GIFT','RAFFLE') | NO |  |  | 경품 타입 |
| prize_rank | int | YES |  |  | 경품 등급 (1등, 2등, ..., 999=꽝) |
| point_amount | int | YES |  |  | 포인트 지급액 (prize_type=POINT) |
| coupon_code | varchar(50) | YES |  |  | coupon_list.coupon_code (prize_type=COUPON) |
| gift_code | varchar(50) | YES |  |  | 실물 경품 코드 (prize_type=GIFT) |
| gift_description | text | YES |  |  | 실물 경품 설명 |
| probability | decimal(5,2) | NO |  |  | 당첨 확률 (0.01-100.00, 합계 100) |
| total_stock | int | NO |  | 0 | 총 재고 (0=무제한) |
| remaining_stock | int | NO | MUL | 0 | 남은 재고 |
| daily_limit | int | YES |  |  | 일일 지급 한도 (NULL=무제한) |
| max_daily_ratio | decimal(5,2) | YES |  |  | 일일 지급 비율 한도 (%) |
| img_url | varchar(500) | YES |  |  | 경품 이미지 URL |
| is_active | char(1) | YES | MUL | Y | 활성화 여부 (Y/N) |
| del_yn | char(1) | YES |  | N | 삭제 여부 (Y/N) |
| createdAt | datetime | YES |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | YES |  | CURRENT_TIMESTAMP | 수정일시 |
| activity_no | bigint | NO |  |  | 활동 번호 |
| no_duplicate_winner | char(1) | YES |  | N | 중복 당첨 방지 여부 ('Y'/'N') |

## event_prize_daily_stats
> 경품별 일일 지급 통계

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 통계 번호 |
| prize_no | bigint | NO | MUL |  | event_prize.no |
| stat_date | date | NO | MUL |  | 통계 날짜 |
| issued_count | int | NO |  | 0 | 당일 지급 건수 |
| createdAt | datetime | YES |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | YES |  | CURRENT_TIMESTAMP | 수정일시 |

