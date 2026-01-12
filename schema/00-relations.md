# 테이블 관계 사전 (Table Relations)

> 테이블 간 FK 관계 및 JOIN 패턴 정리

---

## 🔗 핵심 테이블 관계도

### 회원(member) 중심

```
member (no)
  │
  ├── pet (member_no) ─────────────────── 회원의 반려동물
  │     ├── pet_allergy (pet_no) ──────── 반려동물 알레르기
  │     ├── pet_disease (pet_no) ──────── 반려동물 질병
  │     └── pet_food (pet_no) ─────────── 반려동물 식품 선호
  │
  ├── order (member_no) ───────────────── 회원의 주문
  │     ├── order_detail (order_no) ───── 주문 상세 (상품별)
  │     ├── order_payment (order_no) ──── 주문 결제 정보
  │     ├── order_delivery (order_no) ─── 주문 배송 정보
  │     ├── order_discount (order_no) ─── 주문 할인 내역
  │     ├── order_history (order_no) ──── 주문 변경 이력
  │     └── order_sms_history (order_no)─ 주문 SMS 발송 이력
  │
  ├── subscribe (member_no) ───────────── 회원의 정기구독
  │     ├── subscribe_item (subscribe_no) 구독 상품
  │     ├── subscribe_card (subscribe_no) 구독 결제 카드
  │     ├── subscribe_fail (subscribe_no) 구독 결제 실패
  │     └── subscribe_pass (subscribe_no) 구독 건너뛰기
  │
  ├── coupon (member_no) ──────────────── 회원 보유 쿠폰
  ├── point (member_no) ───────────────── 회원 포인트 내역
  ├── card (member_no) ────────────────── 회원 등록 카드
  ├── cart (member_no) ────────────────── 회원 장바구니
  ├── review (member_no) ──────────────── 회원 작성 리뷰
  ├── delivery_address (member_no) ────── 회원 배송지
  ├── member_social (member_no) ───────── 소셜 로그인 정보
  ├── member_action_log (member_no) ───── 회원 활동 로그
  ├── member_grade_log (member_no) ────── 회원 등급 변경 이력
  └── member_view_item (member_no) ────── 회원 상품 조회 이력
```

### 상품(items) 중심

```
items (no)
  │
  ├── items_detail (item_no) ──────────── 상품 상세 정보
  ├── items_option (item_no) ──────────── 상품 옵션
  ├── item_badge (item_no) ────────────── 상품 배지 (유기농, 신선 등)
  ├── item_material (item_no) ─────────── 상품 원재료
  ├── item_pet_kind (item_no) ─────────── 상품 대상 반려동물 종류
  ├── item_stock_date (item_no) ───────── 상품 입고 일정
  ├── item_stock_log (item_no) ────────── 상품 재고 변동 로그
  ├── item_qna (item_no) ──────────────── 상품 Q&A
  │     └── item_qna_comment (qna_no) ─── Q&A 댓글
  ├── item_memo (item_no) ─────────────── 상품 관리 메모
  │
  ├── order_detail (item_no) ──────────── 주문된 상품
  ├── cart (item_no) ──────────────────── 장바구니 상품
  ├── review (item_no) ────────────────── 상품 리뷰
  ├── subscribe_item (item_no) ────────── 구독 상품
  └── promotion_items (item_no) ───────── 프로모션 상품
```

### 쿠폰(coupon_list) 중심

```
coupon_list (no)
  │
  ├── coupon (coupon_no) ──────────────── 발급된 쿠폰 (회원별)
  ├── coupon_code_list (coupon_no) ────── 쿠폰 코드 목록
  ├── grade_coupon (coupon_no) ────────── 등급별 쿠폰
  ├── event_coupon (coupon_no) ────────── 이벤트 쿠폰
  └── order_discount (coupon_no) ──────── 주문에 사용된 쿠폰
```

### 반려동물 종류 체계

