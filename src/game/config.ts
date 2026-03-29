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
  preGameCountdown: 3,
  bossBulletAngleRandomDeg: 25,
} as const;

/** Layout, visuals & timings — custom game feel / UI */
export const GAME_LAYOUT = {
  boss: {
    y: 110,
    displayWidth: 120,
    displayHeight: 80,
  },
  player: {
    marginBottom: 80,
    displaySize: 80,
    maxVelocityX: 600,
    pointerClampMargin: 64,
    bulletSpawnOffsetY: 40,
  },
  turrets: {
    count: 4,
    marginX: 120,
    y: 170,
    displayWidth: 72,
    displayHeight: 48,
    bulletSpawnOffsetY: 24,
  },
  bulletPoolMax: 80,
  bossHpBar: {
    centerY: 64,
    width: 360,
    height: 18,
    bgColor: 0x020617,
    strokeWidth: 2,
    strokeColor: 0x4b5563,
    innerPad: 2,
    textOffsetX: 8,
    fillHigh: 0x22c55e,
    fillMid: 0xfacc15,
    fillLow: 0xef4444,
    ratioHigh: 0.6,
    ratioMid: 0.3,
  },
  lifeIcons: {
    marginLeft: 32,
    marginBottom: 80,
    width: 34,
    height: 28,
    gap: 6,
  },
  timer: {
    marginRight: 32,
    marginBottom: 80,
  },
  countdown: {
    depth: 100,
  },
  preGame: {
    tickIntervalMs: 1000,
    goClearDelayMs: 500,
  },
  playerShootAnim: {
    frameRate: 10,
  },
  bulletDisplaySize: 24,
  endScreen: {
    overlayAlpha: 0.7,
    popupScale: 0.8,
    tweenDurationMs: 400,
    overlayDepth: 5,
    popupDepth: 6,
  },
  bossMove: {
    horizontalMargin: 80,
    retargetSecondsMin: 0.6,
    retargetSecondsMax: 1.4,
    arrivedThresholdPx: 10,
  },
  turretFire: {
    minIntervalSec: 0.4,
  },
  bulletCullMargin: 20,
  flash: {
    bossCameraMs: 120,
    bossTweenMs: 100,
    bossHitScale: 1.15,
    bossTweenRepeat: 1,
    playerAlpha: 0.2,
    playerTweenMs: 80,
    playerTweenRepeat: 4,
  },
} as const;

/** Phaser Text Style */
export const HUD_STYLE = {
  fontFamily: '"Space Grotesk", sans-serif',
  accentColor: "#1040ff",
  bossHpFontSize: "20px",
  timerFontSize: "25px",
  countdownFontSize: "80px",
} as const;

export const ASSET_PATHS = {
  startBg: "/start-bg.png",
  playBg: "/bg.png",

  stapiAct1: "/pi-act-1.png",
  stapiAct2: "/pi-act-2.png",
  stapiAct3: "/pi-act-3.png",
  stapiAct4: "/pi-act-4.png",
  playerBullet: "/user-bullet.png",

  turret1: "/turret-1.png",
  turret2: "/turret-2.png",
  turret3: "/turret-3.png",
  turret4: "/turret-4.png",
  bullet1: "/bullet-1.png",
  bullet2: "/bullet-2.png",
  bullet3: "/bullet-3.png",
  bullet4: "/bullet-4.png",

  bossAlive: "/boss.png",
  bossDead: "/boss-dead.png",

  defeatedPopup: "/defeated.png",
  winPopup: "/win.png",
  liveIcon: "/live.png",
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
