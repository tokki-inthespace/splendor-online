import type { Card, Noble } from '../types/game';

// 카드 ID 규약:
//   l{level}-{index}  예: l1-01, l2-15, l3-20
//   - level: 1 | 2 | 3
//   - index: 2자리 제로 패딩 (01~40)
// 일러스트 파일명과 1:1 매칭: /illustrations/cards/{id}.webp
// 배열 순서/개수가 바뀌어도 기존 id는 절대 재사용하지 말 것 (일러스트 매핑 깨짐 방지).

// ─── 레벨 1 카드 (40장) ─────────────────────────────────────
export const LEVEL_1_CARDS: Card[] = [
  { id: 'l1-01', level: 1, color: 'green',  points: 0, cost: { green: 1, white: 0, blue: 1, black: 1, red: 0 } },
  { id: 'l1-02', level: 1, color: 'white',  points: 1, cost: { green: 4, white: 0, blue: 0, black: 0, red: 0 } },
  { id: 'l1-03', level: 1, color: 'red',    points: 0, cost: { green: 0, white: 3, blue: 0, black: 0, red: 0 } },
  { id: 'l1-04', level: 1, color: 'blue',   points: 0, cost: { green: 1, white: 1, blue: 0, black: 1, red: 1 } },
  { id: 'l1-05', level: 1, color: 'blue',   points: 0, cost: { green: 3, white: 0, blue: 1, black: 0, red: 1 } },
  { id: 'l1-06', level: 1, color: 'blue',   points: 0, cost: { green: 0, white: 1, blue: 0, black: 2, red: 0 } },
  { id: 'l1-07', level: 1, color: 'white',  points: 0, cost: { green: 0, white: 0, blue: 3, black: 0, red: 0 } },
  { id: 'l1-08', level: 1, color: 'red',    points: 0, cost: { green: 1, white: 2, blue: 0, black: 2, red: 0 } },
  { id: 'l1-09', level: 1, color: 'red',    points: 0, cost: { green: 0, white: 1, blue: 0, black: 3, red: 1 } },
  { id: 'l1-10', level: 1, color: 'green',  points: 0, cost: { green: 0, white: 0, blue: 1, black: 2, red: 2 } },
  { id: 'l1-11', level: 1, color: 'red',    points: 0, cost: { green: 1, white: 2, blue: 1, black: 1, red: 0 } },
  { id: 'l1-12', level: 1, color: 'green',  points: 0, cost: { green: 0, white: 0, blue: 2, black: 0, red: 2 } },
  { id: 'l1-13', level: 1, color: 'blue',   points: 0, cost: { green: 2, white: 0, blue: 0, black: 2, red: 0 } },
  { id: 'l1-14', level: 1, color: 'blue',   points: 0, cost: { green: 1, white: 1, blue: 0, black: 1, red: 2 } },
  { id: 'l1-15', level: 1, color: 'black',  points: 0, cost: { green: 0, white: 2, blue: 2, black: 0, red: 1 } },
  { id: 'l1-16', level: 1, color: 'green',  points: 1, cost: { green: 0, white: 0, blue: 0, black: 4, red: 0 } },
  { id: 'l1-17', level: 1, color: 'green',  points: 0, cost: { green: 0, white: 1, blue: 1, black: 1, red: 1 } },
  { id: 'l1-18', level: 1, color: 'red',    points: 0, cost: { green: 1, white: 1, blue: 1, black: 1, red: 0 } },
  { id: 'l1-19', level: 1, color: 'red',    points: 1, cost: { green: 0, white: 4, blue: 0, black: 0, red: 0 } },
  { id: 'l1-20', level: 1, color: 'red',    points: 0, cost: { green: 0, white: 2, blue: 0, black: 0, red: 2 } },
  { id: 'l1-21', level: 1, color: 'white',  points: 0, cost: { green: 2, white: 0, blue: 1, black: 1, red: 1 } },
  { id: 'l1-22', level: 1, color: 'white',  points: 0, cost: { green: 0, white: 0, blue: 2, black: 2, red: 0 } },
  { id: 'l1-23', level: 1, color: 'white',  points: 0, cost: { green: 0, white: 3, blue: 1, black: 1, red: 0 } },
  { id: 'l1-24', level: 1, color: 'blue',   points: 0, cost: { green: 2, white: 1, blue: 0, black: 0, red: 2 } },
  { id: 'l1-25', level: 1, color: 'blue',   points: 1, cost: { green: 0, white: 0, blue: 0, black: 0, red: 4 } },
  { id: 'l1-26', level: 1, color: 'black',  points: 0, cost: { green: 1, white: 1, blue: 1, black: 0, red: 1 } },
  { id: 'l1-27', level: 1, color: 'black',  points: 0, cost: { green: 3, white: 0, blue: 0, black: 0, red: 0 } },
  { id: 'l1-28', level: 1, color: 'red',    points: 0, cost: { green: 1, white: 0, blue: 2, black: 0, red: 0 } },
  { id: 'l1-29', level: 1, color: 'white',  points: 0, cost: { green: 0, white: 0, blue: 0, black: 1, red: 2 } },
  { id: 'l1-30', level: 1, color: 'green',  points: 0, cost: { green: 0, white: 2, blue: 1, black: 0, red: 0 } },
  { id: 'l1-31', level: 1, color: 'black',  points: 0, cost: { green: 1, white: 1, blue: 2, black: 0, red: 1 } },
  { id: 'l1-32', level: 1, color: 'green',  points: 0, cost: { green: 1, white: 1, blue: 3, black: 0, red: 0 } },
  { id: 'l1-33', level: 1, color: 'white',  points: 0, cost: { green: 2, white: 0, blue: 2, black: 1, red: 0 } },
  { id: 'l1-34', level: 1, color: 'white',  points: 0, cost: { green: 1, white: 0, blue: 1, black: 1, red: 1 } },
  { id: 'l1-35', level: 1, color: 'black',  points: 1, cost: { green: 0, white: 0, blue: 4, black: 0, red: 0 } },
  { id: 'l1-36', level: 1, color: 'green',  points: 0, cost: { green: 0, white: 0, blue: 0, black: 0, red: 3 } },
  { id: 'l1-37', level: 1, color: 'black',  points: 0, cost: { green: 2, white: 2, blue: 0, black: 0, red: 0 } },
  { id: 'l1-38', level: 1, color: 'black',  points: 0, cost: { green: 2, white: 0, blue: 0, black: 0, red: 1 } },
  { id: 'l1-39', level: 1, color: 'black',  points: 0, cost: { green: 1, white: 0, blue: 0, black: 1, red: 3 } },
  { id: 'l1-40', level: 1, color: 'blue',   points: 0, cost: { green: 0, white: 0, blue: 0, black: 3, red: 0 } },
];

