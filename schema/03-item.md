# 상품 (Item)

> 상품 정보, 카테고리, 재고, 옵션, 영양소 관련 테이블

---

## 📋 테이블 목록

- [badge_list](#badge_list)
- [cache_view_items](#cache_view_items)
- [category_rankings](#category_rankings)
- [dmb_list](#dmb_list)
- [food_list](#food_list) - 반려동물 식품 목록
- [item_badge](#item_badge)
- [item_category](#item_category)
- [item_dmb_list](#item_dmb_list)
- [item_dmb_title](#item_dmb_title)
- [item_material](#item_material)
- [item_memo](#item_memo) - 상품 메모 테이블
- [item_pet_kind](#item_pet_kind)
- [item_qna](#item_qna)
- [item_qna_comment](#item_qna_comment)
- [item_stock_date](#item_stock_date)
- [item_stock_log](#item_stock_log)
- [item_type](#item_type)
- [items](#items)
- [items___test](#items___test)
- [items_detail](#items_detail)
- [items_option](#items_option)
- [material_list](#material_list)
- [optimize_view_items](#optimize_view_items) - VIEW
- [promotion_items](#promotion_items)
- [spare_items](#spare_items)
- [view_items](#view_items) - VIEW

---

## badge_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 배지 번호 |
| title | varchar(100) | YES |  |  | 배지 제목 |
| title2 | varchar(100) | YES |  |  | 배지 부제목 |
| backgroundColor | varchar(10) | YES |  |  | 배지 배경색 |
| textColor | varchar(10) | YES |  |  | 배지 텍스트색 |
| img_url | varchar(300) | YES |  |  | 배지 이미지 URL |
| main_yn | varchar(10) | YES |  | N | 메인 노출 여부 |
| icon | varchar(10) | YES |  |  | 배지 아이콘 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## cache_view_items

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI | 0 |  |
| detail_item_no | bigint | YES |  |  | 상세 상품 번호 |
| item_partner_no | bigint | YES |  |  | 파트너 번호 |
| type_list | json | YES |  |  | 타입 목록 |
| category_list | json | YES |  |  | 카테고리 목록 |
| item_name | varchar(500) | YES |  |  | 상품명 |
| short_name | varchar(100) | YES |  |  | 단축 상품명 |
| item_img | varchar(500) | YES |  |  | 상품 이미지 URL |
| item_thumbnail_img | varchar(500) | YES |  |  | 상품 썸네일 이미지 URL |
| item_detail | varchar(500) | YES |  |  | 상품 상세 설명 |
| price | bigint | YES |  | 0 | 기본 가격 |
| view_price | bigint | YES |  | 0 | 표시 가격 |
| origin_price | bigint | YES |  | 0 | 원가 |
| subscribe_price | bigint | YES |  | 0 | 구독 가격 |
| input_price | bigint | YES |  | 0 | 입력 가격 |
| promotion_price | bigint | YES |  |  | 프로모션 가격 |
| subscribe_yn | varchar(10) | YES |  | Y | 구독 여부 |
| view_yn | varchar(10) | YES | MUL | N | 노출 여부 |
| release_cycle | varchar(10) | YES |  |  | 출시 주기 |
| first_open_date | datetime | YES |  |  | 최초 오픈 날짜 |
| item_rate | bigint | YES |  | 0 | 상품 등급 |
| dawn_shipping_yn | varchar(10) | YES |  | N | 새벽배송 여부 |
| item_fresh | varchar(10) | YES |  | N | 신선 상품 여부 |
| item_stock_chk | varchar(10) | YES |  | N | 재고 확인 여부 |
| item_order_limit | bigint | YES |  | 0 | 주문 한도 수량 |
| item_stock | bigint | YES |  | 0 | 상품 재고 |
| item_reserves_amt | bigint | YES |  | 0 | 예약 수량 |
| item_memo | varchar(500) | YES |  |  | 상품 메모 |
| stock_memo | varchar(500) | YES |  |  | 재고 메모 |
| favorite_cnt | bigint | YES |  | 0 | 좋아요 수 |
| total_rating | float | YES |  | 0 | 총 평점 |
| barcode | varchar(100) | YES |  |  | 바코드 |
| nosnos_code | varchar(100) | YES |  |  | 노스노스 코드 |
| teamfresh_code | varchar(100) | YES |  |  | 팀프레시 코드(제조업체 코드) |
| sale_limit_yn | varchar(10) | YES |  | N | 판매 제한 여부 |
| sale_limit_days | int | YES |  |  | 판매 제한 기간(일) |
| coupon_useable | varchar(10) | YES |  | Y | 쿠폰 사용 가능 여부 |
| order_sheet_item_list | json | YES |  |  | 주문서 상품 목록 |
| stock_item_list | json | YES |  |  | 재고 상품 목록 |
| del_yn | varchar(10) | YES | MUL | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성 일시 |
| updatedAt | datetime | NO |  |  | 수정 일시 |
| partners | json | YES |  |  | 파트너 정보(판매처) |
| badge | json | YES |  |  | 배지 정보(유기농인증, 동물복지, 주피only, 유기농재료) |
| material | json | YES |  |  | 주요 원재료 정보 |
| all_material | json | YES |  |  | 전체 원재료 정보 |
| stock | bigint | NO |  | 0 | 현재 재고 |
| stock_date | json | YES |  |  | 재고 날짜 정보 |
| avg_score | decimal(2,1) | NO |  | 0.0 | 평균 평점 |
| review_cnt | bigint | NO |  | 0 | 리뷰 수 |
| pet_kind_list | json | YES |  |  | 반려동물 종류 코드 목록(1:강아지, 2:고양이) |
| pet_kind_name_list | json | YES |  |  | 반려동물 종류명 목록 |
| type_name_list | json | YES |  |  | 타입명 목록(간식 등) |
| category_name_list | json | YES |  |  | 카테고리명 목록(유제품, 음수량 등) |

## category_rankings

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | int | NO | PRI |  |  |
| type_no | int | YES |  |  | 타입 번호 |
| category_no | int | YES |  |  | 카테고리 번호 |
| type | varchar(255) | YES |  |  | 타입 (습식/건식) |
| category | varchar(255) | YES |  |  | 카테고리명 |
| item_no | int | YES |  |  | 상품 번호 |
| item_name | varchar(255) | YES |  |  | 상품명 |
| rating | decimal(3,2) | YES |  |  | 상품 평점 |
| review_count | int | YES |  |  | 리뷰 수 |
| like_count | int | YES |  |  | 찜한 수 |
| cart_count | int | YES |  |  | 장바구니 담은 수 |
| order_count | int | YES |  |  | 주문 수 |
| score | decimal(6,2) | YES |  |  | 랭킹 점수 |
| primary_rank | int | YES |  |  | 1차 랭킹 |
| secondary_rank | int | YES |  |  | 2차 랭킹 |
| createdAt | timestamp | YES |  | CURRENT_TIMESTAMP |  |
| updatedAt | timestamp | YES |  | CURRENT_TIMESTAMP |  |
| rank_period | int | NO |  | 40 | 랭킹 기간 (일) |

## dmb_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| item_type_no | bigint | NO |  |  |  |
| title | varchar(100) | YES |  |  |  |
| title_en | varchar(100) | YES |  |  |  |
| dm_code | varchar(100) | YES |  |  |  |
| default_unit | varchar(10) | YES |  |  |  |
| default_yn | varchar(10) | YES |  | N |  |
| ordering | bigint | YES |  | 0 |  |
| require_yn | varchar(10) | YES |  | N |  |
| show_yn | varchar(10) | YES |  | Y |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |
| description | varchar(255) | YES |  |  | 영양소 설명 |

## food_list
> 반려동물 식품 목록

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| name | varchar(100) | NO |  |  | 식품명 |
| is_active | tinyint(1) | YES |  | 1 | 활성화 여부 |
| createdAt | datetime | YES |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | YES |  | CURRENT_TIMESTAMP | 수정일시 |

## item_badge

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| item_no | bigint | YES | MUL |  | 상품 번호 |
| badge_no | bigint | YES | MUL |  | 배지 번호 |
| ordering | bigint | YES |  |  | 정렬 순서 |
| del_yn | varchar(10) | YES | MUL | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## item_category

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| type_no | bigint | YES |  |  | 타입 번호 |
| category | varchar(100) | YES |  |  | 카테고리명 |
| img_url | varchar(500) | YES |  |  | 카테고리 이미지 URL |
| ordering | int | YES |  |  | 카테고리 정렬순서 |
| home_ordering | int | YES |  |  | 홈 화면 정렬순서 |
| top_ordering | int | YES |  |  | 상단 고정 정렬순서 |
| hide_yn | varchar(10) | YES |  | N | 숨김 여부(Y/N) |
| del_yn | varchar(10) | YES |  | N | 삭제 여부(Y/N) |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## item_dmb_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 항목 고유번호 |
| item_no | bigint | YES |  |  | 상품번호 |
| dmb_no | bigint | YES |  |  | DMB번호 |
| content | varchar(30) | YES |  |  | DMB항목명 |
| unit | varchar(10) | YES |  |  | 단위 |
| ordering | bigint | YES |  | 0 | 정렬순서 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## item_dmb_title

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| item_no | bigint | YES |  |  | 아이템 번호 |
| item_type_no | bigint | NO |  |  | 아이템 타입 번호 |
| title | varchar(30) | YES |  |  | 상품명(1kg) |
| content | varchar(500) | YES |  |  | 상품 설명 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## item_material

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| item_no | bigint | YES | MUL |  | 상품번호 |
| material_no | bigint | YES | MUL |  | 원재료번호 |
| domestic_yn | varchar(10) | YES |  | Y | 국내산여부(Y/N) |
| from_country | varchar(50) | YES |  |  | 원산지국가 |
| main_yn | varchar(10) | YES | MUL | N | 주원료여부(Y/N) |
| organic_yn | varchar(10) | YES |  | N | 유기농여부(Y/N) |
| antibiotic_free_yn | varchar(10) | YES |  | N | 항생제무첨가여부(Y/N) |
| natural_yn | varchar(10) | YES |  | N | 자연산여부(Y/N) |
| ordering | bigint | YES |  |  | 정렬순서 |
| content_percent | float | YES |  | 0 | 함유율(백분율) |
| del_yn | varchar(10) | YES | MUL | N | 삭제여부(Y/N) |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## item_memo
> 상품 메모 테이블

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 메모 번호 |
| item_no | bigint | NO |  |  | 상품번호 |
| memo_type | enum('CS_POINT','PRODUCT_LOG','VOC_CAUTION') | NO |  |  | 메모 유형 |
| title | varchar(200) | NO |  |  | 메모 제목 |
| content | text | NO |  |  | 메모 내용 |
| priority | enum('HIGH','MEDIUM','LOW') | NO |  | MEDIUM | 우선순위 |
| is_active | varchar(10) | NO |  | Y | 활성화 여부 |
| start_date | datetime | YES |  |  | 시작날짜 |
| end_date | datetime | YES |  |  | 종료날짜 |
| view_count | int | NO |  | 0 | 조회수 |
| admin_no | bigint | NO |  |  | 작성 관리자번호 |
| last_updated_admin_no | bigint | YES |  |  | 최종 수정 관리자번호 |
| tags | varchar(500) | YES |  |  | 태그 |
| del_yn | varchar(10) | NO |  | N | 삭제여부 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |

## item_pet_kind

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| item_no | bigint | NO | MUL |  | 항목 번호 |
| pet_kind_no | bigint | NO |  |  | 반려동물종류 번호 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## item_qna

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| item_no | bigint | NO | MUL |  | 상품번호 |
| member_no | bigint | NO | MUL |  | 회원번호 |
| title | varchar(1000) | YES |  |  | 질문제목 |
| content | text | YES |  |  | 질문내용 |
| hide_yn | varchar(10) | YES |  | N | 숨김여부 |
| admin_no | bigint | YES |  |  | 답변관리자번호 |
| answer | text | YES |  |  | 답변내용 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |
| answerDt | datetime | YES |  |  | 답변날짜시간 |
| createdAt | datetime | NO |  |  | 생성날짜시간 |
| updatedAt | datetime | NO |  |  | 수정날짜시간 |

## item_qna_comment

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| qna_no | bigint | NO | MUL |  | QNA 번호 |
| admin_no | bigint | NO | MUL |  | 관리자 번호 |
| content | text | YES |  |  | 댓글 내용 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  | CURRENT_TIMESTAMP | 생성일시 |
| updatedAt | datetime | NO |  | CURRENT_TIMESTAMP | 수정일시 |

## item_stock_date

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| item_no | bigint | NO | MUL |  | 상품 번호 |
| stock_date | datetime | NO | MUL |  | 입고 날짜 |
| stock_count | int | NO |  | 0 | 입고 수량 |
| limit_date | datetime | YES |  |  | 유효기한 |
| made_date | datetime | YES |  |  | 제조일 |
| admin_name | varchar(50) | YES |  |  | 관리자명 |
| memo | varchar(500) | YES |  |  | 메모 |
| del_yn | varchar(10) | YES | MUL | N | 삭제여부(Y/N) |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## item_stock_log

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| item_no | bigint | NO | MUL |  | 상품번호 |
| type | varchar(50) | NO |  |  | 로그타입 |
| admin_yn | varchar(10) | YES |  | N | 관리자여부 |
| count | bigint | NO |  | 0 | 수량변동 |
| admin_name | varchar(50) | YES |  |  | 관리자명 |
| memo | varchar(300) | YES |  |  | 메모 |
| order_no | bigint | YES |  |  | 주문번호 |
| insert_date | date | YES |  |  | 입고일자 |
| limit_date | varchar(100) | YES |  |  | 유효기한 |
| made_date | varchar(100) | YES |  |  | 제조일자 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## item_type

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(100) | YES |  |  | 아이템 타입명 (주식) |
| img_url | varchar(500) | YES |  |  | 아이템 타입 이미지 URL |
| ordering | int | YES |  |  | 정렬 순서 |
| hide_yn | varchar(10) | YES |  | N | 숨김 여부 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## items

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| detail_item_no | bigint | YES |  |  | 상세상품번호 |
| item_partner_no | bigint | YES |  |  | 파트너번호 |
| type_list | json | YES |  |  | 상품타입목록 |
| category_list | json | YES |  |  | 카테고리목록 |
| item_name | varchar(500) | YES |  |  | 상품명 |
| short_name | varchar(100) | YES |  |  | 단축상품명 |
| item_img | varchar(500) | YES |  |  | 상품이미지URL |
| item_thumbnail_img | varchar(500) | YES |  |  | 상품썸네일이미지URL |
| item_detail | varchar(500) | YES |  |  | 상품상세설명 |
| price | bigint | YES |  | 0 | 판매가 |
| view_price | bigint | YES |  | 0 | 표시가 |
| origin_price | bigint | YES |  | 0 | 원가 |
| subscribe_price | bigint | YES |  | 0 | 구독가 |
| input_price | bigint | YES |  | 0 | 입고가 |
| promotion_price | bigint | YES |  |  | 프로모션가 |
| subscribe_yn | varchar(10) | YES |  | Y | 구독가능여부 |
| view_yn | varchar(10) | YES |  | N | 노출여부 |
| release_cycle | varchar(10) | YES |  |  | 배송주기 |
| first_open_date | datetime | YES |  |  | 최초공개일시 |
| item_rate | bigint | YES |  | 0 | 상품평점 |
| dawn_shipping_yn | varchar(10) | YES |  | N | 새벽배송여부 |
| item_fresh | varchar(10) | YES |  | N | 신선도표시여부 |
| item_stock_chk | varchar(10) | YES |  | N | 재고확인여부 |
| item_order_limit | bigint | YES |  | 0 | 주문한도 |
| item_stock | bigint | YES |  | 0 | 재고수량 |
| item_reserves_amt | bigint | YES |  | 0 | 예약수량 |
| item_memo | varchar(500) | YES |  |  | 상품메모 |
| stock_memo | varchar(500) | YES |  |  | 재고메모 |
| favorite_cnt | bigint | YES |  | 0 | 찜개수 |
| total_rating | float | YES |  | 0 | 총평점 |
| barcode | varchar(100) | YES |  |  | 바코드 |
| nosnos_code | varchar(100) | YES |  |  | 노스노스코드 |
| teamfresh_code | varchar(100) | YES |  |  | 팀프레시코드 |
| sale_limit_yn | varchar(10) | YES |  | N | 판매제한여부 |
| sale_limit_days | int | YES |  |  | 판매제한일수 |
| coupon_useable | varchar(10) | YES |  | Y | 쿠폰사용가능여부 |
| order_sheet_item_list | json | YES |  |  | 주문서상품목록 |
| stock_item_list | json | YES |  |  | 재고상품목록 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |
| item_total_limit | int | YES |  |  | 총구매한도 |

## items___test

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| detail_item_no | bigint | YES |  |  |  |
| item_partner_no | bigint | YES |  |  |  |
| type_list | json | YES |  |  |  |
| category_list | json | YES |  |  |  |
| item_name | varchar(500) | YES |  |  |  |
| short_name | varchar(100) | YES |  |  |  |
| item_img | varchar(500) | YES |  |  |  |
| item_thumbnail_img | varchar(500) | YES |  |  |  |
| item_detail | varchar(500) | YES |  |  |  |
| price | bigint | YES |  | 0 |  |
| view_price | bigint | YES |  | 0 |  |
| origin_price | bigint | YES |  | 0 |  |
| subscribe_price | bigint | YES |  | 0 |  |
| input_price | bigint | YES |  | 0 |  |
| promotion_price | bigint | YES |  |  |  |
| subscribe_yn | varchar(10) | YES |  | Y |  |
| view_yn | varchar(10) | YES | MUL | N |  |
| release_cycle | varchar(10) | YES |  |  |  |
| first_open_date | datetime | YES |  |  |  |
| item_rate | bigint | YES |  | 0 |  |
| dawn_shipping_yn | varchar(10) | YES |  | N |  |
| item_fresh | varchar(10) | YES |  | N |  |
| item_stock_chk | varchar(10) | YES |  | N |  |
| item_order_limit | bigint | YES |  | 0 |  |
| item_stock | bigint | YES |  | 0 |  |
| item_reserves_amt | bigint | YES |  | 0 |  |
| item_memo | varchar(500) | YES |  |  |  |
| stock_memo | varchar(500) | YES |  |  |  |
| favorite_cnt | bigint | YES |  | 0 |  |
| total_rating | float | YES |  | 0 |  |
| barcode | varchar(100) | YES |  |  |  |
| nosnos_code | varchar(100) | YES |  |  |  |
| teamfresh_code | varchar(100) | YES |  |  |  |
| sale_limit_yn | varchar(10) | YES |  | N |  |
| sale_limit_days | int | YES |  |  |  |
| coupon_useable | varchar(10) | YES |  | Y |  |
| order_sheet_item_list | json | YES |  |  |  |
| stock_item_list | json | YES |  |  |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## items_detail

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| item_no | bigint | NO | MUL |  | 상품 번호 |
| type | varchar(50) | NO |  |  | 콘텐츠 타입(checkpoint 등) |
| data_json | json | YES |  |  | 체크포인트 데이터 JSON - 제목, 내용, 부제목 등 포함 |
| ordering | bigint | YES |  | 0 | 정렬 순서 |
| hide_yn | varchar(10) | YES |  | N | 숨김 여부(Y/N) |
| del_yn | varchar(10) | YES |  | N | 삭제 여부(Y/N) |
| createdAt | datetime | NO |  |  | 생성 일시 |
| updatedAt | datetime | NO |  |  | 수정 일시 |

## items_option

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| item_no | bigint | NO |  |  | 상품 번호 |
| ordering | bigint | YES |  | 0 | 정렬 순서 |
| option_name | varchar(200) | NO |  |  | 옵션명 |
| hide_yn | varchar(10) | YES |  | N | 숨김 여부 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## material_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| out_title | varchar(50) | YES |  |  | 외부 제목 |
| title | varchar(50) | YES |  |  | 자재명 |
| del_yn | varchar(10) | YES | MUL | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## optimize_view_items
> VIEW

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | YES |  | 0 |  |
| detail_item_no | bigint | YES |  |  | 상세상품번호 |
| item_partner_no | bigint | YES |  |  | 파트너번호 |
| type_list | json | YES |  |  | 상품타입목록 |
| category_list | json | YES |  |  | 카테고리목록 |
| item_name | varchar(500) | YES |  |  | 상품명 |
| short_name | varchar(100) | YES |  |  | 단축상품명 |
| item_img | varchar(500) | YES |  |  | 상품이미지URL |
| item_thumbnail_img | varchar(500) | YES |  |  | 상품썸네일이미지URL |
| item_detail | varchar(500) | YES |  |  | 상품상세설명 |
| price | bigint | YES |  | 0 | 판매가 |
| view_price | bigint | YES |  | 0 | 표시가 |
| origin_price | bigint | YES |  | 0 | 원가 |
| subscribe_price | bigint | YES |  | 0 | 구독가 |
| input_price | bigint | YES |  | 0 | 입고가 |
| promotion_price | bigint | YES |  |  | 프로모션가 |
| subscribe_yn | varchar(10) | YES |  | Y | 구독가능여부 |
| view_yn | varchar(10) | YES |  | N | 노출여부 |
| release_cycle | varchar(10) | YES |  |  | 배송주기 |
| first_open_date | datetime | YES |  |  | 최초공개일시 |
| item_rate | bigint | YES |  | 0 | 상품평점 |
| dawn_shipping_yn | varchar(10) | YES |  | N | 새벽배송여부 |
| item_fresh | varchar(10) | YES |  | N | 신선도표시여부 |
| item_stock_chk | varchar(10) | YES |  | N | 재고확인여부 |
| item_order_limit | bigint | YES |  | 0 | 주문한도 |
| item_stock | bigint | YES |  | 0 | 재고수량 |
| item_reserves_amt | bigint | YES |  | 0 | 예약수량 |
| item_memo | varchar(500) | YES |  |  | 상품메모 |
| stock_memo | varchar(500) | YES |  |  | 재고메모 |
| favorite_cnt | bigint | YES |  | 0 | 찜개수 |
| total_rating | float | YES |  | 0 | 총평점 |
| barcode | varchar(100) | YES |  |  | 바코드 |
| nosnos_code | varchar(100) | YES |  |  | 노스노스코드 |
| teamfresh_code | varchar(100) | YES |  |  | 팀프레시코드 |
| sale_limit_yn | varchar(10) | YES |  | N | 판매제한여부 |
| sale_limit_days | int | YES |  |  | 판매제한일수 |
| coupon_useable | varchar(10) | YES |  | Y | 쿠폰사용가능여부 |
| order_sheet_item_list | json | YES |  |  | 주문서상품목록 |
| stock_item_list | json | YES |  |  | 재고상품목록 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |
| createdAt | datetime | YES |  |  | 생성일시 |
| updatedAt | datetime | YES |  |  | 수정일시 |
| partners | json | YES |  |  |  |
| badge | json | YES |  |  |  |
| material | json | YES |  |  |  |
| all_material | json | YES |  |  |  |
| stock | bigint | NO |  | 0 |  |
| stock_date | json | YES |  |  |  |
| avg_score | decimal(2,1) | NO |  | 0.0 |  |
| review_cnt | bigint | NO |  | 0 |  |
| pet_kind_list | json | YES |  |  |  |
| pet_kind_name_list | json | YES |  |  |  |
| type_name_list | json | YES |  |  |  |
| category_name_list | json | YES |  |  |  |

## promotion_items

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| item_no | bigint | NO |  |  |  |
| start_date | datetime | NO |  |  |  |
| end_date | datetime | NO |  |  |  |
| subject | varchar(255) | YES |  | time |  |
| promotion_price | int | NO |  | 0 |  |
| default_price | int | YES |  |  |  |
| limit_count | int | YES |  |  |  |
| default_count | int | YES |  |  |  |
| expired_yn | varchar(10) | NO |  | N |  |
| origin_item_no | bigint | YES |  |  |  |
| promotion_thumbnail_img | varchar(255) | YES |  |  |  |
| item_name | varchar(255) | YES |  |  |  |
| title | varchar(255) | YES |  |  |  |
| is_fixed_event_product_yn | varchar(1) | NO |  | N | 특정 이벤트용 상품 여부 (자동 대체 되지 않음) |
| is_coupon_product_yn | varchar(1) | YES |  | N | 쿠폰이 있는 상품만 진행여부 |
| default_coupon_yn | varchar(1) | YES |  |  | 쿠폰 사용여부 원복 |
| spare_item_no | bigint | YES |  |  |  |
| discount_rate | int | YES |  |  |  |
| keep_on_soldout_yn | varchar(10) | NO |  | N |  |

## spare_items

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  | 인덱스 |
| promotion_no | bigint | YES |  |  | 프로모션 상품 인덱스 |
| item_no | bigint | NO |  |  | 아이템 인덱스 |
| spare_price | int | NO |  | 0 | 대체 가격 |
| spare_limit | int | YES |  |  | 대체 한정수량 |
| start_date | datetime | YES |  |  | 가능 시작일 |
| end_date | datetime | YES |  |  | 가능 종료일 |
| spare_sort_order | int | YES |  | 1 | ordering(현재는 생성 인덱스로 선태중) |
| active_yn | varchar(1) | NO |  | N | 활성화 여부(Y이면 사용된 대체상품) |
| discount_rate | int | YES |  |  | 할인율 |
| is_coupon_product_yn | varchar(1) | NO |  | N | 쿠폰 사용여부 |
| default_coupon_yn | varchar(1) | NO |  | N | 쿠폰 사용여부 원복 |
| title | varchar(255) | YES |  |  | 외부에 노출되는 타이틀 |

## view_items
> VIEW

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO |  | 0 |  |
| detail_item_no | bigint | YES |  |  | 상세상품번호 |
| item_partner_no | bigint | YES |  |  | 파트너번호 |
| type_list | json | YES |  |  | 상품타입목록 |
| category_list | json | YES |  |  | 카테고리목록 |
| item_name | varchar(500) | YES |  |  | 상품명 |
| short_name | varchar(100) | YES |  |  | 단축상품명 |
| item_img | varchar(500) | YES |  |  | 상품이미지URL |
| item_thumbnail_img | varchar(500) | YES |  |  | 상품썸네일이미지URL |
| item_detail | varchar(500) | YES |  |  | 상품상세설명 |
| price | bigint | YES |  | 0 | 판매가 |
| view_price | bigint | YES |  | 0 | 표시가 |
| origin_price | bigint | YES |  | 0 | 원가 |
| subscribe_price | bigint | YES |  | 0 | 구독가 |
| input_price | bigint | YES |  | 0 | 입고가 |
| promotion_price | bigint | YES |  |  | 프로모션가 |
| subscribe_yn | varchar(10) | YES |  | Y | 구독가능여부 |
| view_yn | varchar(10) | YES |  | N | 노출여부 |
| release_cycle | varchar(10) | YES |  |  | 배송주기 |
| first_open_date | datetime | YES |  |  | 최초공개일시 |
| item_rate | bigint | YES |  | 0 | 상품평점 |
| dawn_shipping_yn | varchar(10) | YES |  | N | 새벽배송여부 |
| item_fresh | varchar(10) | YES |  | N | 신선도표시여부 |
| item_stock_chk | varchar(10) | YES |  | N | 재고확인여부 |
| item_order_limit | bigint | YES |  | 0 | 주문한도 |
| item_stock | bigint | YES |  | 0 | 재고수량 |
| item_reserves_amt | bigint | YES |  | 0 | 예약수량 |
| item_memo | varchar(500) | YES |  |  | 상품메모 |
| stock_memo | varchar(500) | YES |  |  | 재고메모 |
| favorite_cnt | bigint | YES |  | 0 | 찜개수 |
| total_rating | float | YES |  | 0 | 총평점 |
| barcode | varchar(100) | YES |  |  | 바코드 |
| nosnos_code | varchar(100) | YES |  |  | 노스노스코드 |
| teamfresh_code | varchar(100) | YES |  |  | 팀프레시코드 |
| sale_limit_yn | varchar(10) | YES |  | N | 판매제한여부 |
| sale_limit_days | int | YES |  |  | 판매제한일수 |
| coupon_useable | varchar(10) | YES |  | Y | 쿠폰사용가능여부 |
| order_sheet_item_list | json | YES |  |  | 주문서상품목록 |
| stock_item_list | json | YES |  |  | 재고상품목록 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |
| partners | json | YES |  |  |  |
| badge | json | YES |  |  |  |
| material | json | YES |  |  |  |
| all_material | json | YES |  |  |  |
| stock | bigint | NO |  | 0 |  |
| stock_date | json | YES |  |  |  |
| avg_score | decimal(2,1) | NO |  | 0.0 |  |
| review_cnt | bigint | NO |  | 0 |  |
| pet_kind_list | json | YES |  |  |  |
| pet_kind_name_list | json | YES |  |  |  |
| type_name_list | json | YES |  |  |  |
| category_name_list | json | YES |  |  |  |

