import { sounds } from '../audio/soundFX';
import {
  Bullet,
  Enemy,
  EnemyType,
  FloatingText,
  GameState,
  Particle,
  Pickup,
  PickupType,
  PlayerShip,
  PlayerStats,
  Star,
} from './types';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;

  // Viewport dimensions
  public width: number = 800;
  public height: number = 600;

  // Game state
  public state: GameState = 'TITLE_MENU';
  public stats: PlayerStats = {
    score: 0,
    highScore: 0,
    wave: 1,
    kills: 0,
    combo: 0,
    maxCombo: 0,
    accuracy: 100,
    shotsFired: 0,
    shotsHit: 0,
    bombsAvailable: 2,
    maxBombs: 3,
  };

  // Entities
  public player: PlayerShip;
  public enemies: Enemy[] = [];
  public bullets: Bullet[] = [];
  public particles: Particle[] = [];
  public pickups: Pickup[] = [];
  public floatingTexts: FloatingText[] = [];
  private stars: Star[] = [];

  // Wave system
  public waveEnemiesRemaining: number = 0;
  public waveTotalEnemies: number = 0;
  public waveTimer: number = 0;
  public isBossWave: boolean = false;
  private bossRef: Enemy | null = null;
  private waveBannerText: string = '';
  private waveBannerTimer: number = 0;

  // Screen shake & FX
  private screenShakeAmount: number = 0;
  private bombFlashAlpha: number = 0;
  private comboTimer: number = 0;

  // Input states
  private keys: Record<string, boolean> = {};
  public mousePos: { x: number; y: number } = { x: 0, y: 0 };
  public isMouseDown: boolean = false;
  public autoFire: boolean = true;
  private nextEntityId: number = 1;

  // React Callbacks
  public onStateChange?: (state: GameState) => void;
  public onStatsChange?: (stats: PlayerStats) => void;
  public onPerkTrigger?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D context not available');
    this.ctx = context;

    // Load High Score from localStorage
    const savedHighScore = localStorage.getItem('aether_vanguard_high_score');
    if (savedHighScore) {
      this.stats.highScore = parseInt(savedHighScore, 10) || 0;
    }

    this.player = this.createDefaultPlayer();
    this.initStars();
    this.bindInputs();
    this.resize();
  }

  private createDefaultPlayer(): PlayerShip {
    return {
      x: this.width / 2,
      y: this.height - 100,
      vx: 0,
      vy: 0,
      rotation: -Math.PI / 2,
      width: 38,
      height: 44,
      maxHp: 100,
      hp: 100,
      maxShield: 0,
      shield: 0,
      shieldRechargeTimer: 0,
      fireCooldown: 0,
      baseFireInterval: 140, // ms
      damageMultiplier: 1.0,
      speed: 6.5,
      bulletSpeed: 14,
      bulletPierce: 1,
      critChance: 0.05,
      weaponType: 'DUAL_PLASMA',
      hasDrone: false,
      droneAngle: 0,
      droneCooldown: 0,
      hasShieldUpgrade: false,
      hasMissilePerk: false,
      missileCounter: 0,
      magnetRadius: 100,
      invulnerableTimer: 0,
      overchargeDuration: 0,
    };
  }

  private initStars() {
    this.stars = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      this.stars.push({
        x: Math.random() * (this.width || 800),
        y: Math.random() * (this.height || 600),
        size: depth < 0.6 ? 1 : depth < 0.9 ? 1.8 : 2.5,
        speed: 0.5 + depth * 2.2,
        alpha: 0.3 + depth * 0.7,
        color: depth > 0.85 ? '#38bdf8' : depth > 0.7 ? '#fde047' : '#ffffff',
      });
    }
  }

  public resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.width = Math.max(rect.width, 320);
    this.height = Math.max(rect.height, 480);

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Keep player in bounds on resize
    if (this.player) {
      this.player.x = Math.max(30, Math.min(this.width - 30, this.player.x));
      this.player.y = Math.max(30, Math.min(this.height - 30, this.player.y));
    }
  }

  private bindInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'PLAYING') {
          this.pauseGame();
        } else if (this.state === 'PAUSED') {
          this.resumeGame();
        }
      }
      if (e.code === 'KeyB' || e.code === 'Space') {
        if (this.state === 'PLAYING') {
          this.triggerSuperBomb();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
      } else if (e.button === 2) {
        e.preventDefault();
        this.triggerSuperBomb();
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch events for mobile/tablet
    this.canvas.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          const rect = this.canvas.getBoundingClientRect();
          this.mousePos = {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top,
          };
          this.isMouseDown = true;
        }
      },
      { passive: false }
    );

    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length > 0) {
          const rect = this.canvas.getBoundingClientRect();
          this.mousePos = {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top,
          };
          this.isMouseDown = true;
        }
      },
      { passive: true }
    );

    this.canvas.addEventListener('touchend', () => {
      this.isMouseDown = false;
    });
  }

  public startGame() {
    this.player = this.createDefaultPlayer();
    this.player.x = this.width / 2;
    this.player.y = this.height - 120;
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.pickups = [];
    this.floatingTexts = [];
    this.stats = {
      score: 0,
      highScore: this.stats.highScore,
      wave: 1,
      kills: 0,
      combo: 0,
      maxCombo: 0,
      accuracy: 100,
      shotsFired: 0,
      shotsHit: 0,
      bombsAvailable: 2,
      maxBombs: 3,
    };
    this.setState('PLAYING');
    this.startWave(1);
    this.running = true;
    this.lastTime = performance.now();
    cancelAnimationFrame(this.animId);
    this.loop(this.lastTime);
  }

  public pauseGame() {
    if (this.state === 'PLAYING') {
      this.setState('PAUSED');
    }
  }

  public resumeGame() {
    if (this.state === 'PAUSED') {
      this.setState('PLAYING');
      this.lastTime = performance.now();
    }
  }

  public restartGame() {
    this.startGame();
  }

  public applyPerk(perkId: string) {
    if (perkId === 'rapid_fire') {
      this.player.baseFireInterval = Math.max(70, this.player.baseFireInterval * 0.72);
    } else if (perkId === 'heavy_plasma') {
      this.player.damageMultiplier *= 1.35;
    } else if (perkId === 'tri_spread') {
      this.player.weaponType = 'TRI_SPREAD';
    } else if (perkId === 'rail_beam') {
      this.player.weaponType = 'RAIL_BEAM';
      this.player.bulletPierce = 3;
    } else if (perkId === 'homing_pods') {
      this.player.hasMissilePerk = true;
    } else if (perkId === 'auxiliary_drone') {
      this.player.hasDrone = true;
    } else if (perkId === 'kinetic_shield') {
      this.player.hasShieldUpgrade = true;
      this.player.maxShield = 50;
      this.player.shield = 50;
    } else if (perkId === 'reinforced_plating') {
      this.player.maxHp += 40;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
    } else if (perkId === 'magnetic_graviton') {
      this.player.magnetRadius *= 2.5;
    } else if (perkId === 'crit_matrix') {
      this.player.critChance += 0.25;
    } else if (perkId === 'super_emp') {
      this.stats.maxBombs += 2;
      this.stats.bombsAvailable += 2;
    } else if (perkId === 'aerodynamic_afterburners') {
      this.player.speed *= 1.25;
    }

    sounds.levelUp();
    this.spawnFloatingText('SYSTEM UPGRADE ONLINE', this.player.x, this.player.y - 40, '#38bdf8', 18);
    // Proceed to next wave
    this.startWave(this.stats.wave + 1);
    this.setState('PLAYING');
  }

  public triggerSuperBomb() {
    if (this.stats.bombsAvailable <= 0 || this.state !== 'PLAYING') return;
    this.stats.bombsAvailable--;
    sounds.bomb();
    this.screenShakeAmount = 24;
    this.bombFlashAlpha = 0.85;

    // Vaporize hostile bullets
    this.bullets = this.bullets.filter((b) => b.isPlayer);

    // Damage all enemies heavily or destroy them
    for (const enemy of [...this.enemies]) {
      this.damageEnemy(enemy, 160 + this.stats.wave * 25, true);
    }

    this.spawnFloatingText('EMP DETONATION', this.width / 2, this.height / 2, '#38bdf8', 26);
    this.emitStats();
  }

  private setState(newState: GameState) {
    this.state = newState;
    if (this.onStateChange) this.onStateChange(newState);
  }

  private startWave(waveNumber: number) {
    this.stats.wave = waveNumber;
    this.isBossWave = waveNumber % 5 === 0;
    this.waveBannerText = this.isBossWave
      ? `SECTOR ALERT: TITAN CLASS HOSTILE (WAVE ${waveNumber})`
      : `WAVE ${waveNumber}: ORBITAL SWARM DETECTED`;
    this.waveBannerTimer = 3.0; // 3 seconds banner

    if (this.isBossWave) {
      sounds.bossWarning();
      this.waveTotalEnemies = 1 + waveNumber * 2;
      this.waveEnemiesRemaining = this.waveTotalEnemies;
      this.spawnBoss(waveNumber);
    } else {
      this.waveTotalEnemies = 8 + waveNumber * 4;
      this.waveEnemiesRemaining = this.waveTotalEnemies;
    }

    this.waveTimer = 0;
    this.emitStats();
  }

  private spawnBoss(waveNumber: number) {
    const hp = 850 + waveNumber * 300;
    const boss: Enemy = {
      id: this.nextEntityId++,
      type: 'BOSS',
      x: this.width / 2,
      y: -120,
      vx: 0,
      vy: 1.2,
      width: 140,
      height: 90,
      hp: hp,
      maxHp: hp,
      scoreValue: 5000 + waveNumber * 1000,
      color: '#f43f5e',
      shootCooldown: 0,
      shootInterval: 750,
      behaviorTimer: 0,
      angle: 0,
      phase: 1,
    };
    this.enemies.push(boss);
    this.bossRef = boss;
  }

  private spawnRegularEnemy() {
    if (this.waveEnemiesRemaining <= 0) return;
    this.waveEnemiesRemaining--;

    const rand = Math.random();
    let type: EnemyType = 'SCOUT';
    let hp = 15 + this.stats.wave * 4;
    let score = 100;
    let width = 28;
    let height = 30;
    let color = '#38bdf8';
    let shootInterval = 1800;

    if (this.stats.wave >= 2 && rand < 0.3) {
      type = 'INTERCEPTOR';
      hp = 22 + this.stats.wave * 5;
      score = 180;
      color = '#e11d48';
      shootInterval = 2200;
      width = 30;
      height = 32;
    } else if (this.stats.wave >= 3 && rand < 0.6) {
      type = 'SWARMER';
      hp = 10 + this.stats.wave * 3;
      score = 90;
      color = '#f59e0b';
      shootInterval = 3000;
      width = 22;
      height = 22;
    } else if (this.stats.wave >= 4 && rand < 0.8) {
      type = 'HEAVY';
      hp = 70 + this.stats.wave * 15;
      score = 450;
      color = '#a855f7';
      shootInterval = 1400;
      width = 46;
      height = 42;
    }

    const enemy: Enemy = {
      id: this.nextEntityId++,
      type,
      x: Math.random() * (this.width - 100) + 50,
      y: -40,
      vx: (Math.random() - 0.5) * 2,
      vy: type === 'INTERCEPTOR' ? 3.4 : type === 'SWARMER' ? 3.0 : 1.8,
      width,
      height,
      hp,
      maxHp: hp,
      scoreValue: score,
      color,
      shootCooldown: Math.random() * shootInterval,
      shootInterval,
      behaviorTimer: Math.random() * 10,
      angle: 0,
    };

    this.enemies.push(enemy);
  }

  // Main Loop
  private loop = (time: number) => {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (this.state === 'PLAYING') {
      this.update(dt);
    }
    this.render();

    this.animId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.updateStars(dt);
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    // Screen Shake decay
    if (this.screenShakeAmount > 0) {
      this.screenShakeAmount = Math.max(0, this.screenShakeAmount - dt * 45);
    }
    // Bomb flash decay
    if (this.bombFlashAlpha > 0) {
      this.bombFlashAlpha = Math.max(0, this.bombFlashAlpha - dt * 2.8);
    }
    // Wave banner timer
    if (this.waveBannerTimer > 0) {
      this.waveBannerTimer -= dt;
    }

    // Combo timer decay
    if (this.stats.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.stats.combo = 0;
        this.emitStats();
      }
    }

    // Wave spawning logic
    this.waveTimer += dt;
    if (this.waveEnemiesRemaining > 0 && this.waveTimer > 0.9) {
      this.waveTimer = 0;
      this.spawnRegularEnemy();
    }

    // Check wave clear
    if (this.waveEnemiesRemaining <= 0 && this.enemies.length === 0) {
      this.handleWaveCompleted();
    }
  }

  private handleWaveCompleted() {
    sounds.levelUp();
    this.setState('PERK_SELECTION');
    if (this.onPerkTrigger) {
      this.onPerkTrigger();
    }
  }

  private updateStars(dt: number) {
    for (const star of this.stars) {
      star.y += star.speed * (60 * dt);
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }
  }

  private updatePlayer(dt: number) {
    const p = this.player;

    // Movement input
    let moveX = 0;
    let moveY = 0;

    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveY -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveY += 1;

    // Mouse follow if mouse is active & held or moving
    if (this.isMouseDown && this.mousePos.x > 0 && this.mousePos.y > 0) {
      const dx = this.mousePos.x - p.x;
      const dy = this.mousePos.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 15) {
        moveX += (dx / dist) * 1.2;
        moveY += (dy / dist) * 1.2;
      }
    }

    // Normalize diagonal vector
    if (moveX !== 0 && moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      moveX /= len;
      moveY /= len;
    }

    // Inertia & velocity
    const targetVx = moveX * p.speed;
    const targetVy = moveY * p.speed;
    p.vx += (targetVx - p.vx) * 0.22;
    p.vy += (targetVy - p.vy) * 0.22;

    p.x += p.vx;
    p.y += p.vy;

    // Clamp to canvas borders
    const halfW = p.width / 2;
    const halfH = p.height / 2;
    p.x = Math.max(halfW, Math.min(this.width - halfW, p.x));
    p.y = Math.max(halfH, Math.min(this.height - halfH, p.y));

    // Slight banking tilt based on vx
    p.rotation = (p.vx / p.speed) * 0.25;

    // Shield recharge logic
    if (p.hasShieldUpgrade && p.shield < p.maxShield) {
      p.shieldRechargeTimer += dt;
      if (p.shieldRechargeTimer >= 4.0) {
        p.shield = Math.min(p.maxShield, p.shield + dt * 10);
      }
    }

    // Overcharge timer
    if (p.overchargeDuration > 0) {
      p.overchargeDuration -= dt;
    }

    // Invulnerability timer
    if (p.invulnerableTimer > 0) {
      p.invulnerableTimer -= dt;
    }

    // Thruster trail particles
    if (Math.random() < 0.6) {
      this.particles.push({
        x: p.x + (Math.random() - 0.5) * 12,
        y: p.y + halfH - 4,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 3 + Math.random() * 3,
        color: p.overchargeDuration > 0 ? '#ec4899' : '#38bdf8',
        radius: 2.2 + Math.random() * 2,
        alpha: 0.8,
        life: 0,
        maxLife: 0.25,
      });
    }

    // Firing logic
    p.fireCooldown -= dt * 1000;
    const shouldFire = this.autoFire || this.isMouseDown || this.keys['Space'];
    const currentInterval = p.overchargeDuration > 0 ? p.baseFireInterval * 0.45 : p.baseFireInterval;

    if (shouldFire && p.fireCooldown <= 0) {
      this.playerFire();
      p.fireCooldown = currentInterval;
    }

    // Drone logic
    if (p.hasDrone) {
      p.droneAngle += dt * 3.5;
      p.droneCooldown -= dt * 1000;
      if (p.droneCooldown <= 0 && this.enemies.length > 0) {
        this.droneFire();
        p.droneCooldown = 320;
      }
    }
  }

  private playerFire() {
    const p = this.player;
    this.stats.shotsFired++;
    const isCrit = Math.random() < p.critChance;
    const dmg = (14 * p.damageMultiplier) * (isCrit ? 2.5 : 1);

    sounds.laser(isCrit ? 'heavy' : 'light');

    if (p.weaponType === 'TRI_SPREAD') {
      const angles = [-0.18, 0, 0.18];
      for (const ang of angles) {
        this.bullets.push({
          id: this.nextEntityId++,
          x: p.x,
          y: p.y - 18,
          vx: Math.sin(ang) * p.bulletSpeed,
          vy: -Math.cos(ang) * p.bulletSpeed,
          radius: 3.5,
          damage: dmg,
          isPlayer: true,
          color: isCrit ? '#f59e0b' : '#38bdf8',
          pierceLeft: p.bulletPierce,
          isCrit,
        });
      }
    } else if (p.weaponType === 'RAIL_BEAM') {
      this.bullets.push({
        id: this.nextEntityId++,
        x: p.x,
        y: p.y - 20,
        vx: 0,
        vy: -p.bulletSpeed * 1.5,
        radius: 5,
        damage: dmg * 1.8,
        isPlayer: true,
        color: '#c084fc',
        pierceLeft: 3,
        isCrit,
      });
    } else {
      // DUAL PLASMA
      const offsets = [-8, 8];
      for (const off of offsets) {
        this.bullets.push({
          id: this.nextEntityId++,
          x: p.x + off,
          y: p.y - 14,
          vx: 0,
          vy: -p.bulletSpeed,
          radius: 3.2,
          damage: dmg,
          isPlayer: true,
          color: isCrit ? '#f59e0b' : '#38bdf8',
          pierceLeft: p.bulletPierce,
          isCrit,
        });
      }
    }

    // Micro-missile perk
    if (p.hasMissilePerk) {
      p.missileCounter++;
      if (p.missileCounter >= 3) {
        p.missileCounter = 0;
        this.spawnHomingMissile(p.x - 14, p.y);
        this.spawnHomingMissile(p.x + 14, p.y);
      }
    }
  }

  private spawnHomingMissile(x: number, y: number) {
    sounds.laser('missile');
    this.bullets.push({
      id: this.nextEntityId++,
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: -6,
      radius: 4,
      damage: 28 * this.player.damageMultiplier,
      isPlayer: true,
      color: '#fb923c',
      pierceLeft: 1,
      isHoming: true,
    });
  }

  private droneFire() {
    const p = this.player;
    const droneX = p.x + Math.cos(p.droneAngle) * 42;
    const droneY = p.y + Math.sin(p.droneAngle) * 42;

    // Find closest enemy
    let closestEnemy: Enemy | null = null;
    let minDist = 99999;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - droneX, e.y - droneY);
      if (d < minDist) {
        minDist = d;
        closestEnemy = e;
      }
    }

    if (closestEnemy) {
      const angle = Math.atan2(closestEnemy.y - droneY, closestEnemy.x - droneX);
      sounds.laser('light');
      this.bullets.push({
        id: this.nextEntityId++,
        x: droneX,
        y: droneY,
        vx: Math.cos(angle) * 11,
        vy: Math.sin(angle) * 11,
        radius: 3,
        damage: 12 * p.damageMultiplier,
        isPlayer: true,
        color: '#34d399',
        pierceLeft: 1,
      });
    }
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.behaviorTimer += dt;

      if (e.type === 'BOSS') {
        this.updateBoss(e, dt);
      } else {
        // Normal movement patterns
        if (e.type === 'SCOUT') {
          e.x += Math.sin(e.behaviorTimer * 3.5) * 3;
          e.y += e.vy;
        } else if (e.type === 'INTERCEPTOR') {
          // Dash aggressively toward player X
          const diffX = this.player.x - e.x;
          e.x += Math.sign(diffX) * Math.min(Math.abs(diffX), 2.2);
          e.y += e.vy;
        } else if (e.type === 'SWARMER') {
          e.y += e.vy;
          e.x += Math.cos(e.behaviorTimer * 4) * 2;
        } else if (e.type === 'HEAVY') {
          e.y += e.vy * 0.7;
          e.x += Math.sin(e.behaviorTimer * 1.5) * 1.2;
        }

        // Enemy shooting
        e.shootCooldown -= dt * 1000;
        if (e.shootCooldown <= 0 && e.y > 40 && e.y < this.height - 100) {
          this.enemyShoot(e);
          e.shootCooldown = e.shootInterval;
        }

        // Out of screen bottom
        if (e.y > this.height + 60) {
          this.enemies.splice(i, 1);
          continue;
        }
      }

      // Check collision with player
      const distToPlayer = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (distToPlayer < (e.width + this.player.width) / 2.6) {
        this.damagePlayer(e.type === 'BOSS' ? 35 : 20);
        if (e.type !== 'BOSS') {
          this.damageEnemy(e, 999);
        }
      }
    }
  }

  private updateBoss(boss: Enemy, dt: number) {
    // Settle into top arena
    if (boss.y < 110) {
      boss.y += boss.vy;
    } else {
      // Horizontal patrol
      boss.x += Math.sin(boss.behaviorTimer * 1.2) * 2.5;
    }

    boss.shootCooldown -= dt * 1000;
    if (boss.shootCooldown <= 0) {
      boss.shootCooldown = boss.shootInterval;
      sounds.laser('heavy');

      // Boss spread barrage
      const count = 7;
      for (let i = 0; i < count; i++) {
        const spreadAngle = -0.6 + (1.2 / (count - 1)) * i;
        this.bullets.push({
          id: this.nextEntityId++,
          x: boss.x,
          y: boss.y + boss.height / 2,
          vx: Math.sin(spreadAngle) * 5.2,
          vy: Math.cos(spreadAngle) * 5.2,
          radius: 4.5,
          damage: 18,
          isPlayer: false,
          color: '#fb7185',
          pierceLeft: 1,
        });
      }
    }
  }

  private enemyShoot(e: Enemy) {
    if (e.type === 'HEAVY') {
      // Dual heavy shot
      sounds.laser('heavy');
      for (const off of [-12, 12]) {
        this.bullets.push({
          id: this.nextEntityId++,
          x: e.x + off,
          y: e.y + e.height / 2,
          vx: 0,
          vy: 6.2,
          radius: 4,
          damage: 14,
          isPlayer: false,
          color: '#c084fc',
          pierceLeft: 1,
        });
      }
    } else {
      // Aimed shot towards player
      const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
      this.bullets.push({
        id: this.nextEntityId++,
        x: e.x,
        y: e.y + e.height / 2,
        vx: Math.cos(angle) * 5.5,
        vy: Math.sin(angle) * 5.5,
        radius: 3.5,
        damage: 10,
        isPlayer: false,
        color: '#fb7185',
        pierceLeft: 1,
      });
    }
  }

  private updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];

      // Homing logic for player missiles
      if (b.isHoming && this.enemies.length > 0) {
        let nearest: Enemy | null = null;
        let minD = 99999;
        for (const enemy of this.enemies) {
          const d = Math.hypot(enemy.x - b.x, enemy.y - b.y);
          if (d < minD) {
            minD = d;
            nearest = enemy;
          }
        }
        if (nearest) {
          const targetAng = Math.atan2(nearest.y - b.y, nearest.x - b.x);
          const currentAng = Math.atan2(b.vy, b.vx);
          const newAng = currentAng + (targetAng - currentAng) * 0.15;
          const spd = 9.5;
          b.vx = Math.cos(newAng) * spd;
          b.vy = Math.sin(newAng) * spd;
        }
      }

      b.x += b.vx;
      b.y += b.vy;

      // Particle smoke for missile
      if (b.isHoming && Math.random() < 0.5) {
        this.particles.push({
          x: b.x,
          y: b.y,
          vx: 0,
          vy: 0,
          color: '#fdba74',
          radius: 2,
          alpha: 0.6,
          life: 0,
          maxLife: 0.2,
        });
      }

      // Check bounds
      if (b.x < -20 || b.x > this.width + 20 || b.y < -30 || b.y > this.height + 30) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Player bullet collision with enemies
      if (b.isPlayer) {
        for (const enemy of this.enemies) {
          const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
          if (dist < b.radius + enemy.width / 2) {
            this.stats.shotsHit++;
            this.damageEnemy(enemy, b.damage, b.isCrit);
            b.pierceLeft--;
            if (b.pierceLeft <= 0) {
              this.bullets.splice(i, 1);
              break;
            }
          }
        }
      } else {
        // Hostile bullet collision with player
        const dist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
        if (dist < b.radius + this.player.width / 2.6) {
          this.damagePlayer(b.damage);
          this.bullets.splice(i, 1);
        }
      }
    }
  }

  private damageEnemy(enemy: Enemy, damage: number, isCrit = false) {
    enemy.hp -= damage;
    sounds.hit();

    // Floating combat text
    const text = isCrit ? `CRIT ${Math.round(damage)}!` : `${Math.round(damage)}`;
    this.spawnFloatingText(text, enemy.x + (Math.random() - 0.5) * 20, enemy.y - 10, isCrit ? '#f59e0b' : '#e2e8f0', isCrit ? 16 : 12);

    // Spark burst
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color: isCrit ? '#f59e0b' : enemy.color,
        radius: 1.8,
        alpha: 0.9,
        life: 0,
        maxLife: 0.25,
      });
    }

    if (enemy.hp <= 0) {
      this.destroyEnemy(enemy);
    }
  }

  private destroyEnemy(enemy: Enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }

    sounds.explosion(enemy.type === 'BOSS');
    this.screenShakeAmount = enemy.type === 'BOSS' ? 18 : 6;

    // Explosion fireworks
    const particleCount = enemy.type === 'BOSS' ? 60 : 18;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * (enemy.type === 'BOSS' ? 9 : 5);
      this.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.4 ? enemy.color : '#fde047',
        radius: 2 + Math.random() * 3,
        alpha: 1,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
        shape: Math.random() < 0.2 ? 'spark' : 'circle',
      });
    }

    // Shockwave ring
    this.particles.push({
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: 0,
      color: enemy.color,
      radius: 4,
      alpha: 1,
      life: 0,
      maxLife: 0.3,
      shape: 'ring',
    });

    // Combo system
    this.stats.kills++;
    this.stats.combo++;
    this.comboTimer = 3.5;
    if (this.stats.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.combo;
    }
    sounds.combo(this.stats.combo);

    const comboMult = 1 + Math.min(this.stats.combo, 20) * 0.1;
    const earnedScore = Math.round(enemy.scoreValue * comboMult);
    this.stats.score += earnedScore;

    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      localStorage.setItem('aether_vanguard_high_score', this.stats.score.toString());
    }

    // Drop loot or gems
    this.spawnLoot(enemy);
    this.emitStats();
  }

  private spawnLoot(enemy: Enemy) {
    // Score Gem always drops
    this.pickups.push({
      id: this.nextEntityId++,
      type: 'GEM',
      x: enemy.x,
      y: enemy.y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      radius: 5,
      color: '#38bdf8',
      value: 150,
      pulseTimer: 0,
    });

    const dropRoll = Math.random();
    if (dropRoll < 0.14) {
      // Repair kit
      this.pickups.push({
        id: this.nextEntityId++,
        type: 'REPAIR',
        x: enemy.x + 8,
        y: enemy.y,
        vx: 0,
        vy: 1,
        radius: 7,
        color: '#10b981',
        value: 30,
        pulseTimer: 0,
      });
    } else if (dropRoll < 0.24) {
      // Overcharge boost
      this.pickups.push({
        id: this.nextEntityId++,
        type: 'OVERCHARGE',
        x: enemy.x - 8,
        y: enemy.y,
        vx: 0,
        vy: 1,
        radius: 7,
        color: '#f59e0b',
        value: 6, // 6 seconds
        pulseTimer: 0,
      });
    } else if (enemy.type === 'BOSS' || (dropRoll < 0.28 && this.stats.bombsAvailable < this.stats.maxBombs)) {
      // Bomb charge
      this.pickups.push({
        id: this.nextEntityId++,
        type: 'BOMB',
        x: enemy.x,
        y: enemy.y - 10,
        vx: 0,
        vy: 1,
        radius: 8,
        color: '#38bdf8',
        value: 1,
        pulseTimer: 0,
      });
    }
  }

  private updatePickups(dt: number) {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const item = this.pickups[i];
      item.pulseTimer += dt * 4;

      // Magnetic pull toward player
      const dist = Math.hypot(p.x - item.x, p.y - item.y);
      if (dist < p.magnetRadius) {
        const pullSpeed = 9.0 * (1 - dist / p.magnetRadius) + 3;
        const ang = Math.atan2(p.y - item.y, p.x - item.x);
        item.x += Math.cos(ang) * pullSpeed;
        item.y += Math.sin(ang) * pullSpeed;
      } else {
        item.y += 1.2;
      }

      // Collect pickup
      if (dist < item.radius + p.width / 2.5) {
        this.collectPickup(item);
        this.pickups.splice(i, 1);
        continue;
      }

      // Offscreen
      if (item.y > this.height + 40) {
        this.pickups.splice(i, 1);
      }
    }
  }

  private collectPickup(item: Pickup) {
    sounds.powerup();

    if (item.type === 'GEM') {
      this.stats.score += item.value;
      this.spawnFloatingText(`+${item.value}`, item.x, item.y, '#38bdf8', 12);
    } else if (item.type === 'REPAIR') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.value);
      this.spawnFloatingText(`+${item.value} REPAIR`, item.x, item.y, '#10b981', 14);
    } else if (item.type === 'OVERCHARGE') {
      this.player.overchargeDuration = item.value;
      this.spawnFloatingText('HYPER OVERCHARGE', item.x, item.y, '#f59e0b', 16);
    } else if (item.type === 'BOMB') {
      this.stats.bombsAvailable = Math.min(this.stats.maxBombs, this.stats.bombsAvailable + 1);
      this.spawnFloatingText('+1 EMP BOMB', item.x, item.y, '#38bdf8', 15);
    }

    this.emitStats();
  }

  private damagePlayer(amount: number) {
    if (this.player.invulnerableTimer > 0) return;
    sounds.playerHurt();
    this.screenShakeAmount = 14;
    this.player.invulnerableTimer = 0.8;
    this.player.shieldRechargeTimer = 0;

    // Absorb with shield first
    if (this.player.shield > 0) {
      if (this.player.shield >= amount) {
        this.player.shield -= amount;
        this.spawnFloatingText('SHIELD DEFLECT', this.player.x, this.player.y - 25, '#38bdf8', 13);
        return;
      } else {
        amount -= this.player.shield;
        this.player.shield = 0;
        this.spawnFloatingText('SHIELD BROKEN', this.player.x, this.player.y - 25, '#f43f5e', 14);
      }
    }

    this.player.hp -= amount;
    this.spawnFloatingText(`-${Math.round(amount)} HULL`, this.player.x, this.player.y - 25, '#f43f5e', 14);

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.handleGameOver();
    }

    this.emitStats();
  }

  private handleGameOver() {
    sounds.explosion(true);
    this.setState('GAME_OVER');
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = 1 - p.life / p.maxLife;
      if (p.shape === 'ring') {
        p.radius += dt * 90;
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= dt * 30;
      ft.alpha -= dt * 1.5;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private spawnFloatingText(text: string, x: number, y: number, color: string, size = 14) {
    this.floatingTexts.push({
      id: this.nextEntityId++,
      text,
      x,
      y,
      color,
      alpha: 1.0,
      size,
    });
  }

  private emitStats() {
    if (this.stats.shotsFired > 0) {
      this.stats.accuracy = Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100);
    }
    if (this.onStatsChange) {
      this.onStatsChange({ ...this.stats });
    }
  }

  // ------------------ RENDERING ------------------

  private render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen Shake
    if (this.screenShakeAmount > 0) {
      const sx = (Math.random() - 0.5) * this.screenShakeAmount;
      const sy = (Math.random() - 0.5) * this.screenShakeAmount;
      ctx.translate(sx, sy);
    }

    // Deep space backdrop
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, this.width, this.height);

    // Cosmic Nebula Glow
    const gradient = ctx.createRadialGradient(
      this.width * 0.3,
      this.height * 0.4,
      50,
      this.width * 0.3,
      this.height * 0.4,
      this.width * 0.7
    );
    gradient.addColorStop(0, 'rgba(30, 58, 138, 0.18)');
    gradient.addColorStop(0.5, 'rgba(88, 28, 135, 0.12)');
    gradient.addColorStop(1, 'rgba(3, 7, 18, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Stars
    for (const star of this.stars) {
      ctx.fillStyle = star.color;
      ctx.globalAlpha = star.alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Render Pickups
    for (const item of this.pickups) {
      this.renderPickup(item);
    }

    // Render Enemies
    for (const enemy of this.enemies) {
      this.renderEnemy(enemy);
    }

    // Render Player
    if (this.state === 'PLAYING' || this.state === 'PERK_SELECTION' || this.state === 'PAUSED') {
      this.renderPlayer();
    }

    // Render Bullets
    for (const b of this.bullets) {
      this.renderBullet(b);
    }

    // Render Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.shape === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Floating text
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${ft.size}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // EMP Bomb Flash Overlay
    if (this.bombFlashAlpha > 0) {
      ctx.fillStyle = `rgba(56, 189, 248, ${this.bombFlashAlpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Wave Banner
    if (this.waveBannerTimer > 0) {
      this.renderWaveBanner();
    }

    // In-Canvas Top Boss Health Bar (if boss present)
    if (this.bossRef && this.enemies.includes(this.bossRef)) {
      this.renderBossHealthBar(this.bossRef);
    }

    ctx.restore();
  }

  private renderPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    // Invulnerability blink
    if (p.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Shield bubble
    if (p.shield > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, p.width * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Space Interceptor Craft (vector stylized sleek fighter)
    // Wings
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = p.overchargeDuration > 0 ? '#ec4899' : '#38bdf8';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(0, -p.height / 2); // Nose tip
    ctx.lineTo(p.width / 2, p.height / 2 - 4); // Right wing
    ctx.lineTo(p.width / 4, p.height / 2); // Right thruster notch
    ctx.lineTo(0, p.height / 2 - 8); // Engine centerline
    ctx.lineTo(-p.width / 4, p.height / 2); // Left thruster notch
    ctx.lineTo(-p.width / 2, p.height / 2 - 4); // Left wing
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit Canopy
    ctx.fillStyle = p.overchargeDuration > 0 ? '#f472b6' : '#67e8f9';
    ctx.beginPath();
    ctx.ellipse(0, -4, 4, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wingtip energy accents
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-p.width / 2, p.height / 4, 3, 6);
    ctx.fillRect(p.width / 2 - 3, p.height / 4, 3, 6);

    ctx.restore();

    // Render Auxiliary Drone
    if (p.hasDrone) {
      ctx.save();
      const droneX = p.x + Math.cos(p.droneAngle) * 42;
      const droneY = p.y + Math.sin(p.droneAngle) * 42;
      ctx.translate(droneX, droneY);
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderEnemy(e: Enemy) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(e.x, e.y);

    if (e.type === 'BOSS') {
      // Boss Dreadnought
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(-e.width / 2, -e.height / 3);
      ctx.lineTo(-e.width / 3, -e.height / 2);
      ctx.lineTo(e.width / 3, -e.height / 2);
      ctx.lineTo(e.width / 2, -e.height / 3);
      ctx.lineTo(e.width / 2.5, e.height / 2);
      ctx.lineTo(0, e.height / 2 + 10);
      ctx.lineTo(-e.width / 2.5, e.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Core glowing reactor
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, 0, 16 + Math.sin(e.behaviorTimer * 5) * 3, 0, Math.PI * 2);
      ctx.fill();

      // Turret cannons
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-35, e.height / 3, 8, 14);
      ctx.fillRect(27, e.height / 3, 8, 14);
    } else if (e.type === 'INTERCEPTOR') {
      // Sleek crimson dart
      ctx.fillStyle = '#450a0a';
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, e.height / 2);
      ctx.lineTo(-e.width / 2, -e.height / 2);
      ctx.lineTo(0, -e.height / 3);
      ctx.lineTo(e.width / 2, -e.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (e.type === 'HEAVY') {
      // Bulky Cruiser
      ctx.fillStyle = '#3b0764';
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(-e.width / 2, -e.height / 2, e.width, e.height);
      ctx.fill();
      ctx.stroke();

      // Armor plating slits
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(-12, -e.height / 4, 24, 4);
    } else if (e.type === 'SWARMER') {
      // Small swift triangle
      ctx.fillStyle = '#451a03';
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, e.height / 2);
      ctx.lineTo(-e.width / 2, -e.height / 2);
      ctx.lineTo(e.width / 2, -e.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // SCOUT: Diamond interceptor
      ctx.fillStyle = '#082f49';
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, e.height / 2);
      ctx.lineTo(-e.width / 2, 0);
      ctx.lineTo(0, -e.height / 2);
      ctx.lineTo(e.width / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Mini health bar for multi-hit enemies
    if (e.hp < e.maxHp && e.type !== 'BOSS') {
      const barW = e.width;
      const barH = 3;
      const hpPct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(-barW / 2, -e.height / 2 - 8, barW, barH);
      ctx.fillStyle = hpPct > 0.4 ? '#22c55e' : '#ef4444';
      ctx.fillRect(-barW / 2, -e.height / 2 - 8, barW * hpPct, barH);
    }

    ctx.restore();
  }

  private renderBullet(b: Bullet) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = b.isCrit ? 12 : 6;

    if (b.isPlayer && !b.isHoming) {
      // Laser bolt streak
      const length = b.radius * 3.5;
      ctx.fillRect(b.x - b.radius, b.y - length, b.radius * 2, length);
    } else {
      // Orb projectile
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderPickup(item: Pickup) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.shadowColor = item.color;
    ctx.shadowBlur = 8;

    const scale = 1 + Math.sin(item.pulseTimer) * 0.15;
    ctx.scale(scale, scale);

    if (item.type === 'GEM') {
      // Diamond Energy Core
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.moveTo(0, -item.radius);
      ctx.lineTo(item.radius, 0);
      ctx.lineTo(0, item.radius);
      ctx.lineTo(-item.radius, 0);
      ctx.closePath();
      ctx.fill();
    } else if (item.type === 'REPAIR') {
      // Cross medic kit
      ctx.fillStyle = item.color;
      ctx.fillRect(-item.radius, -2.5, item.radius * 2, 5);
      ctx.fillRect(-2.5, -item.radius, 5, item.radius * 2);
    } else if (item.type === 'OVERCHARGE') {
      // Star Overcharge
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === 'BOMB') {
      // Sphere with pulsing ring
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderWaveBanner() {
    const ctx = this.ctx;
    ctx.save();
    const alpha = Math.min(1, this.waveBannerTimer);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, this.height * 0.38, this.width, 54);

    ctx.fillStyle = this.isBossWave ? '#f43f5e' : '#38bdf8';
    ctx.font = `bold 20px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.waveBannerText, this.width / 2, this.height * 0.38 + 27);
    ctx.restore();
  }

  private renderBossHealthBar(boss: Enemy) {
    const ctx = this.ctx;
    ctx.save();
    const barW = Math.min(420, this.width - 60);
    const barH = 12;
    const x = (this.width - barW) / 2;
    const y = 56;
    const pct = Math.max(0, boss.hp / boss.maxHp);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(x - 2, y - 2, barW + 4, barH + 4);

    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(x, y, barW * pct, barH);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeRect(x, y, barW, barH);

    ctx.font = `bold 11px 'Outfit', sans-serif`;
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(`TITAN CLASS HARBINGER · ${Math.round(pct * 100)}%`, this.width / 2, y + barH + 14);

    ctx.restore();
  }

  public destroy() {
    this.running = false;
    cancelAnimationFrame(this.animId);
  }
}
