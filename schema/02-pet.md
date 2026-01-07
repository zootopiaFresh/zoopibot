# 반려동물 (Pet)

> 반려동물 정보, 알레르기, 질병, 식습관 관련 테이블

---

## 📋 테이블 목록

- [allergy_list](#allergy_list)
- [disease_category_list](#disease_category_list)
- [disease_list](#disease_list)
- [eating_habits](#eating_habits)
- [pet](#pet)
- [pet_allergy](#pet_allergy)
- [pet_disease](#pet_disease)
- [pet_food](#pet_food) - 반려동물 식품 매핑
- [pet_kind](#pet_kind)
- [pet_type](#pet_type)

---

## allergy_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(100) | YES |  |  | 알레르기 이름 |
| ordering | bigint | YES |  | 0 | 정렬 순서 |
| show_yn | varchar(10) | YES |  | N | 표시 여부 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## disease_category_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(100) | YES |  |  | 질병 카테고리 제목 |
| ordering | bigint | YES |  | 0 | 정렬 순서 |
| show_yn | varchar(10) | YES |  | N | 표시 여부(Y/N) |
| del_yn | varchar(10) | YES |  | N | 삭제 여부(Y/N) |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## disease_list

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| disease_category_no | bigint | NO | MUL |  | 질병 카테고리 번호 |
| title | varchar(100) | YES |  |  | 질병명 |
| ordering | bigint | YES |  | 0 | 정렬 순서 |
| show_yn | varchar(10) | YES |  | N | 표시 여부 |
| del_yn | varchar(10) | YES |  | N | 삭제 여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## eating_habits

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| title | varchar(100) | YES |  |  | 식습관 제목 |
| ordering | bigint | YES |  | 0 | 정렬순서 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |
| createdAt | datetime | NO |  |  | 생성일시 |
| updatedAt | datetime | NO |  |  | 수정일시 |

## pet

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| member_no | bigint | NO | MUL |  | 회원 고유 번호 |
| name | varchar(100) | YES |  |  | 반려동물 이름 |
| kind_no | bigint | YES |  |  | 반려동물 종류 번호 |
| type_no | bigint | YES |  |  | 반려동물 타입 번호 |
| birthday | varchar(50) | YES |  |  | 생년월일 |
| weight | float | YES |  |  | 몸무게(kg) |
| sex | varchar(50) | YES |  |  | 성별(남/암) |
| neutered_yn | varchar(10) | YES |  | N | 중성화 여부(Y/N) |
| disease_yn | varchar(10) | YES |  | N | 질병 보유 여부(Y/N) |
| allergy_yn | varchar(10) | YES |  | N | 알레르기 보유 여부(Y/N) |
| eating_habits_no | bigint | YES |  |  | 먹이 습관 번호 |
| activity_hour | float | YES |  |  | 활동 시간(시간) |
| meal_for_day | float | YES |  |  | 하루 식사 횟수 |
| del_yn | varchar(10) | YES | MUL | N | 삭제 여부(Y/N) |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## pet_allergy

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| pet_no | bigint | NO | MUL |  | 펫 번호 |
| allergy_no | bigint | NO | MUL |  | 알레르기 번호 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## pet_disease

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| pet_no | bigint | NO | MUL |  | 펫 번호 |
| disease_no | bigint | NO | MUL |  | 질병 번호 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## pet_food
> 반려동물 식품 매핑

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| pet_no | bigint | NO | MUL |  | 반려동물 번호 |
| food_no | bigint | NO | MUL |  | 식품 번호 |
| createdAt | datetime | YES |  | CURRENT_TIMESTAMP |  |
| updatedAt | datetime | YES |  | CURRENT_TIMESTAMP |  |

## pet_kind

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| kind_name | varchar(100) | YES |  |  | 펫 종류명 |
| ordering | bigint | YES |  | 0 | 정렬순서 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

## pet_type

| 컬럼명 | 타입 | NULL | 키 | 기본값 | 설명 |
|--------|------|------|-----|--------|------|
| no | bigint | NO | PRI |  |  |
| kind_no | bigint | NO |  |  | 펫종류번호 |
| type_name | varchar(100) | YES |  |  | 펫타입명(예:포메라니안) |
| ordering | bigint | YES |  | 0 | 정렬순서 |
| pet_type | int | YES |  |  | 펫타입구분(1:소형견) |
| show_yn | varchar(10) | YES |  | N | 노출여부 |
| del_yn | varchar(10) | YES |  | N | 삭제여부 |
| createdAt | datetime | NO |  |  |  |
| updatedAt | datetime | NO |  |  |  |

