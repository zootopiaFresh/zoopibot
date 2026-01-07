# VIP/테스트 (VIP & Test)

> VIP 회원, 테스트 테이블

---

## 📋 테이블 목록

- [vvip250102](#vvip250102) - VIEW
- [vvip250701](#vvip250701) - VIEW
- [z_test_member_one](#z_test_member_one)
- [z_test_member_thr](#z_test_member_thr)
- [z_test_member_two](#z_test_member_two)

---

## vvip250102
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

## vvip250701
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

## z_test_member_one

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| signin | varchar(500) | YES |  |  |  |
| id | varchar(500) | YES |  |  |  |
| name | varchar(500) | YES |  |  |  |
| birthday | varchar(500) | YES |  |  |  |
| sex | varchar(500) | YES |  |  |  |
| age | varchar(500) | YES |  |  |  |
| birth | varchar(500) | YES |  |  |  |
| group | varchar(500) | YES |  |  |  |
| mail | varchar(500) | YES |  |  |  |
| main_yn | varchar(500) | YES |  |  |  |
| sms_yn | varchar(500) | YES |  |  |  |
| crm_group | varchar(500) | YES |  |  |  |
| auth | varchar(500) | YES |  |  |  |
| point_one | varchar(500) | YES |  |  |  |
| point_two | varchar(500) | YES |  |  |  |
| point_thr | varchar(500) | YES |  |  |  |
| coupon | varchar(500) | YES |  |  |  |
| payment_cnt | varchar(500) | YES |  |  |  |
| payment_price | varchar(500) | YES |  |  |  |
| payment_day | varchar(500) | YES |  |  |  |
| phone_number | varchar(500) | YES |  |  |  |
| address | varchar(500) | YES |  |  |  |
| sub_address | varchar(500) | YES |  |  |  |
| address_detail | varchar(500) | YES |  |  |  |

## z_test_member_thr

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| id | varchar(500) | YES |  |  |  |
| phone | varchar(500) | YES |  |  |  |
| cnt | varchar(500) | YES |  |  |  |
| phone_number | varchar(500) | YES |  |  |  |
| age | varchar(500) | YES |  |  |  |
| sex | varchar(500) | YES |  |  |  |
| address | varchar(500) | YES |  |  |  |

## z_test_member_two

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| signin | varchar(500) | YES |  |  |  |
| id | varchar(500) | YES |  |  |  |
| name | varchar(500) | YES |  |  |  |
| birthday | varchar(500) | YES |  |  |  |
| sex | varchar(500) | YES |  |  |  |
| age | varchar(500) | YES |  |  |  |
| birth | varchar(500) | YES |  |  |  |
| group | varchar(500) | YES |  |  |  |
| mail | varchar(500) | YES |  |  |  |
| main_yn | varchar(500) | YES |  |  |  |
| sms_yn | varchar(500) | YES |  |  |  |
| crm_group | varchar(500) | YES |  |  |  |
| auth | varchar(500) | YES |  |  |  |
| point_one | varchar(500) | YES |  |  |  |
| point_two | varchar(500) | YES |  |  |  |
| point_thr | varchar(500) | YES |  |  |  |
| coupon | varchar(500) | YES |  |  |  |
| payment_cnt | varchar(500) | YES |  |  |  |
| payment_price | varchar(500) | YES |  |  |  |
| payment_day | varchar(500) | YES |  |  |  |
| phone_number | varchar(500) | YES |  |  |  |
| address | varchar(500) | YES |  |  |  |
| sub_address | varchar(500) | YES |  |  |  |
| address_detail | varchar(500) | YES |  |  |  |

