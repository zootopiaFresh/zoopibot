# 주문 (Order)

> 주문, 결제, 배송, 정산 관련 테이블

---

## 📋 테이블 목록

- [card](#card)
- [cart](#cart)
- [gift_history](#gift_history) - 사은품 지급 히스토리
- [order](#order)
- [order241010](#order241010) - VIEW
- [order_delivery](#order_delivery)
- [order_detail](#order_detail)
- [order_discount](#order_discount)
- [order_history](#order_history)
- [order_out_item](#order_out_item)
- [order_out_reason](#order_out_reason)
- [order_payment](#order_payment)
- [order_settlement](#order_settlement)
- [order_sms_history](#order_sms_history)
- [ordered](#ordered)
- [payment_error_log](#payment_error_log)

---

## card

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | YES |  |  | 회원번호 |
| customer_uid | varchar(500) | YES |  |  | 포트원 고객UID |
| builling_bid | varchar(500) | YES |  |  | 포트원 빌링키 |
| card_name | varchar(50) | YES |  |  | 카드사명 |
| card_no | varchar(50) | YES |  |  | 카드번호 |
| card_code | varchar(50) | YES |  |  | 카드코드 |
| card_cl | varchar(10) | YES |  |  | 카드구분코드 |
| create_date | datetime | YES |  |  | 카드등록일시 |
| main_card_yn | varchar(10) | YES |  | N | 주카드여부 |
| use_yn | varchar(10) | YES |  | N | 사용여부 |
| payment_yn | varchar(10) | YES |  | N | 결제가능여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## cart

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | YES | MUL |  | 회원 번호 |
| device_id | varchar(500) | YES |  |  | 기기 ID |
| item_no | bigint | NO |  |  | 상품 번호 |
| count | bigint | NO |  | 0 | 상품 수량 |
| subscribe_yn | varchar(10) | YES |  | N | 정기구독 여부(Y/N) |
| release_cycle | int | NO |  | 0 | 배송 주기(일수) |
| del_yn | varchar(10) | YES |  | N | 삭제 여부(Y/N) |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## gift_history
> 사은품 지급 히스토리

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | NO | MUL |  | 회원 번호 |
| order_no | bigint | YES | MUL |  | 주문 번호 |
| gift_item_no | bigint | NO | MUL |  | 사은품 상품 번호 |
| gift_count | int | NO |  | 1 | 사은품 수량 |
| gift_type | varchar(50) | NO |  |  | 사은품 지급 유형(manual: 수동, auto: 자동) |
| gift_reason | text | YES |  |  | 사은품 지급 사유 |
| status | varchar(20) | NO | MUL | given | 상태(given: 지급됨, cancelled: 취소됨) |
| given_date | datetime | NO | MUL | CURRENT_TIMESTAMP | 사은품 지급일시 |
| admin_no | bigint | YES |  |  | 관리자 번호 |
| cancelled_date | datetime | YES |  |  | 사은품 취소일시 |
| cancel_reason | text | YES |  |  | 취소 사유 |
| memo | text | YES |  |  | 메모(상품명, 수량, 재고차감 여부 등) |
| del_yn | char(1) | NO |  | N | 삭제 여부(Y: 삭제, N: 미삭제) |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP |  |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP |  |
| order_detail_no | bigint | YES |  |  | 주문 상세 번호 |

## order

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| order_number | varchar(100) | NO | MUL |  | 주문번호 |
| member_no | bigint | NO | MUL |  | 회원번호 |
| delivery_date_no | bigint | YES |  |  | 배송일정번호 |
| subscribe_no | bigint | YES |  |  | 구독번호 |
| stock_date_no | bigint | YES |  |  | 재고기준일번호 |
| estimate_output_date | datetime | YES |  |  | 예상출고일시 |
| estimate_delivery_date | datetime | YES |  |  | 예상배송일시 |
| status | varchar(10) | YES |  | 1 | 주문상태(0:출고보류,1:주문완료,2:결제취소,3:발송준비,4:배송시작,5:배송중,6:배송완료,7:환불) |
| delivery_type | varchar(10) | YES |  |  | 배송유형(새벽,당일,일반) |
| total_price | bigint | YES |  | 0 | 총상품금액 |
| delivery_price | bigint | YES |  | 0 | 배송료 |
| discount_price | bigint | YES |  | 0 | 할인금액 |
| order_price | bigint | YES |  | 0 | 주문금액 |
| payment_price | bigint | YES |  | 0 | 결제금액 |
| final_price | bigint | YES |  | 0 | 최종결제금액 |
| dawn_shipping_area_yn | varchar(10) | YES |  | N | 새벽배송가능지역여부(Y/N) |
| delivery_address_no | bigint | YES |  |  | 배송주소번호 |
| zonecode | varchar(100) | YES |  |  | 우편번호 |
| sender_name | varchar(500) | YES |  |  | 수취인명 |
| sender_phone | varchar(500) | YES |  |  | 수취인전화 |
| sub_phone | varchar(500) | YES |  |  | 수취인부전화 |
| road_address | varchar(500) | YES |  |  | 도로명주소 |
| jibun_address | varchar(500) | YES |  |  | 지번주소 |
| detail_address | varchar(500) | YES |  |  | 상세주소 |
| entrance_yn | varchar(1) | YES |  | N | 현관출입여부(Y/N) |
| entrance_type | varchar(50) | YES |  | password | 현관타입(password/card/phone) |
| entrance_memo | varchar(100) | YES |  |  | 현관출입메모 |
| memo | varchar(500) | YES |  |  | 배송메모 |
| part_cancel_yn | varchar(10) | YES |  | Y | 부분취소가능여부(Y/N) |
| point_percent | float | YES |  | 1 | 포인트적립률 |
| excel_memo | varchar(100) | YES |  |  | 엑셀메모 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## order241010
> VIEW

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO |  | 0 |  |
| order_number | varchar(100) | NO |  |  | 주문번호 |
| member_no | bigint | NO |  |  | 회원번호 |
| delivery_date_no | bigint | YES |  |  | 배송일정번호 |
| subscribe_no | bigint | YES |  |  | 구독번호 |
| stock_date_no | bigint | YES |  |  | 재고기준일번호 |
| estimate_output_date | datetime | YES |  |  | 예상출고일시 |
| estimate_delivery_date | datetime | YES |  |  | 예상배송일시 |
| status | varchar(10) | YES |  | 1 | 주문상태(0:출고보류,1:주문완료,2:결제취소,3:발송준비,4:배송시작,5:배송중,6:배송완료,7:환불) |
| delivery_type | varchar(10) | YES |  |  | 배송유형(새벽,당일,일반) |
| total_price | bigint | YES |  | 0 | 총상품금액 |
| delivery_price | bigint | YES |  | 0 | 배송료 |
| discount_price | bigint | YES |  | 0 | 할인금액 |
| order_price | bigint | YES |  | 0 | 주문금액 |
| payment_price | bigint | YES |  | 0 | 결제금액 |
| final_price | bigint | YES |  | 0 | 최종결제금액 |
| dawn_shipping_area_yn | varchar(10) | YES |  | N | 새벽배송가능지역여부(Y/N) |
| delivery_address_no | bigint | YES |  |  | 배송주소번호 |
| zonecode | varchar(100) | YES |  |  | 우편번호 |
| sender_name | varchar(500) | YES |  |  | 수취인명 |
| sender_phone | varchar(500) | YES |  |  | 수취인전화 |
| sub_phone | varchar(500) | YES |  |  | 수취인부전화 |
| road_address | varchar(500) | YES |  |  | 도로명주소 |
| jibun_address | varchar(500) | YES |  |  | 지번주소 |
| detail_address | varchar(500) | YES |  |  | 상세주소 |
| entrance_yn | varchar(1) | YES |  | N | 현관출입여부(Y/N) |
| entrance_type | varchar(50) | YES |  | password | 현관타입(password/card/phone) |
| entrance_memo | varchar(100) | YES |  |  | 현관출입메모 |
| memo | varchar(500) | YES |  |  | 배송메모 |
| part_cancel_yn | varchar(10) | YES |  | Y | 부분취소가능여부(Y/N) |
| point_percent | float | YES |  | 1 | 포인트적립률 |
| excel_memo | varchar(100) | YES |  |  | 엑셀메모 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## order_delivery

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| order_no | bigint | NO | MUL |  | 주문번호 |
| courie_company | varchar(100) | YES |  |  | 배송사명 |
| courier_no | varchar(100) | YES |  |  | 송장번호 |
| status | varchar(10) | YES |  | 1 | 배송상태 |
| delivery_fee | int | YES |  | 0 | 기본배송료 |
| delivery_fee_1 | int | YES |  | 0 | 배송료1 |
| delivery_fee_2 | int | YES |  | 0 | 배송료2 |
| delivery_fee_3 | int | YES |  | 0 | 배송료3 |
| delivery_fee_4 | int | YES |  | 0 | 배송료4 |
| delivery_fee_5 | int | YES |  | 0 | 배송료5 |
| delivery_fee_6 | int | YES |  | 0 | 배송료6 |
| delivery_fee_7 | int | YES |  | 0 | 배송료7 |
| delivery_fee_8 | int | YES |  | 0 | 배송료8 |
| delivery_update_date | datetime | YES |  |  | 배송상태업데이트날짜 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## order_detail

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| order_no | bigint | NO | MUL |  | 주문번호 |
| item_no | bigint | NO | MUL |  | 상품번호 |
| item_name | varchar(500) | YES |  |  | 상품명 |
| option_no | bigint | YES |  |  | 옵션번호 |
| option_name | varchar(500) | YES |  |  | 옵션명 |
| count | bigint | YES | MUL | 0 | 수량 |
| origin_price | bigint | YES |  | 0 | 원가 |
| unit_price | bigint | YES |  | 0 | 단가 |
| total_price | bigint | YES | MUL | 0 | 합계금액 |
| subscribe_yn | varchar(10) | YES |  | N | 구독여부 |
| release_cycle | int | YES |  |  | 배송주기(일) |
| subscribe_no | bigint | YES |  |  | 구독번호 |
| cancel_yn | varchar(10) | YES |  | N | 취소여부 |
| refund_yn | varchar(10) | YES |  | N | 환불여부 |
| stock_yn | varchar(10) | YES |  | Y | 재고여부 |
| createdAt | datetime | NO | MUL |  |  |
| updatedAt | datetime | NO |  |  |  |
| stock_at_order | bigint | YES |  |  | 주문시점재고 |

## order_discount

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| order_no | bigint | NO | MUL |  |  |
| type | varchar(100) | YES |  |  |  |
| coupon_no | bigint | YES |  |  |  |
| coupon_num | varchar(500) | YES |  |  |  |
| price | bigint | YES |  | 0 |  |
| cancel_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## order_history

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| order_no | bigint | NO | MUL |  | 주문 번호 |
| admin_no | bigint | YES | MUL |  | 관리자 번호 |
| change_type | varchar(20) | NO |  |  | 변경 유형 |
| before_value | text | YES |  |  | 변경 전 값 |
| after_value | text | YES |  |  | 변경 후 값 |
| reason | varchar(500) | YES |  |  | 변경 사유 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## order_out_item

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(500) | YES |  |  | 상품명 또는 옵션 정보 |
| ordering | int | YES |  |  | 정렬 순서 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부(Y/N) |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## order_out_reason

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| order_no | bigint | YES |  |  | 주문 번호 |
| out_item_no | bigint | YES |  |  | 출고 항목 번호 |
| title | varchar(500) | YES |  |  | 출고 사유 제목 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## order_payment

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| order_no | bigint | NO | MUL |  | 주문 번호 |
| type | varchar(100) | YES |  |  | 결제 타입 |
| easypay_type | varchar(100) | YES |  |  | 간편결제 타입 |
| customer_uid | varchar(100) | YES |  |  | 고객 고유 ID |
| card_name | varchar(100) | YES |  |  | 카드사명 |
| card_no | varchar(100) | YES |  |  | 카드번호 |
| card_code | varchar(100) | YES |  |  | 카드코드 |
| payment_price | bigint | YES |  | 0 | 결제 금액 |
| imp_uid | varchar(100) | YES |  |  | 아임포트 고유 ID |
| pay_id | varchar(100) | YES |  |  | 결제 ID |
| moid | varchar(100) | YES |  |  | 상품 ID |
| edi_date | varchar(100) | YES |  |  | EDI 날짜 |
| createdAt | datetime | NO |  |  | 생성 일시 |
| updatedAt | datetime | NO |  |  | 수정 일시 |

## order_settlement

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| month | datetime | YES |  |  | 정산 월 |
| storage_fee | int | YES |  | 0 | 보관료 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## order_sms_history

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| order_no | bigint | NO |  |  | 주문 번호 |
| phoneNumber | varchar(100) | YES |  |  | 수신자 전화번호 |
| content | text | YES |  |  | 문자 발송 내용 |
| result | varchar(100) | YES |  |  | 발송 결과(success/fail) |
| message | varchar(200) | YES |  |  | 발송 결과 메시지 |
| sms_type | varchar(50) | YES |  |  | SMS 유형(예: notification, alert) |
| type | varchar(50) | YES |  |  | 발송 타입(예: admin, system, user) |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP |  |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP |  |
| sms_send_log_id | bigint | YES |  |  | SMS 발송 로그 ID |

## ordered

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |
| member_no | bigint | NO | PRI |  |  |
| OrderNo | bigint | NO | PRI |  |  |

## payment_error_log

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| request | json | YES |  |  | NicePay 빌링 승인 요청 - URI, 폼 데이터(금액, BID, MID, TID, Moid, EdiDate, SignData, 카드할부, 상품명, 카드이자율), 메서드, 헤더 정보 포함 |
| response | json | YES |  |  | NicePay 빌링 승인 응답 - 결과코드(9999: 빌키 불일치), 결과메시지, 승인코드, 거래일시, 카드정보, 상품명 등 포함 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

