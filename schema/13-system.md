# 시스템 (System)

> 관리자, 로그, 설정, FAQ 관련 테이블

---

## 📋 테이블 목록

- [admin](#admin)
- [api_call_log](#api_call_log)
- [app_event_log](#app_event_log)
- [bgm_list](#bgm_list)
- [circuit_break](#circuit_break)
- [deeplink_list](#deeplink_list)
- [etc](#etc)
- [faq](#faq)
- [faq_group](#faq_group)
- [json_chunk](#json_chunk)
- [landing_route](#landing_route)
- [like_history](#like_history)
- [live_rooms](#live_rooms)
- [notice](#notice)
- [scheduler_log](#scheduler_log)
- [user](#user)

---

## admin

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| name | varchar(100) | NO |  |  | 관리자 이름 |
| id | varchar(100) | NO |  |  | 관리자 로그인 ID |
| password | varchar(500) | NO |  |  | 관리자 비밀번호 |
| nickname | varchar(100) | NO |  |  | 관리자 닉네임 |
| profile_img | varchar(500) | NO |  |  | 관리자 프로필 이미지 경로 |
| phone_number | varchar(20) | NO |  |  | 관리자 전화번호 |
| status | bigint | NO |  |  | 관리자 상태 (1: 활성, 0: 비활성) |
| level | int | YES |  |  | 관리자 권한 레벨 (1: 최고관리자, 2: 일반관리자) |
| createdAt | datetime | NO |  |  | 생성 일시 |
| updatedAt | datetime | NO |  |  | 수정 일시 |

## api_call_log

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| host | varchar(500) | YES | MUL |  | API 호스트 URL |
| request | json | YES |  |  | SOAP 요청 정보(uri, body, method, headers) |
| response | json | YES |  |  | SOAP 응답 정보(res) |
| memo | varchar(500) | YES |  |  | 메모 |
| member_no | bigint | YES |  |  | 회원 번호 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## app_event_log

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| event_id | varchar(150) | NO |  |  | 이벤트 고유 식별자 |
| event_type | varchar(50) | NO |  |  | 이벤트 유형 (page) |
| event_sub_type | varchar(50) | NO |  |  | 이벤트 세부 유형 (calc_feed) |
| timestamp | varchar(50) | NO |  |  | 이벤트 발생 시간 (ISO8601) |
| member_no | bigint | NO |  |  | 회원 번호 |
| payload | json | NO |  |  | 이벤트 페이로드 (age, weight 등 메타데이터) |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP |  |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP |  |
| unique_id | varchar(100) | YES |  |  | 고유 식별값 |

## bgm_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| bgm_url | varchar(500) | YES |  |  | 배경음악 URL |
| ordering | bigint | YES | MUL | 0 | 정렬 순서 |
| del_yn | varchar(10) | YES | MUL | N | 삭제 여부(Y/N) |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## circuit_break

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| target_date | date | NO | MUL |  |  |
| order_quantity | int | NO |  | 0 |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP |  |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP |  |

## deeplink_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint unsigned | NO | PRI |  |  |
| code | varchar(100) | NO | MUL |  | 딥링크 코드 |
| name | varchar(100) | NO |  |  | 딥링크 이름 |
| require_no | tinyint(1) | NO |  | 0 | 필수 여부 |
| target_no | bigint unsigned | YES |  |  | 타겟 no |
| description | varchar(500) | YES |  |  | 설명 |
| use_yn | char(1) | NO |  | Y | 사용 여부 |
| del_yn | char(1) | NO |  | N | 삭제 여부 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |

## etc

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| point_percent | float | NO |  | 0 | 포인트 적립률 |
| review_point | int | YES |  | 0 | 리뷰 포인트 |
| photo_review_point | int | YES |  | 0 | 사진 리뷰 포인트 |
| promotion_photo_review_point | int | YES |  | 0 | 프로모션 사진 리뷰 포인트 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## faq

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | FAQ 번호 |
| group_no | bigint | NO | MUL |  | FAQ 그룹 번호 |
| title | varchar(500) | YES |  |  | FAQ 제목 |
| content | varchar(1000) | YES |  |  | FAQ 내용 |
| top_yn | varchar(10) | YES |  | N | 상단 고정 여부(Y/N) |
| hide_yn | varchar(10) | YES |  | N | 숨김 여부(Y/N) |
| del_yn | varchar(10) | YES |  | N | 삭제 여부(Y/N) |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## faq_group

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 그룹번호 |
| title | varchar(50) | YES |  |  | 그룹제목 |
| ordering | int | YES |  | 0 | 정렬순서 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |

## json_chunk

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| category | varchar(50) | NO |  |  | 사료 전환 관련 가이드 |
| ordering | int | NO |  |  | 같은 카테고리 내 청크의 순서 |
| alias | varchar(50) | NO | UNI |  | 청크의 고유 별칭 |
| json | json | NO |  |  | 사료 전환 시 설사/구토, 알레르기 증상 대처법 및 사료 혼합 급여 방법에 대한 상세 가이드 데이터 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP |  |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP |  |

## landing_route

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| type | varchar(100) | NO |  |  | 랜딩 유형 (예: manage) |
| blog_no | varchar(100) | YES |  |  | 블로그 번호 |
| count | int | NO |  | 0 | 랜딩 카운트 |
| createdAt | datetime | NO |  |  | 생성 일시 |
| updatedAt | datetime | NO |  |  | 수정 일시 |

## like_history

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | YES | MUL |  | 회원 번호 |
| device_id | varchar(500) | YES |  |  | 디바이스 ID |
| type | varchar(100) | NO | MUL |  | 좋아요 대상 유형(item 등) |
| target_no | bigint | NO |  |  | 좋아요 대상 번호 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## live_rooms

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(200) | YES | UNI |  | 라이브룸 제목 |
| live_id | varchar(255) | YES | UNI |  | 라이브 ID (UUID 형식) |
| start_at | datetime | YES |  |  | 라이브 시작 시간 |
| end_at | datetime | YES |  |  | 라이브 종료 시간 |
| createdAt | datetime | YES |  | now() |  |
| updatedAt | datetime | YES |  | CURRENT_TIMESTAMP |  |

## notice

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(300) | YES |  |  | 공지사항 제목 |
| content | text | YES |  |  | 공지사항 내용 |
| img | varchar(300) | YES |  |  | 공지사항 이미지 URL |
| view_cnt | bigint | YES |  | 0 | 조회수 |
| hide_yn | varchar(10) | YES |  | N | 숨김 여부 (Y/N) |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 (Y/N) |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## scheduler_log

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| id | bigint | NO | PRI |  |  |
| job_name | varchar(100) | NO |  |  |  |
| start_time | datetime | NO |  |  |  |
| end_time | datetime | YES |  |  |  |
| duration_ms | int | YES |  |  |  |
| status | enum('running','success','failed') | NO |  | running |  |
| error_message | text | YES |  |  |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |
| importance_reason | varchar(255) | YES |  |  | 중요 작업 사유 |

## user

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | int | NO | PRI |  |  |
| name | varchar(100) | NO |  |  |  |
| id | varchar(100) | NO | UNI |  |  |
| password | varchar(500) | NO |  |  |  |
| nickname | varchar(100) | NO |  |  |  |
| profile_img | varchar(500) | NO |  |  |  |
| phone_number | varchar(20) | NO |  |  |  |
| status | bigint | NO |  |  |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

