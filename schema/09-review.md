# 리뷰 (Review)

> 리뷰, 리뷰 옵션, 신고 관련 테이블

---

## 📋 테이블 목록

- [declaration](#declaration)
- [declaration_content](#declaration_content)
- [photos](#photos)
- [reply](#reply)
- [review](#review)
- [review_230302](#review_230302)
- [review_option](#review_option)
- [review_option_category_list](#review_option_category_list)
- [review_option_list](#review_option_list)

---

## declaration

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| type | varchar(100) | NO |  |  | 신고 유형 (review: 리뷰 신고) |
| target_no | bigint | NO |  |  | 신고 대상 번호 |
| member_no | bigint | NO |  |  | 신고자 회원 번호 |
| complete_yn | varchar(10) | YES |  | N | 처리 완료 여부 (Y/N) |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 (Y/N) |
| createdAt | datetime | NO |  |  | 신고 등록 일시 |
| updatedAt | datetime | NO |  |  | 신고 수정 일시 |

## declaration_content

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| declaration_no | bigint | YES |  |  | 선언 번호 |
| content | varchar(500) | NO |  |  | 주문과 관련없는 내용 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## photos

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| type | varchar(100) | NO | MUL |  | 사진 타입(item_qna 등) |
| target_no | bigint | NO | MUL |  | 대상 번호 |
| img_url | varchar(500) | YES |  |  | 원본 이미지 URL |
| thumbnail_img_url | varchar(500) | YES |  |  | 썸네일 이미지 URL |
| width | int | YES |  | 0 | 이미지 가로 크기 |
| height | int | YES |  | 0 | 이미지 세로 크기 |
| del_yn | varchar(10) | YES | MUL | N | 삭제 여부(Y/N) |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## reply

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | NO |  |  |  |
| type | varchar(100) | NO |  |  |  |
| target_no | bigint | NO | MUL | 0 |  |
| reply_content | varchar(500) | YES |  |  |  |
| like_cnt | bigint | YES |  | 0 |  |
| class | bigint | NO |  | 0 |  |
| group_no | bigint | YES |  |  |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## review

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| order_no | bigint | YES | MUL |  |  |
| item_no | bigint | NO | MUL |  |  |
| member_no | bigint | YES |  |  |  |
| score | bigint | YES |  |  |  |
| content | text | YES |  |  |  |
| admin_no | bigint | YES |  |  |  |
| answer | text | YES |  |  |  |
| reply_cnt | bigint | YES |  | 0 |  |
| like_cnt | bigint | YES |  | 0 |  |
| best_yn | varchar(10) | YES |  | N |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## review_230302

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | int | YES |  |  |  |
| user_no | int | YES |  |  |  |
| user_id | varchar(500) | YES |  |  |  |
| user_name | varchar(500) | YES |  |  |  |
| score | varchar(500) | YES |  |  |  |
| attachfile | varchar(500) | YES |  |  |  |
| contents | text | YES |  |  |  |
| option1 | int | YES |  |  |  |
| option2 | int | YES |  |  |  |
| option3 | int | YES |  |  |  |
| createAT | varchar(200) | YES |  |  |  |

## review_option

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| review_no | bigint | NO | MUL |  |  |
| category_no | bigint | NO |  |  |  |
| option_no | bigint | NO |  |  |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## review_option_category_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(100) | YES |  |  |  |
| long_title | varchar(100) | YES |  |  |  |
| ordering | bigint | YES |  | 0 |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## review_option_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| category_no | bigint | NO |  |  |  |
| title | varchar(100) | YES |  |  |  |
| ordering | bigint | YES |  | 0 |  |
| del_yn | varchar(10) | YES |  | N |  |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

