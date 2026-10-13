export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PERK_SELECTION' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export interface PlayerStats {
  score: number;
  highScore: number;
  wave: number;
  kills: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  shotsFired: number;
  shotsHit: number;
  bombsAvailable: number;
  maxBombs: number;
}

export interface Perk {
  id: string;
  name: string;
  description: string;
  category: 'OFFENSE' | 'DEFENSE' | 'UTILITY' | 'TACTICAL';
  tier: 'COMMON' | 'RARE' | 'LEGENDARY';
  icon: string;
}

export interface PlayerShip {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  width: number;
  height: number;
  maxHp: number;
  hp: number;
  maxShield: number;
  shield: number;
  shieldRechargeTimer: number;
  fireCooldown: number;
  baseFireInterval: number;
  damageMultiplier: number;
  speed: number;
  bulletSpeed: number;
  bulletPierce: number;
  critChance: number;
  weaponType: 'DUAL_PLASMA' | 'TRI_SPREAD' | 'RAIL_BEAM';
  hasDrone: boolean;
  droneAngle: number;
  droneCooldown: number;
  hasShieldUpgrade: boolean;
  hasMissilePerk: boolean;
  missileCounter: number;
  magnetRadius: number;
  invulnerableTimer: number;
  overchargeDuration: number;
}

export type EnemyType = 'SCOUT' | 'INTERCEPTOR' | 'HEAVY' | 'SWARMER' | 'BOSS';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  scoreValue: number;
  color: string;
  shootCooldown: number;
  shootInterval: number;
  behaviorTimer: number;
  angle: number;
  phase?: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  isPlayer: boolean;
  color: string;
  pierceLeft: number;
  isCrit?: boolean;
  isHoming?: boolean;
  homingTargetId?: number | null;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'spark' | 'ring';
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  size: number;
}

export type PickupType = 'GEM' | 'REPAIR' | 'OVERCHARGE' | 'BOMB';

export interface Pickup {
  id: number;
  type: PickupType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  value: number;
  pulseTimer: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  color: string;
}
