# 배송 (Delivery)

> 배송지, 배송일, 배송 권역 관련 테이블

---

## 📋 테이블 목록

- [block_delivery_date](#block_delivery_date)
- [dawn_shipping_area](#dawn_shipping_area)
- [delivery_address](#delivery_address)
- [delivery_date](#delivery_date)
- [delivery_date_recommand_item](#delivery_date_recommand_item)
- [plus_shipping_area](#plus_shipping_area)

---

## block_delivery_date

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| id | bigint | NO | PRI |  |  |
| delivery_type | varchar(50) | NO |  |  | 차단 배송 유형 (dawn: 새벽배송) |
| block_date | date | NO |  |  | 배송 차단 날짜 |
| createdAt | datetime | NO |  |  | 생성 일시 |
| updatedAt | datetime | NO |  |  | 수정 일시 |

## dawn_shipping_area

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | int | NO | PRI |  |  |
| sido | varchar(100) | YES |  |  | 시도 |
| sgg | varchar(100) | YES |  |  | 시군구 |
| dong | varchar(100) | YES |  |  | 동 |
| except_spot | varchar(100) | YES |  |  | 제외지역 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |

## delivery_address

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | int | NO | PRI |  |  |
| member_no | bigint | YES | MUL |  | 회원 번호 |
| device_id | varchar(500) | YES |  |  | 기기 ID |
| zonecode | varchar(100) | YES |  |  | 우편번호 |
| sender_name | varchar(500) | YES |  |  | 수령자명 |
| sender_phone | varchar(500) | YES |  |  | 수령자 전화번호 |
| sub_phone | varchar(500) | YES |  |  | 수령자 보조 전화번호 |
| road_address | varchar(500) | YES |  |  | 도로명 주소 |
| jibun_address | varchar(500) | YES |  |  | 지번 주소 |
| sido | varchar(500) | YES |  |  | 시도 |
| sigungu | varchar(500) | YES |  |  | 시군구 |
| roadname | varchar(500) | YES |  |  | 도로명 |
| bname | varchar(500) | YES |  |  | 법정동명 |
| bname1 | varchar(500) | YES |  |  | 법정동명1 |
| bname2 | varchar(500) | YES |  |  | 법정동명2 |
| detail_address | varchar(500) | YES |  |  | 상세 주소 |
| main_address_yn | varchar(10) | YES |  | N | 기본 배송지 여부 |
| query | varchar(500) | YES |  |  | 검색어 |
| dawn_delivery_yn | varchar(10) | YES |  | N | 새벽배송 가능 여부 |
| dawn_delivery_yn_temp | varchar(10) | YES |  | N | 새벽배송 임시 설정 |
| day_delivery_yn | varchar(10) | YES |  | N | 당일배송 가능 여부 |
| plus_delivery_yn | varchar(10) | YES |  | N | 플러스배송 가능 여부 |
| entrance_yn | varchar(10) | YES |  | N | 출입문 보안 여부 |
| entrance_type | varchar(50) | YES |  | password | 출입문 보안 타입 |
| entrance_memo | varchar(100) | YES |  |  | 출입문 보안 메모 |
| delete_yn | varchar(10) | YES |  | N | 삭제 여부 |
| vip_yn | varchar(10) | YES |  | N | VIP 여부 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |
| is_delivery_yn | varchar(10) | YES |  | Y | 배송 가능 여부 |

## delivery_date

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| delivery_datetime | datetime | NO | MUL |  | 배송 일시 |
| milk_yn | varchar(10) | YES |  | N | 우유 여부 |
| del_yn | varchar(10) | YES | MUL | N | 삭제 여부 |
| deadline_datetime | datetime | YES |  |  | 마감 일시 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## delivery_date_recommand_item

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| delivery_date_no | bigint | NO |  |  |  |
| item_no | bigint | NO |  |  |  |
| title | varchar(200) | YES |  | N | 배송 추천 상품 제목 |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## plus_shipping_area

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| sido | varchar(100) | YES |  |  |  |
| sgg | varchar(100) | YES |  |  |  |
| dong | varchar(100) | YES |  |  |  |
| bname2 | varchar(100) | YES |  |  |  |
| plus_price | int | YES |  | 0 |  |
| del_yn | varchar(10) | YES |  | N |  |

