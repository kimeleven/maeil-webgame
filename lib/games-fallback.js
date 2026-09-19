import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toIsoDate } from "./db.js";

const here = dirname(fileURLToPath(import.meta.url));

const INLINE = {
  version: 1,
  timezone: "Asia/Seoul",
  games: [
    {
      id: "009-ripple-pop",
      title: "리플 팝",
      date: "2026-09-20",
      path: "/games/009-ripple-pop/",
      genre: "실험형",
      description:
        "탭하면 물결이 퍼집니다. 크림 버블은 터뜨리고, 어두운 보이드는 피하세요.",
      duration: "60초",
      controls: "화면 탭",
    },
    {
      id: "008-seq-glow",
      title: "시퀀스 글로우",
      date: "2026-09-19",
      path: "/games/008-seq-glow/",
      genre: "기억/두뇌",
      description:
        "빛나는 패드의 순서를 기억하고 그대로 탭하세요. 라운드가 늘수록 시퀀스가 길어집니다.",
      duration: "클리어형",
      controls: "패드 탭",
    },
    {
      id: "007-lane-rush",
      title: "레인 러시",
      date: "2026-09-18",
      path: "/games/007-lane-rush/",
      genre: "경로/미니 레이싱",
      description:
        "세 갈래 길을 달리며 코인을 모으고 장애물을 피하세요. 좌우 탭으로 레인 이동!",
      duration: "60초",
      controls: "좌우 탭 · ←→ / A D",
    },
    {
      id: "006-flash-tap",
      title: "플래시 탭",
      date: "2026-09-17",
      path: "/games/006-flash-tap/",
      genre: "탭 반응",
      description:
        "화면에 번쩍이는 타깃을 사라지기 전에 탭하세요. 빠른 반응일수록 고득점.",
      duration: "60초",
      controls: "화면 탭",
    },
    {
      id: "005-beat-tap",
      title: "비트 탭",
      date: "2026-09-16",
      path: "/games/005-beat-tap/",
      genre: "타이밍/리듬",
      description:
        "목표 링에 맞춰 탭하세요. 퍼펙트 타이밍으로 콤보를 이어 가세요.",
      duration: "60초",
      controls: "화면 탭 · 스페이스 / Enter",
    },
    {
      id: "004-gem-match",
      title: "젬 매치",
      date: "2026-09-15",
      path: "/games/004-gem-match/",
      genre: "퍼즐/매칭",
      description:
        "이웃 젬을 바꿔 같은 색 세 개 이상을 맞추세요. 가로·세로 매칭과 콤보로 고득점하세요.",
      duration: "60초",
      controls: "탭으로 선택·교환",
    },
    {
      id: "003-star-catch",
      title: "별 캐치",
      date: "2026-09-14",
      path: "/games/003-star-catch/",
      genre: "피하기/캐치",
      description: "좌우 탭으로 바구니를 움직여 별을 받고 운석을 피하세요.",
      duration: "60초",
      controls: "좌우 탭 · ←→ / A D",
    },
    {
      id: "002-pair-flip",
      title: "짝 뒤집기",
      date: "2026-09-13",
      path: "/games/002-pair-flip/",
      genre: "기억/두뇌",
      description: "카드를 뒤집어 같은 그림을 맞추세요. 적을수록 고득점.",
      duration: "90초",
      controls: "탭으로 카드 뒤집기",
    },
    {
      id: "001-tap-dodge",
      title: "탭 닷지",
      date: "2026-09-12",
      path: "/games/001-tap-dodge/",
      genre: "피하기/캐치",
      description:
        "세 줄 위로 떨어지는 빨간 블록을 피하고 노란 별을 받으세요. 화면 왼쪽·오른쪽을 탭하면 줄이 바뀝니다.",
      duration: "60초",
      controls: "좌우 탭 · ←→ / A D",
    },
  ],
};

export function loadFallbackCatalog() {
  const candidates = [
    join(process.cwd(), "public/data/games.json"),
    join(here, "../public/data/games.json"),
  ];
  for (const file of candidates) {
    try {
      const data = JSON.parse(readFileSync(file, "utf8"));
      if (Array.isArray(data.games)) return data;
    } catch {
      // try next path, then inline
    }
  }
  return INLINE;
}

export function extrasById() {
  const map = new Map();
  for (const game of loadFallbackCatalog().games) {
    map.set(game.id, game);
  }
  return map;
}

export function mapGameRow(row, extra = {}) {
  return {
    id: row.id,
    title: row.title,
    genre: row.genre || extra.genre || "",
    date: toIsoDate(row.published_on || row.date),
    path: row.path,
    description: row.description || extra.description || "",
    duration: extra.duration,
    controls: extra.controls,
  };
}