// ─── 레벨 2 카드 (30장) ─────────────────────────────────────
export const LEVEL_2_CARDS: Card[] = [
  { id: 'l2-01', level: 2, color: 'red',    points: 2, cost: { green: 0, white: 0, blue: 0, black: 5, red: 0 } },
  { id: 'l2-02', level: 2, color: 'white',  points: 2, cost: { green: 0, white: 0, blue: 0, black: 3, red: 5 } },
  { id: 'l2-03', level: 2, color: 'black',  points: 3, cost: { green: 0, white: 0, blue: 0, black: 6, red: 0 } },
  { id: 'l2-04', level: 2, color: 'green',  points: 1, cost: { green: 2, white: 3, blue: 0, black: 0, red: 3 } },
  { id: 'l2-05', level: 2, color: 'red',    points: 1, cost: { green: 0, white: 2, blue: 0, black: 3, red: 2 } },
  { id: 'l2-06', level: 2, color: 'green',  points: 2, cost: { green: 0, white: 4, blue: 2, black: 1, red: 0 } },
  { id: 'l2-07', level: 2, color: 'white',  points: 1, cost: { green: 0, white: 2, blue: 3, black: 0, red: 3 } },
  { id: 'l2-08', level: 2, color: 'blue',   points: 1, cost: { green: 2, white: 0, blue: 2, black: 0, red: 3 } },
  { id: 'l2-09', level: 2, color: 'blue',   points: 2, cost: { green: 0, white: 5, blue: 3, black: 0, red: 0 } },
  { id: 'l2-10', level: 2, color: 'black',  points: 1, cost: { green: 2, white: 3, blue: 2, black: 0, red: 0 } },
  { id: 'l2-11', level: 2, color: 'black',  points: 2, cost: { green: 0, white: 5, blue: 0, black: 0, red: 0 } },
  { id: 'l2-12', level: 2, color: 'green',  points: 2, cost: { green: 3, white: 0, blue: 5, black: 0, red: 0 } },
  { id: 'l2-13', level: 2, color: 'white',  points: 1, cost: { green: 3, white: 0, blue: 0, black: 2, red: 2 } },
  { id: 'l2-14', level: 2, color: 'blue',   points: 2, cost: { green: 0, white: 2, blue: 0, black: 4, red: 1 } },
  { id: 'l2-15', level: 2, color: 'red',    points: 2, cost: { green: 2, white: 1, blue: 4, black: 0, red: 0 } },
  { id: 'l2-16', level: 2, color: 'red',    points: 2, cost: { green: 0, white: 3, blue: 0, black: 5, red: 0 } },
  { id: 'l2-17', level: 2, color: 'blue',   points: 1, cost: { green: 3, white: 0, blue: 2, black: 3, red: 0 } },
  { id: 'l2-18', level: 2, color: 'white',  points: 2, cost: { green: 1, white: 0, blue: 0, black: 2, red: 4 } },
  { id: 'l2-19', level: 2, color: 'white',  points: 2, cost: { green: 0, white: 0, blue: 0, black: 0, red: 5 } },
  { id: 'l2-20', level: 2, color: 'red',    points: 1, cost: { green: 0, white: 0, blue: 3, black: 3, red: 2 } },
  { id: 'l2-21', level: 2, color: 'green',  points: 2, cost: { green: 5, white: 0, blue: 0, black: 0, red: 0 } },
  { id: 'l2-22', level: 2, color: 'green',  points: 1, cost: { green: 0, white: 2, blue: 3, black: 2, red: 0 } },
  { id: 'l2-23', level: 2, color: 'green',  points: 3, cost: { green: 6, white: 0, blue: 0, black: 0, red: 0 } },
  { id: 'l2-24', level: 2, color: 'red',    points: 3, cost: { green: 0, white: 0, blue: 0, black: 0, red: 6 } },
  { id: 'l2-25', level: 2, color: 'black',  points: 2, cost: { green: 5, white: 0, blue: 0, black: 0, red: 3 } },
  { id: 'l2-26', level: 2, color: 'blue',   points: 3, cost: { green: 0, white: 0, blue: 6, black: 0, red: 0 } },
  { id: 'l2-27', level: 2, color: 'white',  points: 3, cost: { green: 0, white: 6, blue: 0, black: 0, red: 0 } },
  { id: 'l2-28', level: 2, color: 'blue',   points: 2, cost: { green: 0, white: 0, blue: 5, black: 0, red: 0 } },
  { id: 'l2-29', level: 2, color: 'black',  points: 1, cost: { green: 3, white: 3, blue: 0, black: 2, red: 0 } },
  { id: 'l2-30', level: 2, color: 'black',  points: 2, cost: { green: 4, white: 0, blue: 1, black: 0, red: 2 } },
];

