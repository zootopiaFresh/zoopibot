# 파트너 (Partner)

> 파트너사, 물류, 재고 관련 테이블

---

## 📋 테이블 목록

- [kls_goods_inventory](#kls_goods_inventory) - 컬리 상품 재고 테이블
- [kls_invoices](#kls_invoices) - KLS 송장 정보
- [kls_order_items](#kls_order_items) - KLS 주문 아이템 정보
- [kls_orders](#kls_orders) - KLS 주문 기본 정보
- [kls_requests](#kls_requests) - KLS API 요청 기록 및 로깅
- [partners](#partners)
- [teamfresh_stock_excel](#teamfresh_stock_excel)

---

## kls_goods_inventory
> 컬리 상품 재고 테이블

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | PK |
| cluster_center | varchar(50) | NO |  |  | 클러스터 센터 코드 |
| goods_code | varchar(50) | NO | MUL |  | 상품 코드 |
| goods_name | varchar(255) | NO | UNI |  | 상품명 |
| goods_barcode | varchar(100) | NO | MUL |  | 상품 바코드 |
| manufacture_date | date | YES |  |  | 제조일자 |
| expiration_date | date | YES | MUL |  | 유통기한 |
| normal_quantity | int | NO |  | 0 | 정상 재고 수량 |
| working_quantity | int | NO |  | 0 | 작업 중인 재고 수량 |
| holding_quantity | int | NO |  | 0 | 보류된 재고 수량 |
| createdAt | timestamp | YES |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | timestamp | YES |  | CURRENT_TIMESTAMP | 수정일시 |

## kls_invoices
> KLS 송장 정보

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| id | bigint | NO | PRI |  |  |
| kls_order_item_id | bigint | NO | MUL |  | kls_order_items 테이블 참조 |
| client_order_code | varchar(50) | NO | MUL |  | 주문 고유 코드 (중복 저장) |
| item_id | varchar(50) | NO |  |  | 상품 ID (중복 저장) |
| invoice_number | varchar(100) | NO | MUL |  | 송장 번호 |
| delivery_status | varchar(30) | NO | MUL |  | 배송 상태 (DELIVERY_COMPLETED 등) |
| invoice_tracking_url | text | YES |  |  | 배송 추적 URL |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP | 생성일시 |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP | 수정일시 |

## kls_order_items
> KLS 주문 아이템 정보

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| id | bigint | NO | PRI |  |  |
| kls_order_id | bigint | NO | MUL |  | kls_orders 테이블 참조 |
| client_order_code | varchar(50) | NO | MUL |  | 주문 고유 코드 (중복 저장) |
| item_name | varchar(300) | NO |  |  | 상품명 |
| store_item_id | varchar(50) | NO | MUL |  | 스토어 상품 ID |
| item_id | varchar(50) | NO | MUL |  | 상품 ID |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP | 생성일시 |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP | 수정일시 |

## kls_orders
> KLS 주문 기본 정보

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| id | bigint | NO | PRI |  |  |
| client_order_code | varchar(50) | NO | UNI |  | 주문 고유 코드 |
| order_status | varchar(20) | NO | MUL |  | 주문 상태 (NORMAL, CANCELLED 등) |
| payment_at | datetime | YES |  |  | 결제 완료 시간 |
| order_store_name | varchar(100) | NO |  |  | 주문 스토어명 |
| orderer_id | varchar(20) | NO | MUL |  | 주문자 ID |
| orderer_name | varchar(50) | NO |  |  | 주문자 이름 |
| receiver_name | varchar(50) | NO |  |  | 수령자 이름 |
| receiver_phone_number | varchar(20) | NO |  |  | 수령자 전화번호 |
| receiver_primary_address | text | NO |  |  | 수령자 기본주소 |
| receiver_second_address | varchar(100) | YES |  |  | 수령자 상세주소 |
| outbound_order_code | varchar(50) | NO | MUL |  | 출고 주문 코드 |
| outbound_status | varchar(20) | NO |  |  | 출고 상태 (COMPLETED 등) |
| cluster_center | varchar(20) | NO |  |  | 클러스터 센터 코드 |
| delivery_date | date | NO | MUL |  | 배송 예정일 |
| delivery_operation | varchar(20) | NO |  |  | 배송 운영 타입 (DAWN, REGULAR 등) |
| delivery_courier | varchar(20) | NO |  |  | 택배사 (KURLY 등) |
| created_at | timestamp | YES |  | CURRENT_TIMESTAMP | 생성일시 |
| updated_at | timestamp | YES |  | CURRENT_TIMESTAMP | 수정일시 |

## kls_requests
> KLS API 요청 기록 및 로깅

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| id | bigint | NO | PRI |  | Primary Key |
| client_order_code | varchar(50) | NO | MUL |  | 주문 고유 코드 |
| request_type | varchar(30) | NO | MUL |  | 요청 타입 (ORDER_REGISTER, ORDER_QUERY 등) |
| status | varchar(20) | NO | MUL | PREPARED | 요청 상태 (PREPARED, EXECUTING, SUCCESS, FAILED) |
| original_data | json | NO |  |  | 원본 주문 데이터 (변환 전) |
| transformed_data | json | NO |  |  | KLS API 스펙에 맞춰 변환된 데이터 |
| kls_response | json | YES |  |  | KLS API 응답 데이터 |
| response_code | varchar(10) | YES |  |  | HTTP 응답 코드 |
| error_message | text | YES |  |  | 오류 메시지 |
| executed_at | datetime | YES | MUL |  | 실제 KLS API 호출 시간 |
| retry_count | int | NO |  | 0 | 재시도 횟수 |
| request_source | varchar(50) | YES |  |  | 요청 발생 소스 (API, SCHEDULER, MANUAL 등) |
| user_id | bigint | YES | MUL |  | 요청 사용자 ID (있는 경우) |
| notes | text | YES |  |  | 추가 메모 |
| created_at | datetime | NO | MUL | CURRENT_TIMESTAMP | 생성 시간 |
| updated_at | datetime | NO |  | CURRENT_TIMESTAMP | 수정 시간 |

## partners

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| partner_code | varchar(10) | YES | MUL |  |  |
| partner_name | varchar(100) | YES |  |  |  |
| biz_name | varchar(100) | YES |  |  | 업체명 |
| biz_regno | varchar(100) | YES |  |  |  |
| biz_repsname | varchar(100) | YES |  |  |  |
| zip_code | varchar(100) | YES |  |  |  |
| addr | varchar(500) | YES |  |  |  |
| addr2 | varchar(100) | YES |  |  |  |
| biz_type | varchar(100) | YES |  |  |  |
| biz_items | varchar(100) | YES |  |  |  |
| biz_tel | varchar(100) | YES |  |  |  |
| biz_fax | varchar(100) | YES |  |  |  |
| biz_manager | varchar(100) | YES |  |  |  |
| biz_phone | varchar(100) | YES |  |  |  |
| biz_commission | bigint | YES |  |  |  |
| biz_memo | text | YES |  |  |  |
| biz_number | varchar(100) | YES |  |  |  |
| bank | varchar(100) | YES |  |  |  |
| account | varchar(100) | YES |  |  |  |
| logo_url | varchar(500) | YES |  |  |  |
| landing_img | varchar(500) | YES |  |  |  |
| memo | text | YES |  |  |  |
| coupon_useable | varchar(10) | YES |  | Y |  |
| ordering | int | YES |  |  |  |
| hide_yn | varchar(10) | YES | MUL | N |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |
| limit_date_yn | varchar(10) | YES |  | N |  |

## teamfresh_stock_excel

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| admin_no | bigint | YES |  |  |  |
| teamfresh_code | varchar(100) | YES |  |  |  |
| item_name | varchar(500) | YES |  |  |  |
| barcode | varchar(100) | YES |  |  |  |
| insert_date | varchar(100) | YES |  |  |  |
| limit_date | varchar(100) | YES |  |  |  |
| made_date | varchar(100) | YES |  |  |  |
| count | bigint | YES |  | 0 |  |
| item_stock_log_no | bigint | YES |  |  |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

