# 회원 (Member)

> 회원 정보, 소셜 로그인, 등급, 활동 로그 관련 테이블

---

## 📋 테이블 목록

- [grade](#grade)
- [grade_coupon](#grade_coupon)
- [member](#member)
- [member_20230227](#member_20230227)
- [member_action_log](#member_action_log)
- [member_claim](#member_claim)
- [member_frequency_reward](#member_frequency_reward)
- [member_grade_job](#member_grade_job)
- [member_grade_log](#member_grade_log)
- [member_install_info](#member_install_info)
- [member_out_item](#member_out_item)
- [member_out_reason](#member_out_reason)
- [member_out_request](#member_out_request)
- [member_qna](#member_qna)
- [member_scrap](#member_scrap)
- [member_social](#member_social)
- [member_subscription](#member_subscription)
- [member_view_item](#member_view_item)

---

## grade

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| grade_name | varchar(50) | NO |  |  |  |
| grade_name_en | varchar(50) | YES |  |  |  |
| background_color | varchar(10) | YES |  |  |  |
| point_color | varchar(10) | YES |  |  |  |
| benefit_point | int | NO |  | 0 |  |
| point_percent | float | NO |  | 0 |  |
| img_url | varchar(500) | YES |  |  |  |
| coupon_img_url | varchar(500) | YES |  |  |  |
| min_price | bigint | NO | MUL | 0 |  |
| max_price | bigint | NO |  | 0 |  |
| need_order_cnt | int | YES |  | 0 |  |
| desc | varchar(500) | YES |  |  |  |
| desc2 | varchar(500) | YES |  |  |  |
| plus_benefit | json | YES |  |  |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## grade_coupon

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| grade_no | bigint | NO | MUL |  | 등급 번호 |
| coupon_no | bigint | NO |  |  | 쿠폰 번호 |
| count | int | YES |  | 0 | 쿠폰 수량 |
| limit_month | int | YES |  | 0 | 사용 제한 개월수 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성 일시 |
| updatedAt | datetime | NO |  |  | 수정 일시 |

## member

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 회원 번호 |
| name | varchar(255) | YES |  |  | 회원 이름 |
| nickname | varchar(255) | YES |  |  | 회원 닉네임 |
| birthday_type | varchar(50) | YES |  |  | 생일 유형(양력/음력) |
| birthday | varchar(50) | YES |  |  | 생일(YYYYMMDD) |
| sex | varchar(50) | YES |  |  | 성별(M/F) |
| age | varchar(50) | YES |  |  | 나이 |
| email | varchar(500) | YES |  |  | 이메일 |
| id | varchar(255) | NO |  |  | 회원 고유 ID |
| phone_number | varchar(100) | YES |  |  | 휴대폰 번호 |
| profile_img | varchar(500) | YES |  |  | 프로필 이미지 URL |
| thumb_profile_img | varchar(500) | YES |  |  | 프로필 썸네일 이미지 URL |
| app_token | varchar(500) | YES |  |  | FCM 앱 토큰 |
| app_device | varchar(100) | YES |  |  | 앱 디바이스(ios/android) |
| out_reason | varchar(100) | YES |  |  | 탈퇴 사유 |
| kakao_yn | varchar(10) | YES |  | N | 카카오 연동 여부(Y/N) |
| push_yn | varchar(10) | YES |  | N | 푸시 알림 수신 여부(Y/N) |
| sms_yn | varchar(10) | YES |  | N | SMS 수신 여부(Y/N) |
| email_yn | varchar(10) | YES |  | N | 이메일 수신 여부(Y/N) |
| del_yn | varchar(10) | YES |  | N | 삭제 여부(Y/N) |
| subscription_yn | varchar(10) | YES |  | N | 구독 여부(Y/N) |
| subscription_amount | int | YES |  | 0 | 구독 금액 |
| gift_apply_yn | varchar(10) | YES |  | N | 선물 신청 여부(Y/N) |
| memo | text | YES |  |  | 회원 메모 |
| app_version | varchar(20) | YES |  |  | 앱 버전 |
| coupon_add_disable_date | datetime | YES |  |  | 쿠폰 추가 금지 날짜 |
| last_access_date | datetime | YES |  |  | 최근 접속 날짜 |
| out_date | datetime | YES |  |  | 탈퇴 날짜 |
| grade_no | bigint | YES |  |  | 회원 등급 번호 |
| order_cnt | int | YES |  | 0 | 주문 건수 |
| makeshop_order_price | int | YES |  | 0 | 메이크샵 주문 금액 |
| post_creator | varchar(10) | YES |  |  | 포스트 생성자 여부 |
| createdAt | datetime | NO |  |  | 생성 날짜 |
| updatedAt | datetime | NO |  |  | 수정 날짜 |
| referral_code | varchar(10) | YES |  |  | 추천 코드 |
| recommend_code | varchar(10) | YES |  |  | 추천받은 코드 |
| marketing_yn | varchar(1) | YES |  |  | 마케팅 수신 동의 여부(Y/N) |
| night_agree_yn | varchar(1) | YES |  |  | 야간 알림 동의 여부(Y/N) |
| night_agree_date | datetime | YES |  |  | 야간 알림 동의 날짜 |
| night_alarm_yn | varchar(1) | YES |  |  | 야간 알림 활성화 여부(Y/N) |
| night_alarm_date | datetime | YES |  |  | 야간 알림 설정 날짜 |
| max_discount_yn | varchar(10) | YES |  | N | 최대 할인 적용 여부(Y/N) |
| part_cancel_yn | varchar(1) | YES |  | Y | 부분 취소 가능 여부(Y/N) |

## member_20230227

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | int | YES |  |  |  |
| create_At | varchar(500) | YES |  |  |  |
| user_id | varchar(500) | YES |  |  |  |
| user_name | varchar(500) | YES |  |  |  |
| handphone | varchar(500) | YES |  |  |  |
| handphone1 | varchar(500) | YES |  |  |  |

## member_action_log

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | YES | MUL |  | 회원 번호 |
| type | varchar(100) | YES | MUL |  | 액션 타입 (예: app_open) |
| target_no | bigint | YES |  |  | 대상 번호 |
| count | int | YES |  |  | 액션 횟수 |
| text | varchar(200) | YES |  |  | 액션 관련 텍스트 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## member_claim

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | NO |  |  | 회원 번호 |
| order_no | bigint | YES |  |  | 주문 번호 |
| type | varchar(50) | YES |  | 주문 | 클레임 유형(주문, 배송, 상품 등) |
| content | text | YES |  |  | 클레임 내용 및 상세 설명 |
| important | int | YES |  |  | 중요도(1~5) |
| admin_no | bigint | YES |  |  | 처리 담당 관리자 번호 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부(Y/N) |
| createdAt | datetime | NO |  |  | 클레임 등록 일시 |
| updatedAt | datetime | NO |  |  | 클레임 수정 일시 |

## member_frequency_reward

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| frequency_no | bigint | NO |  |  | 빈도 번호 |
| step_no | bigint | NO |  |  | 단계 번호 |
| member_no | bigint | NO |  |  | 회원 번호 |
| item_no | bigint | YES |  |  | 상품 번호 |
| coupon_no | bigint | YES |  |  | 쿠폰 번호 |
| delivery_address_no | bigint | YES |  |  | 배송 주소 번호 |
| zonecode | varchar(100) | YES |  |  | 우편번호 |
| sender_name | varchar(500) | YES |  |  | 발신자 이름 |
| sender_phone | varchar(500) | YES |  |  | 발신자 전화 |
| sub_phone | varchar(500) | YES |  |  | 보조 전화 |
| road_address | varchar(500) | YES |  |  | 도로명 주소 |
| jibun_address | varchar(500) | YES |  |  | 지번 주소 |
| detail_address | varchar(500) | YES |  |  | 상세 주소 |
| entrance_yn | varchar(1) | YES |  | N | 현관 출입 여부 |
| entrance_memo | varchar(100) | YES |  |  | 현관 출입 메모 |
| memo | varchar(500) | YES |  |  | 비고 - 적립금 5,000원 적립 |
| confirm_yn | varchar(1) | YES |  | N | 확인 여부 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## member_grade_job

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| id | bigint | NO | PRI |  |  |
| member_no | bigint | NO |  |  |  |
| grade_no | int | NO |  |  |  |
| order_price | bigint | NO |  |  |  |
| order_cnt | int | NO |  |  |  |
| start_date | datetime | NO |  |  |  |
| end_date | datetime | NO |  |  |  |
| is_processed_yn | varchar(10) | YES |  | N |  |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP |  |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP |  |

## member_grade_log

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | NO |  |  | 회원 번호 |
| grade_no | bigint | NO |  |  | 등급 번호 |
| type | varchar(100) | NO |  |  | 등급 타입(일반/VIP/VVIP 등) |
| spend_amount | int | YES |  | 0 | 누적 구매 금액 |
| spend_cnt | int | YES |  | 0 | 누적 구매 횟수 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## member_install_info

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | YES |  |  | 회원 번호 |
| af_message | varchar(255) | YES |  |  | AppsFlyer 설치 메시지 |
| af_status | varchar(50) | YES |  |  | AppsFlyer 설치 상태 |
| install_time | datetime | YES |  |  | 앱 설치 시간 |
| is_first_launch | tinyint | YES |  |  | 첫 실행 여부 |
| model | varchar(255) | YES |  |  | 디바이스 모델명 |
| unique_id | varchar(255) | NO | UNI |  | 디바이스 고유 식별자 |
| campaign | varchar(255) | YES |  |  | 캠페인명 |
| media_source | varchar(255) | YES |  |  | 미디어 소스 |
| payload | json | YES |  |  | AppsFlyer 설치 정보 JSON 페이로드 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP |  |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP |  |

## member_out_item

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(500) | YES |  |  | 회원 탈퇴 사유 - 교환/환불/반품이 불편해요 |
| ordering | int | YES |  |  | 정렬 순서 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## member_out_reason

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | YES |  |  | 회원 번호 |
| out_item_no | bigint | YES |  |  | 탈퇴 항목 번호 |
| title | varchar(500) | YES |  |  | 탈퇴 사유 내용 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## member_out_request

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| name | varchar(50) | YES |  |  |  |
| phone_number | varchar(50) | YES |  |  |  |
| reason | varchar(500) | YES |  |  |  |
| confirm_yn | varchar(10) | YES |  | N |  |
| member_no | bigint | YES |  |  |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## member_qna

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | NO |  |  | 회원번호 |
| group_no | bigint | NO |  |  | 그룹번호 |
| title | varchar(1000) | YES |  |  | 문의제목 |
| phone_number | varchar(100) | YES |  |  | 연락처 |
| content | text | YES |  |  | 문의내용 |
| admin_no | bigint | YES |  |  | 담당자번호 |
| answer | text | YES |  |  | 답변내용 |
| answerDt | datetime | YES |  |  | 답변일시 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## member_scrap

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | YES |  |  |  |
| type | varchar(100) | YES |  |  |  |
| target_no | bigint | YES |  |  |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## member_social

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | NO |  |  | 회원번호 |
| sns_type | varchar(50) | YES |  |  | 소셜네트워크 타입(kakao, naver, google 등) |
| sns_id | varchar(200) | YES |  |  | 소셜네트워크 사용자 ID |
| res_json | json | YES |  |  | 소셜네트워크 API 응답 데이터(사용자정보: id, name, email, gender, birthday, nickname, birthyear, phoneNumber 등) |
| del_yn | varchar(10) | YES |  | N | 삭제여부(Y/N) |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## member_subscription

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| user_id | varchar(50) | YES |  |  | 사용자 ID |
| name | varchar(50) | YES |  |  | 가입자명 |
| handphone | varchar(50) | YES |  |  | 연락처 |
| join_handphone | varchar(50) | YES |  |  | 가입 시 연락처(암호화) |
| user_addr | varchar(500) | YES |  |  | 배송주소 |
| use_YN | varchar(50) | YES |  |  | 구독 상태(신청/취소) |
| subscription_amt | int | YES |  |  | 정기배송 구독금액 |
| sign_date | varchar(50) | YES |  |  | 구독 신청일시 |
| cancel_date | varchar(50) | YES |  |  | 구독 취소일시 |
| card_info | varchar(500) | YES |  |  | 카드번호(마스킹) |
| card_kind | varchar(50) | YES |  |  | 카드사 |
| description | varchar(500) | YES |  |  | 결제 실패 사유 및 상품 정보 |

## member_view_item

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | YES |  |  | 회원 번호 |
| device_id | varchar(500) | YES |  |  | 디바이스 ID |
| item_no | bigint | NO | MUL |  | 상품 번호 |
| check_count | bigint | NO |  | 0 | 조회 횟수 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

