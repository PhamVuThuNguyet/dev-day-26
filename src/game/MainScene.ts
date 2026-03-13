import Phaser from "phaser";
import {
  ASSET_PATHS,
  GAME_CONSTANTS,
  GAME_HEIGHT,
  GAME_WIDTH,
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
  private turrets!: Phaser.GameObjects.Image[];

  private bossHp = GAME_CONSTANTS.initialBossHp;
  private playerLives = GAME_CONSTANTS.playerLives;
  private timeLeft = GAME_CONSTANTS.playTimeSeconds;

  private lastPlayerShotAt = -Infinity;
  private gameState: GameStatus["state"] = "idle";
  private elapsedInPlay = 0;

  private bossHpBarBg!: Phaser.GameObjects.Rectangle;
  private bossHpBarFill!: Phaser.GameObjects.Rectangle;
  private bossHpText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;

  private onStatusChange?: OnGameStatusChange;

  constructor() {
    super("MainScene");
  }

  init(data: { onStatusChange?: OnGameStatusChange }) {
    this.onStatusChange = data.onStatusChange;
  }

  preload() {
    this.load.image("player", ASSET_PATHS.player);
    this.load.image("lose-popup", ASSET_PATHS.losePopup);
    this.load.image("boss", ASSET_PATHS.boss);
    this.load.image("turret", ASSET_PATHS.turret);
    this.load.image("boss-bullet", ASSET_PATHS.bossBullet);
    this.load.image("player-bullet", ASSET_PATHS.playerBullet);
  }

  create() {
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x050816,
    );

    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH - 48,
        GAME_HEIGHT - 48,
        0x0b1020,
      )
      .setStrokeStyle(2, 0x1e293b);


    const midY = GAME_HEIGHT / 2;
    this.add
      .rectangle(GAME_WIDTH / 2, midY, GAME_WIDTH - 64, 4, 0x1e293b)
      .setAlpha(0.8);

    this.boss = this.physics.add
      .sprite(GAME_WIDTH / 2, 110, "boss")
      .setDisplaySize(120, 80)
      .setCollideWorldBounds(true);

    this.player = this.physics.add
      .sprite(GAME_WIDTH / 2, GAME_HEIGHT - 80, "player")
      .setDisplaySize(80, 80)
      .setCollideWorldBounds(true);

    this.player.setMaxVelocity(600, 0);
    this.player.setImmovable(true);

    this.turrets = [];
    const turretCount = 3;
    const marginX = 120;
    const spacing =
      (GAME_WIDTH - marginX * 2) / (turretCount > 1 ? turretCount - 1 : 1);

    for (let i = 0; i < turretCount; i += 1) {
      const x = marginX + spacing * i;
      const turret = this.add
        .image(x, 170, "turret")
        .setDisplaySize(72, 48)
        .setTint(0x38bdf8);
      this.turrets.push(turret);
    }

    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 80,
      runChildUpdate: false,
    });

    this.bossHpBarBg = this.add.rectangle(
      GAME_WIDTH / 2,
      64,
      360,
      18,
      0x020617,
    );
    this.bossHpBarBg.setStrokeStyle(2, 0x4b5563);

    this.bossHpBarFill = this.add.rectangle(
      this.bossHpBarBg.x - this.bossHpBarBg.width / 2 + 2,
      this.bossHpBarBg.y,
      this.bossHpBarBg.width - 4,
      this.bossHpBarBg.height - 4,
      0x22c55e,
    );
    this.bossHpBarFill.setOrigin(0, 0.5);

    this.bossHpText = this.add.text(
      this.bossHpBarBg.x + this.bossHpBarBg.width / 2 + 8,
      this.bossHpBarBg.y,
      "",
      {
        fontSize: "16px",
        color: "#e5e7eb",
        fontFamily: "system-ui, sans-serif",
      },
    );
    this.bossHpText.setOrigin(0, 0.5);

    this.livesText = this.add.text(32, GAME_HEIGHT - 50, "", {
      fontSize: "20px",
      color: "#fbbf24",
      fontFamily: "system-ui, sans-serif",
    });

    this.timerText = this.add.text(GAME_WIDTH - 32, GAME_HEIGHT - 40, "", {
      fontSize: "20px",
      color: "#e5e7eb",
      fontFamily: "system-ui, sans-serif",
    });
    this.timerText.setOrigin(1, 0.5);

    this.countdownText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      "",
      {
        fontSize: "56px",
        color: "#e5e7eb",
        fontFamily: "system-ui, sans-serif",
      },
    );
    this.countdownText.setOrigin(0.5, 0.5);

    this.resultText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, "", {
      fontSize: "28px",
      color: "#e5e7eb",
      fontFamily: "system-ui, sans-serif",
      align: "center",
      wordWrap: { width: 540 },
    });
    this.resultText.setOrigin(0.5, 0.5);

    this.physics.add.overlap(
      this.bullets,
      this.boss,
      this.handleBulletHitsBoss as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.bullets,
      this.player,
      this.handleBulletHitsPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.gameState !== "playing" && this.gameState !== "countdown") {
        return;
      }
      const clampedX = Phaser.Math.Clamp(pointer.x, 64, GAME_WIDTH - 64);
      this.player.setX(clampedX);
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.tryShootPlayerBullet();
      }
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

    this.time.addEvent({
      delay: 1000,
      repeat: remaining,
      callback: () => {
        remaining -= 1;
        if (remaining > 0) {
          this.countdownText.setText(remaining.toString());
        } else {
          this.countdownText.setText("GO!");
          this.time.delayedCall(500, () => {
            this.countdownText.setText("");
          });
          this.gameState = "playing";
          this.emitStatus();
        }
      },
    });
  }

  private updateHud() {
    const hpRatio = Phaser.Math.Clamp(
      this.bossHp / GAME_CONSTANTS.initialBossHp,
      0,
      1,
    );
    this.bossHpBarFill.width =
      (this.bossHpBarBg.width - 4) * (hpRatio > 0 ? hpRatio : 0.00001);

    if (hpRatio > 0.6) {
      this.bossHpBarFill.setFillStyle(0x22c55e);
    } else if (hpRatio > 0.3) {
      this.bossHpBarFill.setFillStyle(0xfacc15);
    } else {
      this.bossHpBarFill.setFillStyle(0xef4444);
    }

    const hpPercent = Math.round(hpRatio * 100);
    this.bossHpText.setText(`${hpPercent}%`);

    const hearts = GAME_CONSTANTS.lifeIcon.repeat(this.playerLives);
    this.livesText.setText(`Lives: ${hearts}`);

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

    const bullet = this.spawnBullet(
      this.player.x,
      this.player.y - 40,
      "player",
    );
    if (!bullet) return;
    bullet.setVelocity(0, -GAME_CONSTANTS.playerBulletSpeed);

    this.tweens.add({
      targets: this.player,
      scaleX: 0.9,
      scaleY: 0.9,
      yoyo: true,
      duration: 100,
      ease: "Sine.easeInOut",
    });
  }

  private spawnBullet(
    x: number,
    y: number,
    kind: BulletType,
  ): Bullet | undefined {
    const textureKey = kind === "player" ? "player-bullet" : "boss-bullet";

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
    bullet.setDisplaySize(24, 24);


    return bullet;
  }

  private spawnBossBulletFrom(turret: Phaser.GameObjects.Image) {
    if (this.gameState !== "playing") return;

    const bullet = this.spawnBullet(turret.x, turret.y + 24, "boss");
    if (!bullet) return;

    // random shooting angle between -25° and 25°
    const randomAngleDeg = Phaser.Math.Between(-25, 25);
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
    this.cameras.main.flash(120, 255, 255, 255, false);

    this.tweens.add({
      targets: this.boss,
      tint: 0xffffff,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 100,
      yoyo: true,
      repeat: 1,
    });
  }

  private flashPlayer() {
    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      duration: 80,
      yoyo: true,
      repeat: 4,
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

    this.resultText.setText("You're Win! StaPi defeated the Bug Boss!");

    this.tweens.add({
      targets: this.boss,
      scaleX: 0,
      scaleY: 0,
      angle: 360,
      duration: 600,
      ease: "Back.easeIn",
    });
  }

  private handleLose(reason: GameStatus["state"]) {
    if (this.gameState !== "playing") return;
    this.gameState = reason;
    this.updateHud();
    this.emitStatus();

    const overlay = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x000000,
        0.7,
      )
      .setDepth(5);
 
    const popup = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "lose-popup")
      .setDisplaySize(GAME_WIDTH * 0.8, GAME_HEIGHT * 0.8)
      .setDepth(6);

    this.tweens.add({
      targets: [overlay, popup],
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.9, to: 1 },
      scaleY: { from: 0.9, to: 1 },
      duration: 400,
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

    this.bullets.children.each((child) => {
      const bullet = child as Bullet;
      if (!bullet.active) return false;
      if (
        bullet.y < -20 ||
        bullet.y > GAME_HEIGHT + 20 ||
        bullet.x < -20 ||
        bullet.x > GAME_WIDTH + 20
      ) {
        bullet.destroy();
      }
      return false;
    });

    this.player.setVelocityX(0);
    this.player.y = GAME_HEIGHT - 80;
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
    if (this.bossRetargetCooldown <= 0 || this.bossTargetX === null) {
      // Boss only moves in the range [80, GAME_WIDTH - 80]
      this.bossTargetX = Phaser.Math.Between(80, GAME_WIDTH - 80);
      // time to the next direction change (0.6–1.4s, faster with mult)
      const base = Phaser.Math.FloatBetween(0.6, 1.4);
      this.bossRetargetCooldown = base / mult;
    }

    const dx = this.bossTargetX - this.boss.x;
    const dir = Math.sign(dx) || Phaser.Math.RND.sign();
    this.boss.setVelocityX(dir * speed);

    // if Boss is near targetX (error < 10px) then force choose a new target sooner
    if (Math.abs(dx) < 10) {
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
    const minDelay = 0.4;
    const delaySec = Math.max(baseInterval / 1000 / fireMult, minDelay);

    this.turretCooldown = delaySec;

    const numToFire = Phaser.Math.Between(1, this.turrets.length);
    const shuffledTurrets = Phaser.Utils.Array.Shuffle([...this.turrets]);

    for (let i = 0; i < numToFire; i += 1) {
      this.spawnBossBulletFrom(shuffledTurrets[i]);
    }
  }
}