```
pet_kind (no) ─────────────────────────── 반려동물 종류 (강아지, 고양이)
  │
  └── pet_type (kind_no) ──────────────── 반려동물 품종 (포메라니안, 래브라도 등)

pet (no)
  ├── kind_no → pet_kind.no
  └── type_no → pet_type.no
```

### 질병/알레르기 체계

```
disease_category_list (no) ────────────── 질병 카테고리
  │
  └── disease_list (disease_category_no)─ 질병 목록

allergy_list (no) ─────────────────────── 알레르기 목록

pet_disease (no)
  ├── pet_no → pet.no
  └── disease_no → disease_list.no

pet_allergy (no)
  ├── pet_no → pet.no
  └── allergy_no → allergy_list.no
```

---

## 📌 주요 FK 관계 매핑

### member 관련

| 테이블 | FK 컬럼 | 참조 테이블 | 참조 컬럼 |
|--------|---------|------------|----------|
| pet | member_no | member | no |
| order | member_no | member | no |
| subscribe | member_no | member | no |
| coupon | member_no | member | no |
| point | member_no | member | no |
| card | member_no | member | no |
| cart | member_no | member | no |
| review | member_no | member | no |
| delivery_address | member_no | member | no |
| member_social | member_no | member | no |
| member_action_log | member_no | member | no |
| member_grade_log | member_no | member | no |
| member_view_item | member_no | member | no |
| member_claim | member_no | member | no |
| member_qna | member_no | member | no |
| member_scrap | member_no | member | no |
| item_qna | member_no | member | no |
| gift_history | member_no | member | no |

### order 관련

| 테이블 | FK 컬럼 | 참조 테이블 | 참조 컬럼 |
|--------|---------|------------|----------|
| order_detail | order_no | order | no |
| order_payment | order_no | order | no |
| order_delivery | order_no | order | no |
| order_discount | order_no | order | no |
| order_history | order_no | order | no |
| order_sms_history | order_no | order | no |
| order_out_reason | order_no | order | no |
| review | order_no | review | no |
| gift_history | order_no | order | no |

### items 관련

| 테이블 | FK 컬럼 | 참조 테이블 | 참조 컬럼 |
|--------|---------|------------|----------|
| items_detail | item_no | items | no |
| items_option | item_no | items | no |
| item_badge | item_no | items | no |
| item_material | item_no | items | no |
| item_pet_kind | item_no | items | no |
| item_stock_date | item_no | items | no |
| item_stock_log | item_no | items | no |
| item_qna | item_no | items | no |
| item_memo | item_no | items | no |
| order_detail | item_no | items | no |
| cart | item_no | items | no |
| review | item_no | items | no |
| subscribe_item | item_no | items | no |

### subscribe 관련

| 테이블 | FK 컬럼 | 참조 테이블 | 참조 컬럼 |
|--------|---------|------------|----------|
| subscribe_item | subscribe_no | subscribe | no |
| subscribe_card | subscribe_no | subscribe | no |
| subscribe_fail | subscribe_no | subscribe | no |
| subscribe_pass | subscribe_no | subscribe | no |
| subscribe_item_temp | subscribe_no | subscribe | no |
| order | subscribe_no | subscribe | no |

### pet 관련

| 테이블 | FK 컬럼 | 참조 테이블 | 참조 컬럼 |
|--------|---------|------------|----------|
| pet_allergy | pet_no | pet | no |
| pet_disease | pet_no | pet | no |
| pet_food | pet_no | pet | no |
| pet | kind_no | pet_kind | no |
| pet | type_no | pet_type | no |

### 기타

| 테이블 | FK 컬럼 | 참조 테이블 | 참조 컬럼 |
|--------|---------|------------|----------|
| coupon | coupon_no | coupon_list | no |
| grade_coupon | grade_no | grade | no |
| grade_coupon | coupon_no | coupon_list | no |
| member | grade_no | grade | no |
| disease_list | disease_category_no | disease_category_list | no |
| pet_type | kind_no | pet_kind | no |
| review_option | review_no | review | no |
| item_qna_comment | qna_no | item_qna | no |
| declaration_content | declaration_no | declaration | no |

