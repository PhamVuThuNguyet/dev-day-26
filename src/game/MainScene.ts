import Phaser from "phaser";
import {
  ASSET_PATHS,
  GAME_CONSTANTS,
  GAME_HEIGHT,
  GAME_LAYOUT,
  GAME_WIDTH,
  HUD_STYLE,
  GameStatus,
  getBossSpeedMultiplier,
  getTurretFireRateMultiplier,
} from "./config";

type BulletType = "player" | "boss";

interface Bullet extends Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
  kind: BulletType;
}

export type OnGameStatusChange = (status: GameStatus) => void;

export class MainScene extends Phaser.Scene {
  private boss!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private bullets!: Phaser.Physics.Arcade.Group;
  private turrets!: { sprite: Phaser.GameObjects.Image; bulletKey: string }[];

  private bossHp = GAME_CONSTANTS.initialBossHp;
  private playerLives = GAME_CONSTANTS.playerLives;
  private timeLeft = GAME_CONSTANTS.playTimeSeconds;

  private lastPlayerShotAt = -Infinity;
  private isPlayerShooting = false;
  private playerShotFiredThisAnim = false;
  private gameState: GameStatus["state"] = "idle";
  private elapsedInPlay = 0;

  private bossHpBarBg!: Phaser.GameObjects.Rectangle;
  private bossHpBarFill!: Phaser.GameObjects.Rectangle;
  private bossHpText!: Phaser.GameObjects.Text;
  private lifeIconImages: Phaser.GameObjects.Image[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;

  private onStatusChange?: OnGameStatusChange;

  constructor() {
    super("MainScene");
  }

  init(data: { onStatusChange?: OnGameStatusChange }) {
    this.onStatusChange = data.onStatusChange;
  }

  preload() {
    this.load.image("play-bg", ASSET_PATHS.playBg);

    this.load.image("stapi-act-1", ASSET_PATHS.stapiAct1);
    this.load.image("stapi-act-2", ASSET_PATHS.stapiAct2);
    this.load.image("stapi-act-3", ASSET_PATHS.stapiAct3);
    this.load.image("stapi-act-4", ASSET_PATHS.stapiAct4);
    this.load.image("player-bullet", ASSET_PATHS.playerBullet);

    this.load.image("turret-1", ASSET_PATHS.turret1);
    this.load.image("turret-2", ASSET_PATHS.turret2);
    this.load.image("turret-3", ASSET_PATHS.turret3);
    this.load.image("turret-4", ASSET_PATHS.turret4);
    this.load.image("boss-bullet-1", ASSET_PATHS.bullet1);
    this.load.image("boss-bullet-2", ASSET_PATHS.bullet2);
    this.load.image("boss-bullet-3", ASSET_PATHS.bullet3);
    this.load.image("boss-bullet-4", ASSET_PATHS.bullet4);

    this.load.image("boss-alive", ASSET_PATHS.bossAlive);
    this.load.image("boss-dead", ASSET_PATHS.bossDead);

    this.load.image("defeated-popup", ASSET_PATHS.defeatedPopup);
    this.load.image("win-popup", ASSET_PATHS.winPopup);
    this.load.image("live-icon", ASSET_PATHS.liveIcon);
  }

  create() {
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "play-bg");
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    this.boss = this.physics.add
      .sprite(GAME_WIDTH / 2, GAME_LAYOUT.boss.y, "boss-alive")
      .setDisplaySize(
        GAME_LAYOUT.boss.displayWidth,
        GAME_LAYOUT.boss.displayHeight,
      )
      .setCollideWorldBounds(true);

    this.player = this.physics.add
      .sprite(
        GAME_WIDTH / 2,
        GAME_HEIGHT - GAME_LAYOUT.player.marginBottom,
        "stapi-act-1",
      )
      .setDisplaySize(
        GAME_LAYOUT.player.displaySize,
        GAME_LAYOUT.player.displaySize,
      )
      .setCollideWorldBounds(true);

    this.player.setMaxVelocity(GAME_LAYOUT.player.maxVelocityX, 0);
    this.player.setImmovable(true);

    this.turrets = [];
    const turretCount = GAME_LAYOUT.turrets.count;
    const marginX = GAME_LAYOUT.turrets.marginX;
    const spacing =
      (GAME_WIDTH - marginX * 2) / (turretCount > 1 ? turretCount - 1 : 1);

    for (let i = 0; i < turretCount; i += 1) {
      const x = marginX + spacing * i;
      const turretKey = `turret-${i + 1}`;
      const bulletKey = `boss-bullet-${i + 1}`;
      const turretSprite = this.add
        .image(x, GAME_LAYOUT.turrets.y, turretKey)
        .setDisplaySize(
          GAME_LAYOUT.turrets.displayWidth,
          GAME_LAYOUT.turrets.displayHeight,
        );
      this.turrets.push({ sprite: turretSprite, bulletKey });
    }

    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: GAME_LAYOUT.bulletPoolMax,
      runChildUpdate: false,
    });

    const hpBar = GAME_LAYOUT.bossHpBar;
    this.bossHpBarBg = this.add.rectangle(
      GAME_WIDTH / 2,
      hpBar.centerY,
      hpBar.width,
      hpBar.height,
      hpBar.bgColor,
    );
    this.bossHpBarBg.setStrokeStyle(hpBar.strokeWidth, hpBar.strokeColor);

    this.bossHpBarFill = this.add.rectangle(
      this.bossHpBarBg.x - this.bossHpBarBg.width / 2 + hpBar.innerPad,
      this.bossHpBarBg.y,
      this.bossHpBarBg.width - hpBar.innerPad * 2,
      this.bossHpBarBg.height - hpBar.innerPad * 2,
      hpBar.fillHigh,
    );
    this.bossHpBarFill.setOrigin(0, 0.5);

    this.bossHpText = this.add.text(
      this.bossHpBarBg.x + this.bossHpBarBg.width / 2 + hpBar.textOffsetX,
      this.bossHpBarBg.y,
      "",
      {
        fontSize: HUD_STYLE.bossHpFontSize,
        fontStyle: "bold",
        color: HUD_STYLE.accentColor,
        fontFamily: HUD_STYLE.fontFamily,
      },
    );
    this.bossHpText.setOrigin(0, 0.5);

    const li = GAME_LAYOUT.lifeIcons;
    const lifeY = GAME_HEIGHT - li.marginBottom;
    this.lifeIconImages = [];
    for (let i = 0; i < GAME_CONSTANTS.playerLives; i += 1) {
      const x = li.marginLeft + li.width / 2 + i * (li.width + li.gap);
      const img = this.add
        .image(x, lifeY, "live-icon")
        .setDisplaySize(li.width, li.height)
        .setOrigin(0.5, 0.5);
      this.lifeIconImages.push(img);
    }

    const tm = GAME_LAYOUT.timer;
    this.timerText = this.add.text(
      GAME_WIDTH - tm.marginRight,
      GAME_HEIGHT - tm.marginBottom,
      "",
      {
        fontSize: HUD_STYLE.timerFontSize,
        fontStyle: "bold",
        color: HUD_STYLE.accentColor,
        fontFamily: HUD_STYLE.fontFamily,
      },
    );
    this.timerText.setOrigin(1, 0.5);

    this.countdownText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "", {
      fontSize: HUD_STYLE.countdownFontSize,
      fontStyle: "bold",
      color: HUD_STYLE.accentColor,
      fontFamily: HUD_STYLE.fontFamily,
    });
    this.countdownText
      .setOrigin(0.5, 0.5)
      .setDepth(GAME_LAYOUT.countdown.depth);

    this.physics.add.overlap(
      this.bullets,
      this.boss,
      this
        .handleBulletHitsBoss as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.bullets,
      this.player,
      this
        .handleBulletHitsPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.gameState !== "playing" && this.gameState !== "countdown") {
        return;
      }
      const m = GAME_LAYOUT.player.pointerClampMargin;
      const clampedX = Phaser.Math.Clamp(pointer.x, m, GAME_WIDTH - m);
      this.player.setX(clampedX);
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.tryShootPlayerBullet();
      }
    });

    // Default = pi-act-1 (idle). Only play action sequence on shooting.
    this.player.setTexture("stapi-act-1");

    if (!this.anims.exists("stapi-shoot")) {
      this.anims.create({
        key: "stapi-shoot",
        frames: [
          { key: "stapi-act-1" },
          { key: "stapi-act-2" },
          { key: "stapi-act-3" },
          { key: "stapi-act-4" },
        ],
        frameRate: GAME_LAYOUT.playerShootAnim.frameRate,
        repeat: 0,
      });
    }

    this.player.on(
      "animationupdate-stapi-shoot",
      (
        _anim: Phaser.Animations.Animation,
        frame: Phaser.Animations.AnimationFrame,
      ) => {
        if (this.gameState !== "playing") return;
        if (this.playerShotFiredThisAnim) return;
        const isShootFrame =
          frame.textureKey === "stapi-act-4" || frame.index >= 4;
        if (!isShootFrame) return;

        this.playerShotFiredThisAnim = true;
        const bullet = this.spawnBullet(
          this.player.x,
          this.player.y - GAME_LAYOUT.player.bulletSpawnOffsetY,
          "player",
        );
        if (!bullet) return;
        bullet.setVelocity(0, -GAME_CONSTANTS.playerBulletSpeed);
      },
    );

    this.player.on("animationcomplete-stapi-shoot", () => {
      if (this.gameState === "playing" && !this.playerShotFiredThisAnim) {
        const bullet = this.spawnBullet(
          this.player.x,
          this.player.y - GAME_LAYOUT.player.bulletSpawnOffsetY,
          "player",
        );
        if (bullet) {
          bullet.setVelocity(0, -GAME_CONSTANTS.playerBulletSpeed);
        }
      }
      this.isPlayerShooting = false;
      this.playerShotFiredThisAnim = false;
      this.player.setTexture("stapi-act-1");
    });

    this.startCountdown();
  }

  private startCountdown() {
    this.gameState = "countdown";
    this.timeLeft = GAME_CONSTANTS.playTimeSeconds;
    this.elapsedInPlay = 0;
    this.bossHp = GAME_CONSTANTS.initialBossHp;
    this.playerLives = GAME_CONSTANTS.playerLives;
    this.bullets.clear(true, true);
    this.updateHud();
    this.emitStatus();

    let remaining = GAME_CONSTANTS.preGameCountdown;
    this.countdownText.setText(remaining.toString());

    const pre = GAME_LAYOUT.preGame;
    this.time.addEvent({
      delay: pre.tickIntervalMs,
      repeat: Math.max(0, remaining - 1),
      callback: () => {
        remaining -= 1;
        if (remaining > 0) {
          this.countdownText.setText(remaining.toString());
        } else {
          this.countdownText.setText("GO!");
          this.time.delayedCall(pre.goClearDelayMs, () => {
            this.countdownText.setText("");
          });
          this.gameState = "playing";
          this.emitStatus();
        }
      },
    });
  }

  private updateHud() {
    const hpBar = GAME_LAYOUT.bossHpBar;
    const innerW = this.bossHpBarBg.width - hpBar.innerPad * 2;
    const hpRatio = Phaser.Math.Clamp(
      this.bossHp / GAME_CONSTANTS.initialBossHp,
      0,
      1,
    );
    this.bossHpBarFill.width = innerW * (hpRatio > 0 ? hpRatio : 0.00001);

    if (hpRatio > hpBar.ratioHigh) {
      this.bossHpBarFill.setFillStyle(hpBar.fillHigh);
    } else if (hpRatio > hpBar.ratioMid) {
      this.bossHpBarFill.setFillStyle(hpBar.fillMid);
    } else {
      this.bossHpBarFill.setFillStyle(hpBar.fillLow);
    }

    const hpPercent = Math.round(hpRatio * 100);
    this.bossHpText.setText(`${hpPercent}%`);

    for (let i = 0; i < this.lifeIconImages.length; i += 1) {
      this.lifeIconImages[i].setVisible(i < this.playerLives);
    }

    this.timerText.setText(`Time: ${Math.ceil(this.timeLeft)}s`);
  }

  private emitStatus() {
    if (!this.onStatusChange) return;
    this.onStatusChange({
      state: this.gameState,
      bossHp: this.bossHp,
      bossMaxHp: GAME_CONSTANTS.initialBossHp,
      playerLives: this.playerLives,
      timeLeft: this.timeLeft,
    });
  }

  private tryShootPlayerBullet() {
    if (this.gameState !== "playing") return;

    const now = this.time.now / 1000;
    if (now - this.lastPlayerShotAt < GAME_CONSTANTS.playerBulletCooldown) {
      return;
    }
    this.lastPlayerShotAt = now;

    if (this.isPlayerShooting) return;
    this.isPlayerShooting = true;
    this.playerShotFiredThisAnim = false;
    this.player.play("stapi-shoot");
  }

  private spawnBullet(
    x: number,
    y: number,
    kind: BulletType,
  ): Bullet | undefined {
    const textureKey = kind === "player" ? "player-bullet" : "boss-bullet-1";

    const bullet = this.bullets.get(x, y, textureKey) as Bullet | null;
    if (!bullet) return undefined;

    bullet.kind = kind;
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setCircle(
      kind === "player"
        ? GAME_CONSTANTS.playerBulletRadius
        : GAME_CONSTANTS.bossBulletRadius,
    );
    const bs = GAME_LAYOUT.bulletDisplaySize;
    bullet.setDisplaySize(bs, bs);

    return bullet;
  }

  private spawnBossBulletFrom(turret: {
    sprite: Phaser.GameObjects.Image;
    bulletKey: string;
  }) {
    if (this.gameState !== "playing") return;

    const bullet = this.spawnBullet(
      turret.sprite.x,
      turret.sprite.y + GAME_LAYOUT.turrets.bulletSpawnOffsetY,
      "boss",
    );
    if (!bullet) return;
    bullet.setTexture(turret.bulletKey);

    const randomAngleDeg = Phaser.Math.Between(
      -GAME_CONSTANTS.bossBulletAngleRandomDeg,
      GAME_CONSTANTS.bossBulletAngleRandomDeg,
    );
    const angleRad = Phaser.Math.DegToRad(randomAngleDeg);
    const speed = GAME_CONSTANTS.bossBulletSpeed;
    const vx = Math.sin(angleRad) * speed;
    const vy = Math.cos(angleRad) * speed;
    bullet.setVelocity(vx, vy);
  }

  private handleBulletHitsBoss(
    boss: Phaser.GameObjects.GameObject,
    bulletObj: Phaser.GameObjects.GameObject,
  ) {
    const bullet = bulletObj as Bullet;
    if (bullet.kind !== "player" || this.gameState !== "playing") return;

    bullet.destroy();

    this.bossHp -= GAME_CONSTANTS.bossDamagePerHitPercent;
    if (this.bossHp < 0) {
      this.bossHp = 0 as typeof GAME_CONSTANTS.initialBossHp;
    }
    this.updateHud();
    this.flashBoss();
    this.emitStatus();

    if (this.bossHp <= 0) {
      this.handleWin();
    }
  }

  private handleBulletHitsPlayer(
    player: Phaser.GameObjects.GameObject,
    bulletObj: Phaser.GameObjects.GameObject,
  ) {
    const bullet = bulletObj as Bullet;
    if (bullet.kind !== "boss" || this.gameState !== "playing") return;

    bullet.destroy();

    this.playerLives -= GAME_CONSTANTS.playerLifeLossPerHit;
    if (this.playerLives < 0) {
      this.playerLives = 0 as typeof GAME_CONSTANTS.playerLives;
    }
    this.updateHud();
    this.flashPlayer();
    this.emitStatus();

    if (this.playerLives <= 0) {
      this.handleLose("lost_lives");
    }
  }

  private flashBoss() {
    const f = GAME_LAYOUT.flash;
    this.cameras.main.flash(f.bossCameraMs, 255, 255, 255, false);

    this.tweens.add({
      targets: this.boss,
      tint: 0xffffff,
      scaleX: f.bossHitScale,
      scaleY: f.bossHitScale,
      duration: f.bossTweenMs,
      yoyo: true,
      repeat: f.bossTweenRepeat,
    });
  }

  private flashPlayer() {
    const f = GAME_LAYOUT.flash;
    this.tweens.add({
      targets: this.player,
      alpha: f.playerAlpha,
      duration: f.playerTweenMs,
      yoyo: true,
      repeat: f.playerTweenRepeat,
      onComplete: () => {
        this.player.setAlpha(1);
      },
    });
  }

  private handleWin() {
    if (this.gameState !== "playing") return;
    this.gameState = "won";
    this.updateHud();
    this.emitStatus();

    this.boss.setTexture("boss-dead");
    this.boss.setVelocityX(0);
    this.player.setVelocityX(0);
    this.bullets.clear(true, true);
    this.input.enabled = false;
    this.physics.pause();

    const end = GAME_LAYOUT.endScreen;
    const overlay = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x000000,
        end.overlayAlpha,
      )
      .setDepth(end.overlayDepth);

    const popup = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "win-popup")
      .setDisplaySize(GAME_WIDTH * end.popupScale, GAME_HEIGHT * end.popupScale)
      .setDepth(end.popupDepth);

    this.tweens.add({
      targets: [overlay, popup],
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.9, to: 1 },
      scaleY: { from: 0.9, to: 1 },
      duration: end.tweenDurationMs,
      ease: "Back.easeOut",
    });
  }

  private handleLose(reason: GameStatus["state"]) {
    if (this.gameState !== "playing") return;
    this.gameState = reason;
    this.updateHud();
    this.emitStatus();
    this.player.setVelocityX(0);
    this.boss.setVelocityX(0);
    this.bullets.clear(true, true);
    this.input.enabled = false;
    this.physics.pause();

    const end = GAME_LAYOUT.endScreen;
    const overlay = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x000000,
        end.overlayAlpha,
      )
      .setDepth(end.overlayDepth);

    const popup = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "defeated-popup")
      .setDisplaySize(GAME_WIDTH * end.popupScale, GAME_HEIGHT * end.popupScale)
      .setDepth(end.popupDepth);

    this.tweens.add({
      targets: [overlay, popup],
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.9, to: 1 },
      scaleY: { from: 0.9, to: 1 },
      duration: end.tweenDurationMs,
      ease: "Back.easeOut",
    });
  }

  update(time: number, deltaMs: number) {
    const deltaSec = deltaMs / 1000;

    if (this.gameState === "playing") {
      this.elapsedInPlay += deltaSec;
      this.timeLeft -= deltaSec;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0 as typeof GAME_CONSTANTS.playTimeSeconds;
        this.updateHud();
        this.handleLose("lost_time");
      } else {
        this.updateHud();
        this.updateBossMovement(deltaSec);
        this.updateTurretFire(deltaSec);
      }
    }

    const cull = GAME_LAYOUT.bulletCullMargin;
    this.bullets.children.each((child) => {
      const bullet = child as Bullet;
      if (!bullet.active) return false;
      if (
        bullet.y < -cull ||
        bullet.y > GAME_HEIGHT + cull ||
        bullet.x < -cull ||
        bullet.x > GAME_WIDTH + cull
      ) {
        bullet.destroy();
      }
      return false;
    });

    this.player.setVelocityX(0);
    this.player.y = GAME_HEIGHT - GAME_LAYOUT.player.marginBottom;
  }

  private bossTargetX: number | null = null;
  private bossRetargetCooldown = 0;

  private updateBossMovement(deltaSec: number) {
    const elapsedRatio =
      this.elapsedInPlay / GAME_CONSTANTS.playTimeSeconds || 0;
    const mult = getBossSpeedMultiplier(
      this.bossHp,
      GAME_CONSTANTS.initialBossHp,
      elapsedRatio,
    );
    const speed = GAME_CONSTANTS.bossBaseSpeed * mult;

    // decrease cooldown, when it's 0, choose a new target X
    this.bossRetargetCooldown -= deltaSec;
    const bm = GAME_LAYOUT.bossMove;
    if (this.bossRetargetCooldown <= 0 || this.bossTargetX === null) {
      this.bossTargetX = Phaser.Math.Between(
        bm.horizontalMargin,
        GAME_WIDTH - bm.horizontalMargin,
      );
      const base = Phaser.Math.FloatBetween(
        bm.retargetSecondsMin,
        bm.retargetSecondsMax,
      );
      this.bossRetargetCooldown = base / mult;
    }

    const dx = this.bossTargetX - this.boss.x;
    const dir = Math.sign(dx) || Phaser.Math.RND.sign();
    this.boss.setVelocityX(dir * speed);

    if (Math.abs(dx) < bm.arrivedThresholdPx) {
      this.bossRetargetCooldown = 0;
    }
  }

  private turretCooldown = 0;

  private updateTurretFire(deltaSec: number) {
    this.turretCooldown -= deltaSec;
    if (this.turretCooldown > 0) return;

    const elapsedRatio =
      this.elapsedInPlay / GAME_CONSTANTS.playTimeSeconds || 0;

    const fireMult = getTurretFireRateMultiplier(
      this.bossHp,
      GAME_CONSTANTS.initialBossHp,
      elapsedRatio,
    );
    const baseInterval = GAME_CONSTANTS.bossBaseFireRate;
    const minDelay = GAME_LAYOUT.turretFire.minIntervalSec;
    const delaySec = Math.max(baseInterval / 1000 / fireMult, minDelay);

    this.turretCooldown = delaySec;

    const numToFire = Phaser.Math.Between(1, this.turrets.length);
    const shuffledTurrets = Phaser.Utils.Array.Shuffle([...this.turrets]);

    for (let i = 0; i < numToFire; i += 1) {
      this.spawnBossBulletFrom(shuffledTurrets[i]);
    }
  }
}