// ─── 레벨 3 카드 (20장) ─────────────────────────────────────
export const LEVEL_3_CARDS: Card[] = [
  { id: 'l3-01', level: 3, color: 'white',  points: 3, cost: { green: 3, white: 0, blue: 3, black: 3, red: 5 } },
  { id: 'l3-02', level: 3, color: 'black',  points: 4, cost: { green: 3, white: 0, blue: 0, black: 3, red: 6 } },
  { id: 'l3-03', level: 3, color: 'blue',   points: 4, cost: { green: 0, white: 7, blue: 0, black: 0, red: 0 } },
  { id: 'l3-04', level: 3, color: 'blue',   points: 4, cost: { green: 0, white: 6, blue: 3, black: 3, red: 0 } },
  { id: 'l3-05', level: 3, color: 'green',  points: 4, cost: { green: 3, white: 3, blue: 6, black: 0, red: 0 } },
  { id: 'l3-06', level: 3, color: 'green',  points: 3, cost: { green: 0, white: 5, blue: 3, black: 3, red: 3 } },
  { id: 'l3-07', level: 3, color: 'blue',   points: 3, cost: { green: 3, white: 3, blue: 0, black: 5, red: 3 } },
  { id: 'l3-08', level: 3, color: 'red',    points: 3, cost: { green: 3, white: 3, blue: 5, black: 3, red: 0 } },
  { id: 'l3-09', level: 3, color: 'blue',   points: 5, cost: { green: 0, white: 7, blue: 3, black: 0, red: 0 } },
  { id: 'l3-10', level: 3, color: 'white',  points: 4, cost: { green: 0, white: 0, blue: 0, black: 7, red: 0 } },
  { id: 'l3-11', level: 3, color: 'red',    points: 4, cost: { green: 6, white: 0, blue: 3, black: 0, red: 3 } },
  { id: 'l3-12', level: 3, color: 'black',  points: 3, cost: { green: 5, white: 3, blue: 3, black: 0, red: 3 } },
  { id: 'l3-13', level: 3, color: 'black',  points: 4, cost: { green: 0, white: 0, blue: 0, black: 0, red: 7 } },
  { id: 'l3-14', level: 3, color: 'white',  points: 5, cost: { green: 0, white: 3, blue: 0, black: 7, red: 0 } },
  { id: 'l3-15', level: 3, color: 'white',  points: 4, cost: { green: 0, white: 3, blue: 0, black: 6, red: 3 } },
  { id: 'l3-16', level: 3, color: 'red',    points: 5, cost: { green: 7, white: 0, blue: 0, black: 0, red: 3 } },
  { id: 'l3-17', level: 3, color: 'red',    points: 4, cost: { green: 7, white: 0, blue: 0, black: 0, red: 0 } },
  { id: 'l3-18', level: 3, color: 'green',  points: 4, cost: { green: 0, white: 0, blue: 7, black: 0, red: 0 } },
  { id: 'l3-19', level: 3, color: 'black',  points: 5, cost: { green: 0, white: 0, blue: 0, black: 3, red: 7 } },
  { id: 'l3-20', level: 3, color: 'green',  points: 5, cost: { green: 3, white: 0, blue: 7, black: 0, red: 0 } },
];

