# 구독 (Subscribe)

> 정기구독, 구독 상품, 결제 관련 테이블

---

## 📋 테이블 목록

- [subscribe](#subscribe)
- [subscribe_card](#subscribe_card)
- [subscribe_fail](#subscribe_fail)
- [subscribe_fail_item_list](#subscribe_fail_item_list)
- [subscribe_item](#subscribe_item)
- [subscribe_item_temp](#subscribe_item_temp)
- [subscribe_pass](#subscribe_pass)

---

## subscribe

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| subscribe_number | varchar(100) | YES |  |  |  |
| member_no | bigint | NO | MUL |  |  |
| delivery_address_no | bigint | YES | MUL |  |  |
| subscribe_yn | varchar(10) | YES | MUL | Y |  |
| start_date | datetime | YES |  |  |  |
| end_date | datetime | YES |  |  |  |
| auto_coupon_yn | varchar(10) | YES |  | N |  |
| auto_point_yn | varchar(10) | YES |  | N |  |
| end_yn | varchar(10) | YES | MUL | N |  |
| memo | varchar(500) | YES |  |  |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## subscribe_card

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| subscribe_no | bigint | NO |  |  |  |
| card_no | bigint | NO |  |  |  |
| main_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## subscribe_fail

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| subscribe_no | bigint | NO |  |  |  |
| deadline_date | datetime | YES |  |  |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## subscribe_fail_item_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| subscribe_fail_no | bigint | NO |  |  |  |
| item_no | bigint | NO |  | 0 |  |
| count | int | NO |  | 0 |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## subscribe_item

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| subscribe_no | bigint | NO | MUL |  |  |
| item_no | bigint | NO | MUL | 0 |  |
| count | int | NO |  | 0 |  |
| release_cycle | int | NO |  | 0 |  |
| start_date | datetime | NO | MUL |  |  |
| end_date | datetime | YES | MUL |  |  |
| end_yn | varchar(10) | YES | MUL | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## subscribe_item_temp

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| subscribe_no | bigint | NO |  |  |  |
| item_no | bigint | NO |  | 0 |  |
| count | int | NO |  | 0 |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## subscribe_pass

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| subscribe_no | bigint | NO | MUL |  |  |
| pass_date | datetime | YES | MUL |  |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

