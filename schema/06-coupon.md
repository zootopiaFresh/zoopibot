# 쿠폰/포인트 (Coupon & Point)

> 쿠폰, 포인트, 프리퀀시 관련 테이블

---

## 📋 테이블 목록

- [coupon](#coupon)
- [coupon_code_list](#coupon_code_list)
- [coupon_list](#coupon_list)
- [coupon_pack](#coupon_pack)
- [coupon_pack_coupon](#coupon_pack_coupon)
- [default_coupon](#default_coupon)
- [frequency](#frequency)
- [frequency_reward](#frequency_reward)
- [frequency_step](#frequency_step)
- [point](#point)

---

## coupon

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | YES | MUL |  | 회원 번호 |
| coupon_no | bigint | YES | MUL |  | 쿠폰 번호 |
| coupon_code | varchar(100) | YES | UNI |  | 쿠폰 코드 |
| use_start_time | datetime | YES |  |  | 쿠폰 사용 시작 일시 |
| use_end_time | datetime | YES | MUL |  | 쿠폰 사용 종료 일시 |
| use_yn | varchar(10) | YES | MUL | N | 쿠폰 사용 여부 (Y/N) |
| createdAt | datetime | NO |  |  | 생성 일시 |
| updatedAt | datetime | NO |  |  | 수정 일시 |

## coupon_code_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| coupon_no | bigint | YES |  |  | 쿠폰 번호 |
| coupon_code | varchar(100) | YES |  |  | 쿠폰 코드 |
| issued_yn | varchar(10) | YES |  | N | 발급 여부 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## coupon_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| partners | varchar(500) | YES | MUL |  | 쿠폰 제공 파트너사 |
| items | varchar(500) | YES |  |  | 적용 아이템 ID 목록 |
| categorys | varchar(500) | YES |  |  | 적용 카테고리 목록 |
| title | varchar(500) | YES |  |  | 쿠폰 제목 |
| coupon_num | varchar(100) | YES |  |  | 쿠폰 번호 |
| coupon_desc | varchar(300) | YES |  |  | 쿠폰 설명 |
| coupon_sub_desc | varchar(300) | YES |  |  | 쿠폰 부가 설명 |
| issuance_type | varchar(100) | YES |  |  | 발급 유형 |
| issuance_count | int | YES |  | 1 | 발급 수량 |
| reservation_date | datetime | YES |  |  | 예약 날짜 |
| group | varchar(100) | YES |  |  | 쿠폰 그룹 |
| type | varchar(100) | YES |  |  | 쿠폰 타입(price: 정액, percent: 할인율) |
| price | int | YES |  | 0 | 할인금액 또는 할인율 |
| max_price | int | YES |  | 0 | 최대 할인금액 |
| min_order_price | int | YES |  | 0 | 최소 주문금액 |
| use_start_date | datetime | YES | MUL |  | 쿠폰 사용 시작일 |
| use_end_date | datetime | YES |  |  | 쿠폰 사용 종료일 |
| budget | bigint | YES |  | 0 | 쿠폰 예산 |
| limit_count | bigint | YES |  | 0 | 쿠폰 발급 한도 |
| addable_yn | varchar(10) | YES |  | N | 장바구니 추가 가능 여부 |
| point_yn | varchar(10) | YES |  | Y | 포인트 적용 가능 여부 |
| return_yn | varchar(10) | YES |  | Y | 반품시 쿠폰 환급 여부 |
| limit_yn | varchar(10) | YES |  | N | 발급 한도 제한 여부 |
| useable_yn | varchar(10) | YES | MUL | Y | 사용 가능 여부 |
| scene_yn | varchar(10) | YES |  | N | 시나리오 팝업 표시 여부 |
| scene_modal_text | varchar(200) | YES |  |  | 시나리오 팝업 텍스트 |
| multiple_yn | varchar(10) | YES |  | N | 중복 사용 가능 여부 |
| del_yn | varchar(10) | YES | MUL | N |  |
| createdAt | datetime | NO | MUL |  |  |
| updatedAt | datetime | NO |  |  |  |
| coupon_code | varchar(100) | YES |  |  | 쿠폰 코드 |
| vip_yn | varchar(10) | YES |  | N | VIP 회원 전용 여부 |
| daily_limit | int | YES |  |  | 데일리 쿠폰 한정수량 |
| daily_yn | varchar(10) | YES |  | N | 데일리 쿠폰 여부 |
| daily_open_time | time | YES |  |  | 데일리 오픈 시간 |

## coupon_pack

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| id | bigint unsigned | NO | PRI |  |  |
| pack_code | varchar(50) | NO | UNI |  | 쿠폰팩 코드 |
| title | varchar(200) | NO |  |  | 쿠폰팩 제목 |
| description | text | YES |  |  | 쿠폰팩 설명 |
| status | enum('ACTIVE','INACTIVE') | NO | MUL | INACTIVE | 쿠폰팩 상태 |
| download_from | datetime | YES |  |  | 쿠폰팩 다운로드 시작일시 |
| download_to | datetime | YES |  |  | 쿠폰팩 다운로드 종료일시 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |

## coupon_pack_coupon

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| id | bigint unsigned | NO | PRI |  |  |
| coupon_pack_id | bigint | NO | MUL |  | 쿠폰팩 ID |
| coupon_list_no | bigint | NO |  |  | 쿠폰 목록 번호 |
| sort_order | int | NO |  | 1 | 정렬순서 |
| quantity | int | NO |  | 1 | 수량 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |

## default_coupon

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | int | NO | PRI |  |  |
| member_no | int | YES |  |  | 회원 번호 |
| coupon_no | int | YES |  |  | 쿠폰 번호 |
| email_yn | varchar(100) | YES |  |  | 이메일 수신 여부 |
| sms_yn | varchar(100) | YES |  |  | SMS 수신 여부 |
| createdAt | datetime | YES |  |  | 쿠폰 발급일 |
| use_date | datetime | YES |  |  | 쿠폰 사용일 |
| close_date | datetime | YES |  |  | 쿠폰 만료일 |
| use_yn | varchar(100) | YES |  |  | 쿠폰 사용 여부 |
| payment_num | varchar(100) | YES |  |  | 결제 번호 |
| payment | int | YES |  |  | 할인 금액 |

## frequency

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(200) | YES |  |  |  |
| description | varchar(500) | YES |  |  |  |
| start_date | datetime | YES |  |  |  |
| end_date | datetime | YES |  |  |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## frequency_reward

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| frequency_no | bigint | NO |  |  | 빈도 고유번호 |
| step_no | bigint | NO |  |  | 단계 번호 |
| coupon_no | bigint | YES |  |  | 쿠폰 고유번호 |
| item_no | bigint | YES |  |  | 아이템 고유번호 |
| point | int | YES |  |  | 포인트 리워드 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## frequency_step

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| frequency_no | bigint | NO |  |  | 빈도 그룹 번호 |
| min_price | int | NO |  | 0 | 최소 가격 기준 |
| icon | varchar(50) | YES |  |  | 단계 아이콘 |
| reward_icon | varchar(50) | YES |  |  | 리워드 아이콘 |
| reward_img | varchar(300) | YES |  |  | 리워드 이미지 |
| reward_success_img | varchar(300) | YES |  |  | 리워드 성공 이미지 |
| title | varchar(200) | YES |  |  | 단계 제목 |
| description | varchar(500) | YES |  |  | 단계 설명 |
| reward_type | varchar(10) | YES |  |  | 리워드 타입 (coupon 등) |
| reward_all | varchar(10) | YES |  | N | 전체 사용자 리워드 여부 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## point

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | YES | MUL |  | 회원 번호 |
| point | bigint | YES |  | 0 | 포인트 금액 |
| status | varchar(10) | YES | MUL |  | 거래 상태 |
| title | varchar(500) | YES |  |  | 포인트 거래 제목 |
| type | varchar(50) | YES |  |  | 거래 유형(review: 리뷰작성) |
| target_no | bigint | YES |  |  | 대상 번호 |
| memo | varchar(200) | YES |  |  | 메모 |
| del_yn | varchar(10) | YES | MUL | N | 삭제 여부 |
| createdAt | datetime | NO | MUL |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