// ─── 귀족 타일 (10장) ───────────────────────────────────────
// ID 규약: n-{index}  예: n-01 ~ n-10
// 일러스트: /illustrations/nobles/{id}.webp
export const ALL_NOBLES: Noble[] = [
  { id: 'n-01', points: 3, requirement: { green: 4, white: 0, blue: 4, black: 0, red: 0 } },
  { id: 'n-02', points: 3, requirement: { green: 0, white: 0, blue: 0, black: 4, red: 4 } },
  { id: 'n-03', points: 3, requirement: { green: 3, white: 3, blue: 3, black: 0, red: 0 } },
  { id: 'n-04', points: 3, requirement: { green: 0, white: 3, blue: 0, black: 3, red: 3 } },
  { id: 'n-05', points: 3, requirement: { green: 0, white: 4, blue: 0, black: 4, red: 0 } },
  { id: 'n-06', points: 3, requirement: { green: 4, white: 0, blue: 0, black: 0, red: 4 } },
  { id: 'n-07', points: 3, requirement: { green: 0, white: 4, blue: 4, black: 0, red: 0 } },
  { id: 'n-08', points: 3, requirement: { green: 3, white: 0, blue: 3, black: 0, red: 3 } },
  { id: 'n-09', points: 3, requirement: { green: 3, white: 0, blue: 0, black: 3, red: 3 } },
  { id: 'n-10', points: 3, requirement: { green: 0, white: 3, blue: 3, black: 3, red: 0 } },
];

// 전체 카드 합쳐진 배열 (기존 API 호환)
export const ALL_CARDS: Card[] = [
  ...LEVEL_1_CARDS,
  ...LEVEL_2_CARDS,
  ...LEVEL_3_CARDS,
];