---

## 🔄 자주 사용하는 JOIN 패턴

### 1. 회원 + 주문 조회

```sql
SELECT m.name, m.phone_number, o.*
FROM member m
JOIN `order` o ON m.no = o.member_no
WHERE m.del_yn = 'N'
```

### 2. 주문 + 주문상세 + 상품

```sql
SELECT o.order_number, od.*, i.item_name, i.price
FROM `order` o
JOIN order_detail od ON o.no = od.order_no
JOIN items i ON od.item_no = i.no
WHERE o.member_no = ?
```

### 3. 회원 + 반려동물 + 품종

```sql
SELECT m.name AS owner_name, p.name AS pet_name, pk.kind_name, pt.type_name
FROM member m
JOIN pet p ON m.no = p.member_no
LEFT JOIN pet_kind pk ON p.kind_no = pk.no
LEFT JOIN pet_type pt ON p.type_no = pt.no
WHERE m.del_yn = 'N' AND p.del_yn = 'N'
```

### 4. 회원 + 구독 + 구독상품

```sql
SELECT m.name, s.*, si.item_no, i.item_name
FROM member m
JOIN subscribe s ON m.no = s.member_no
JOIN subscribe_item si ON s.no = si.subscribe_no
JOIN items i ON si.item_no = i.no
WHERE s.subscribe_yn = 'Y' AND si.end_yn = 'N'
```

### 5. 상품 + 리뷰 + 회원

```sql
SELECT i.item_name, r.score, r.content, m.nickname
FROM items i
JOIN review r ON i.no = r.item_no
LEFT JOIN member m ON r.member_no = m.no
WHERE i.del_yn = 'N' AND r.del_yn = 'N'
```

### 6. 회원 + 쿠폰 + 쿠폰정보

```sql
SELECT m.name, c.coupon_code, cl.title, cl.price, c.use_yn
FROM member m
JOIN coupon c ON m.no = c.member_no
JOIN coupon_list cl ON c.coupon_no = cl.no
WHERE m.del_yn = 'N' AND c.use_yn = 'N'
  AND c.use_end_time >= NOW()
```

### 7. 주문 + 결제 + 배송

```sql
SELECT o.order_number, o.status,
       op.card_name, op.payment_price,
       od.courie_company, od.courier_no
FROM `order` o
LEFT JOIN order_payment op ON o.no = op.order_no
LEFT JOIN order_delivery od ON o.no = od.order_no
WHERE o.member_no = ?
```

### 8. 상품 + 배지 + 원재료

```sql
SELECT i.item_name,
       GROUP_CONCAT(DISTINCT bl.title) AS badges,
       GROUP_CONCAT(DISTINCT ml.title) AS materials
FROM items i
LEFT JOIN item_badge ib ON i.no = ib.item_no AND ib.del_yn = 'N'
LEFT JOIN badge_list bl ON ib.badge_no = bl.no
LEFT JOIN item_material im ON i.no = im.item_no AND im.del_yn = 'N' AND im.main_yn = 'Y'
LEFT JOIN material_list ml ON im.material_no = ml.no
WHERE i.del_yn = 'N'
GROUP BY i.no
```

---

## ⚠️ JOIN 시 주의사항

1. **del_yn 필터**: 대부분의 테이블에서 `del_yn = 'N'` 조건 필요
2. **order 테이블명**: `order`는 예약어이므로 백틱(`) 사용 필수
3. **NULL FK 처리**: `subscribe_no`, `delivery_address_no` 등은 NULL 가능 → LEFT JOIN 사용
4. **N:M 관계**: `pet_allergy`, `pet_disease`, `item_badge` 등은 매핑 테이블

