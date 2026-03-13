export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 576;

export const GAME_CONSTANTS = {
  initialBossHp: 100,
  playerLives: 3,
  playTimeSeconds: 30,
  playerBulletCooldown: 1, // 1s
  bossBaseSpeed: 200, // 200px/s
  bossBaseFireRate: 1000, // 1000ms
  bossBulletSpeed: 300,
  playerBulletSpeed: 520,
  playerBulletRadius: 4, // 4px
  bossBulletRadius: 6, 
  bossDamagePerHitPercent: 10,
  playerLifeLossPerHit: 1,
  lifeIcon: "❤️",
  preGameCountdown: 3,
} as const;

export const ASSET_PATHS = {
  player: "/stapi-player.png",
  boss: "/bug-boss.png",
  turret: "/turret-laptop.png",
  losePopup: "/lose-popup.png",
  bossBullet: "/spider-bullet.png",
  playerBullet: "/user-bullet.png",
} as const;

export type GameResult =
  | "idle"
  | "countdown"
  | "playing"
  | "won"
  | "lost_time"
  | "lost_lives";

export interface GameStatus {
  state: GameResult;
  bossHp: number;
  bossMaxHp: number;
  playerLives: number;
  timeLeft: number;
}

export function getBossSpeedMultiplier(
  bossHp: number,
  bossMaxHp: number,
  elapsedRatio: number,
): number {
  const hpLostRatio = 1 - bossHp / bossMaxHp;

  const hpBoost =
    hpLostRatio >= 0.8
      ? 3
      : hpLostRatio >= 0.6
        ? 2.75
        : hpLostRatio >= 0.4
          ? 2.5
          : hpLostRatio >= 0.2
            ? 2
            : 1;

  const timeBoost =
    elapsedRatio >= 0.8
      ? 2.25
      : elapsedRatio >= 0.6
        ? 1.75
        : elapsedRatio >= 0.4
          ? 1.5
          : elapsedRatio >= 0.2
            ? 1.25
            : 1;

  return hpBoost * timeBoost;
}

export function getTurretFireRateMultiplier(
  bossHp: number,
  bossMaxHp: number,
  elapsedRatio: number,
): number {
  const hpLostRatio = 1 - bossHp / bossMaxHp;

  const hpBoost =
    hpLostRatio >= 0.8
      ? 3
      : hpLostRatio >= 0.6
        ? 2.5
        : hpLostRatio >= 0.4
          ? 2
          : hpLostRatio >= 0.2
            ? 1.5
            : 1;

  const timeBoost =
    elapsedRatio >= 0.8
      ? 2.5
      : elapsedRatio >= 0.6
        ? 2
        : elapsedRatio >= 0.4
          ? 1.5
          : elapsedRatio >= 0.2
            ? 1.25
            : 1;

  return hpBoost * timeBoost;
}