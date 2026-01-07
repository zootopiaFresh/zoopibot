# 알림 (Alarm)

> 푸시 알림, SMS, 재입고 알림 관련 테이블

---

## 📋 테이블 목록

- [alarm](#alarm)
- [alarm_sub](#alarm_sub)
- [marketing_log](#marketing_log)
- [push_token_list](#push_token_list)
- [restock_notification](#restock_notification) - 재입고 알림 신청
- [restock_notification_queue](#restock_notification_queue) - 재입고 알림 발송 대기열
- [sms_send_log](#sms_send_log)
- [sms_template](#sms_template)

---

## alarm

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | NO | MUL |  | 회원 번호 |
| title | varchar(500) | YES |  |  | 알림 제목 |
| content | varchar(500) | YES |  |  | 알림 내용 |
| type | varchar(100) | YES |  |  | 알림 타입(delivery_change 등) |
| deeplink | varchar(500) | YES |  |  | 딥링크 URL |
| target_no | bigint | YES |  |  | 대상 번호 |
| marketing_no | bigint | YES |  |  | 마케팅 번호 |
| push_click_yn | varchar(10) | YES |  | N | 푸시 클릭 여부(Y/N) |
| status | varchar(10) | YES | MUL | N | 알림 상태(Y/N) |
| del_yn | varchar(10) | YES | MUL | N | 삭제 여부(Y/N) |
| createdAt | datetime | NO | MUL |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## alarm_sub

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 알람 구독 고유번호 |
| alarm_no | bigint | YES | MUL |  | 알람 번호 |
| title | varchar(500) | YES |  |  | 알람 제목 |
| content | varchar(500) | YES |  |  | 알람 내용 |
| deeplink | varchar(500) | YES |  |  | 딥링크 URL |
| target_no | bigint | YES |  |  | 대상 번호 |
| status | varchar(10) | YES |  | N | 알람 발송 상태 (N:준비중, Y:완료) |
| del_yn | varchar(10) | YES | MUL | N | 삭제 여부 (Y:삭제, N:정상) |
| createdAt | datetime | NO | MUL |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## marketing_log

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(500) | YES |  |  | 마케팅 제목 |
| content | varchar(500) | YES |  |  | 마케팅 내용 |
| type | varchar(100) | YES |  |  | 마케팅 타입 |
| deeplink | varchar(500) | YES |  |  | 딥링크 URL |
| target_no | int | YES |  |  | 대상 번호 |
| send_cnt | int | YES |  | 0 | 발송 건수 |
| click_cnt | int | YES |  | 0 | 클릭 건수 |
| push_success_cnt | int | YES |  | 0 | 푸시 성공 건수 |
| coupon_immediate_yn | varchar(10) | YES |  | N | 쿠폰 즉시 지급 여부 |
| coupon_no | bigint | YES |  |  | 쿠폰 번호 |
| coupon_limit_date | datetime | YES |  |  | 쿠폰 한정 날짜 |
| popup_title | varchar(100) | YES |  |  | 팝업 제목 |
| popup_content | varchar(100) | YES |  |  | 팝업 내용 |
| filter_json | json | YES |  |  | 필터 JSON |
| member_nos | json | YES |  |  | 회원 번호 JSON |
| send_yn | varchar(10) | YES |  | Y | 발송 여부 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| reservation_datetime | datetime | YES |  |  | 예약 발송 일시 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## push_token_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| device_id | varchar(500) | YES |  |  |  |
| app_token | varchar(500) | YES |  |  |  |
| app_device | varchar(100) | YES |  |  |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## restock_notification
> 재입고 알림 신청

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 재입고 알림 신청 번호 |
| member_no | bigint | NO | MUL |  | 회원 번호 |
| item_no | bigint | NO | MUL |  | 상품 번호 |
| status | varchar(10) | YES | MUL | PENDING | 알림 상태 (PENDING/SENT/CANCELED) |
| alarm_no | bigint | YES | MUL |  | 알림 발송 번호 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |

## restock_notification_queue
> 재입고 알림 발송 대기열

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 알림 큐 번호 |
| item_no | bigint | NO | MUL |  | 재입고된 상품 번호 |
| notification_no | bigint | YES | MUL |  | 재입고 알림 신청 번호 |
| detected_time | datetime | NO |  | CURRENT_TIMESTAMP | 재고 변경 감지 시간 |
| scheduled_time | datetime | NO |  |  | 알림 발송 예정 시간 |
| processing_status | varchar(15) | NO | MUL | WAITING | 처리 상태 (WAITING/IN_PROGRESS/COMPLETED/FAILED) |
| alarm_no | bigint | YES |  |  | 알림 발송 번호 |
| del_yn | char(1) | NO |  | N | 삭제 여부 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |

## sms_send_log

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| sms_type | varchar(50) | YES |  |  |  |
| type | varchar(50) | YES |  |  |  |
| phoneNumber | varchar(100) | YES |  |  |  |
| content | text | YES |  |  |  |
| result | varchar(100) | YES |  |  |  |
| message | varchar(200) | YES |  |  |  |
| order_no | bigint | YES |  |  |  |
| admin_no | bigint | YES |  |  |  |
| template_case | varchar(100) | YES |  |  |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## sms_template

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| id | bigint | NO | PRI |  | 템플릿 ID |
| case | varchar(100) | NO |  |  | 템플릿 케이스(용도) |
| title | varchar(200) | NO |  |  | 템플릿 제목 |
| content | text | NO |  |  | 템플릿 내용 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | YES |  |  | 생성일 |
| updatedAt | datetime | YES |  |  | 수정일 |

