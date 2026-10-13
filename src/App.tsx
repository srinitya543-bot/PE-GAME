import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Bomb,
  Shield,
  Zap,
  Crosshair,
  Trophy,
  HelpCircle,
  Sparkles,
  Award,
  ChevronRight,
  Maximize2,
  X
} from 'lucide-react';
import { GameEngine } from './game/GameEngine';
import { GameState, Perk, PlayerStats } from './game/types';
import { getRandomPerks } from './game/perks';
import { sounds } from './audio/soundFX';

// Generated assets
import coverArtImg from './assets/images/game_cover_art_1791819912200.jpg';
import pilotBadgeImg from './assets/images/game_pilot_badge_1791819935626.jpg';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // React state reflecting engine
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [stats, setStats] = useState<PlayerStats>({
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
  });

  const [hullHp, setHullHp] = useState(100);
  const [hullMaxHp, setHullMaxHp] = useState(100);
  const [shieldHp, setShieldHp] = useState(0);
  const [shieldMaxHp, setShieldMaxHp] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [autoFire, setAutoFire] = useState(true);

  // Perks draft
  const [offeredPerks, setOfferedPerks] = useState<Perk[]>([]);
  const [chosenPerkIds, setChosenPerkIds] = useState<string[]>([]);

  // Navigation Modals
  const [activeModal, setActiveModal] = useState<'RULES' | 'ARMORY' | 'RECORDS' | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    engine.onStateChange = (newState) => {
      setGameState(newState);
    };

    engine.onStatsChange = (newStats) => {
      setStats(newStats);
      if (engine.player) {
        setHullHp(Math.max(0, Math.round(engine.player.hp)));
        setHullMaxHp(engine.player.maxHp);
        setShieldHp(Math.max(0, Math.round(engine.player.shield)));
        setShieldMaxHp(engine.player.maxShield);
      }
    };

    engine.onPerkTrigger = () => {
      const perks = getRandomPerks(3, chosenPerkIds);
      setOfferedPerks(perks);
    };

    // Resize observer for responsive layout
    const handleResize = () => {
      engine.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
    };
  }, []);

  const handleStartGame = () => {
    if (!engineRef.current) return;
    engineRef.current.autoFire = autoFire;
    engineRef.current.startGame();
    setChosenPerkIds([]);
  };

  const handlePauseToggle = () => {
    if (!engineRef.current) return;
    if (gameState === 'PLAYING') {
      engineRef.current.pauseGame();
    } else if (gameState === 'PAUSED') {
      engineRef.current.resumeGame();
    }
  };

  const handleRestart = () => {
    if (!engineRef.current) return;
    engineRef.current.restartGame();
    setChosenPerkIds([]);
  };

  const handleTriggerBomb = () => {
    if (!engineRef.current) return;
    engineRef.current.triggerSuperBomb();
  };

  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    if (engineRef.current) {
      // synced
    }
  };

  const handleSelectPerk = (perk: Perk) => {
    if (!engineRef.current) return;
    setChosenPerkIds((prev) => [...prev, perk.id]);
    engineRef.current.applyPerk(perk.id);
  };

  const handleToggleAutoFire = () => {
    const nextVal = !autoFire;
    setAutoFire(nextVal);
    if (engineRef.current) {
      engineRef.current.autoFire = nextVal;
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* 3-ZONE TOP BAR CONTRACT */}
      <header className="h-14 shrink-0 flex items-center justify-between gap-8 px-6 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 z-40">
        {/* Zone 1: Single Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-display font-extrabold text-lg tracking-wider text-sky-400 uppercase">
            Aether Vanguard
          </span>
        </div>

        {/* Zone 2: 4-5 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveModal('RULES')}
            className="hover:text-sky-300 transition-colors whitespace-nowrap shrink-0"
          >
            Flight Manual
          </button>
          <button
            onClick={() => setActiveModal('ARMORY')}
            className="hover:text-sky-300 transition-colors whitespace-nowrap shrink-0"
          >
            Tactical Armory
          </button>
          <button
            onClick={() => setActiveModal('RECORDS')}
            className="hover:text-sky-300 transition-colors whitespace-nowrap shrink-0"
          >
            Pilot Records
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap shrink-0">
            <span>High Score</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-300 font-semibold">
              {stats.highScore.toLocaleString()}
            </span>
          </div>
        </nav>

        {/* Zone 3: 1 Primary Action button / state controller */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>

          {gameState === 'PLAYING' && (
            <button
              onClick={handlePauseToggle}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          {gameState === 'PAUSED' && (
            <button
              onClick={handlePauseToggle}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
          )}

          {gameState === 'TITLE_MENU' && (
            <button
              onClick={handleStartGame}
              className="px-4 py-1.5 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              Launch Interceptor
            </button>
          )}
        </div>
      </header>

      {/* GAME CANVAS WORKSPACE */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block cursor-crosshair touch-none" />

        {/* IN-GAME HUD (Rendered when PLAYING or PAUSED) */}
        {(gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'PERK_SELECTION') && (
          <div className="absolute top-4 inset-x-4 md:inset-x-8 flex items-start justify-between pointer-events-none z-10">
            {/* Left: Hull & Shield Gauges */}
            <div className="flex flex-col gap-2 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 backdrop-blur-sm pointer-events-auto min-w-[190px]">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>HULL INTEGRITY</span>
                  <span className="font-mono tabular-nums">
                    {hullHp}/{hullMaxHp}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      hullHp / hullMaxHp > 0.4 ? 'bg-sky-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.max(0, (hullHp / hullMaxHp) * 100)}%` }}
                  />
                </div>
              </div>

              {shieldMaxHp > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-medium text-sky-300 mb-1">
                    <span>AEGIS SHIELD</span>
                    <span className="font-mono tabular-nums">
                      {shieldHp}/{shieldMaxHp}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-150"
                      style={{ width: `${Math.max(0, (shieldHp / shieldMaxHp) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Super EMP Bombs available */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span className="text-[11px] text-slate-400">EMP CHARGES</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: stats.maxBombs }).map((_, i) => (
                    <button
                      key={i}
                      disabled={i >= stats.bombsAvailable}
                      onClick={handleTriggerBomb}
                      className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                        i < stats.bombsAvailable
                          ? 'bg-sky-500/20 border border-sky-400 text-sky-300 hover:bg-sky-500/40 cursor-pointer pointer-events-auto'
                          : 'bg-slate-900 border border-slate-800 text-slate-600'
                      }`}
                    >
                      <Bomb className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Center/Right: Wave, Score, Multipliers */}
            <div className="flex flex-col items-end gap-1.5 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 backdrop-blur-sm pointer-events-auto">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>SECTOR WAVE {stats.wave}</span>
                <span aria-hidden="true">·</span>
                <span>KILLS {stats.kills}</span>
              </div>
              <div className="font-display font-extrabold text-2xl tracking-tight text-white font-mono tabular-nums">
                {stats.score.toLocaleString()}
              </div>

              {stats.combo > 1 && (
                <div className="text-xs font-bold text-amber-400 tracking-wide animate-pulse">
                  COMBO x{stats.combo} ({(1 + Math.min(stats.combo, 20) * 0.1).toFixed(1)}x MULTIPLIER)
                </div>
              )}
            </div>
          </div>
        )}

        {/* MOBILE CONTROLS OVERLAY (VISIBLE ON TOUCH / MOBILE) */}
        {gameState === 'PLAYING' && (
          <div className="md:hidden absolute bottom-4 inset-x-4 flex justify-between pointer-events-none z-20">
            <div className="text-xs text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              Drag finger anywhere to steer & aim
            </div>
            <button
              onClick={handleTriggerBomb}
              disabled={stats.bombsAvailable === 0}
              className="pointer-events-auto px-4 py-2.5 bg-rose-600/90 active:bg-rose-500 disabled:opacity-40 text-white font-semibold text-xs rounded-lg flex items-center gap-2 shadow-lg"
            >
              <Bomb className="w-4 h-4" />
              <span>EMP NUKE ({stats.bombsAvailable})</span>
            </button>
          </div>
        )}

        {/* TITLE MENU OVERLAY */}
        {gameState === 'TITLE_MENU' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm z-30">
            <div className="max-w-3xl w-full bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
              {/* Cover Art Image */}
              <div className="relative md:w-1/2 min-h-[220px] bg-slate-950 flex items-center justify-center overflow-hidden">
                <img
                  src={coverArtImg}
                  alt="Aether Vanguard space combat interception"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-slate-900" />
                <div className="absolute bottom-3 left-4 flex items-center gap-2 text-xs text-slate-300 font-medium bg-slate-950/60 px-2 py-1 rounded backdrop-blur-sm">
                  <span>60 FPS Retro Arcade</span>
                  <span aria-hidden="true">·</span>
                  <span>Synthesized Audio</span>
                </div>
              </div>

              {/* Title & Briefing Info */}
              <div className="md:w-1/2 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-sky-400 font-semibold uppercase tracking-wider mb-1">
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Orbital Dogfight Simulator</span>
                  </div>
                  <h1 className="font-display font-black text-3xl tracking-tight text-white mb-2">
                    Aether Vanguard
                  </h1>
                  <p className="text-sm text-slate-300 leading-relaxed mb-4">
                    Hostile automated fleets have invaded the orbital perimeter. Pilot your advanced fighter, defeat
                    hostile waves, requisition tactical roguelite upgrades, and dismantle Titan-class dreadnoughts.
                  </p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-slate-200 font-medium">Controls:</span>
                      <span>[W, A, S, D] or [Arrow Keys] to maneuver</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-slate-200 font-medium">Mouse / Touch:</span>
                      <span>Cursor tracks ship position & auto-aims</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-slate-200 font-medium">EMP Bomb:</span>
                      <span>Press [Space] or [B] to vaporize incoming hostiles</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                    <span>Auto-Fire Weapons</span>
                    <button
                      onClick={handleToggleAutoFire}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        autoFire ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {autoFire ? 'Enabled (Default)' : 'Manual (Click / Space)'}
                    </button>
                  </div>

                  <button
                    onClick={handleStartGame}
                    className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm tracking-wide rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/20 active:scale-[0.99]"
                  >
                    <span>ENGAGE SECTOR MISSION</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ROGUELITE PERK SELECTION MODAL */}
        {gameState === 'PERK_SELECTION' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md z-30">
            <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
              <div className="text-center mb-6">
                <div className="text-xs font-semibold text-sky-400 tracking-wider uppercase mb-1">
                  SECTOR {stats.wave} SECURED
                </div>
                <h2 className="font-display font-extrabold text-2xl text-white">
                  Tactical Requisition Available
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Select one tactical upgrade to adapt your interceptor for incoming threat tiers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {offeredPerks.map((perk) => (
                  <button
                    key={perk.id}
                    onClick={() => handleSelectPerk(perk)}
                    className="flex flex-col text-left p-4 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/60 rounded-xl transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{perk.icon}</span>
                      <span
                        className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded ${
                          perk.tier === 'LEGENDARY'
                            ? 'text-amber-300 bg-amber-500/10'
                            : perk.tier === 'RARE'
                            ? 'text-sky-300 bg-sky-500/10'
                            : 'text-slate-300 bg-slate-800'
                        }`}
                      >
                        {perk.tier}
                      </span>
                    </div>
                    <div className="font-display font-bold text-sm text-slate-100 group-hover:text-sky-300 mb-1 transition-colors">
                      {perk.name}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed flex-1">
                      {perk.description}
                    </p>
                    <div className="mt-4 pt-2 border-t border-slate-800/60 text-[11px] text-sky-400 font-semibold flex items-center justify-between">
                      <span>Equip</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-center text-xs text-slate-500">
                Next Threat: Wave {stats.wave + 1} · Shields and hull integrity maintained
              </div>
            </div>
          </div>
        )}

        {/* PAUSED MODAL */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm z-30">
            <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-center">
              <h2 className="font-display font-bold text-2xl text-white mb-2">Mission Paused</h2>
              <div className="text-xs text-slate-400 mb-6">
                Current Wave: {stats.wave} · Score: {stats.score.toLocaleString()}
              </div>

              <div className="space-y-3">
                <button
                  onClick={handlePauseToggle}
                  className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume Mission</span>
                </button>
                <button
                  onClick={handleRestart}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart Sector</span>
                </button>
                <button
                  onClick={() => setGameState('TITLE_MENU')}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Return to Briefing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GAME OVER MODAL */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md z-30">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden border-2 border-rose-500/40 p-1">
                <img
                  src={pilotBadgeImg}
                  alt="Pilot Crest"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <div className="text-xs font-semibold text-rose-400 tracking-wider uppercase mb-1">
                VESSEL CRITICALLY DAMAGED
              </div>
              <h2 className="font-display font-black text-2xl text-white mb-4">
                Mission Terminated
              </h2>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-lg mb-6 text-left">
                <div>
                  <div className="text-[11px] text-slate-500">FINAL SCORE</div>
                  <div className="font-display font-bold text-lg text-white font-mono tabular-nums">
                    {stats.score.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">SECTORS SURVIVED</div>
                  <div className="font-display font-bold text-lg text-white font-mono tabular-nums">
                    Wave {stats.wave}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">HOSTILES ELIMINATED</div>
                  <div className="font-display font-bold text-lg text-sky-400 font-mono tabular-nums">
                    {stats.kills}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">FIRING ACCURACY</div>
                  <div className="font-display font-bold text-lg text-sky-400 font-mono tabular-nums">
                    {stats.accuracy}%
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleRestart}
                  className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>DEPLOY NEW RECON FLIGHT</span>
                </button>
                <button
                  onClick={() => setGameState('TITLE_MENU')}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Return to Main Menu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER BAR WITH STATUS, CONTROLS RECAP, AND HIGH SCORE */}
      <footer className="h-10 shrink-0 px-6 bg-slate-950/90 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500 z-40">
        <div className="flex items-center gap-4">
          <span>Controls: [W/A/S/D] Thrust · [Mouse/Touch] Aim · [Space] EMP Nuke</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Aether Vanguard Engine v1.0</span>
          <span aria-hidden="true">·</span>
          <span>Web Audio API Active</span>
        </div>
      </footer>

      {/* MODAL: FLIGHT MANUAL / RULES */}
      {activeModal === 'RULES' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-display font-bold text-lg text-white">Flight Manual & Combat Rules</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <div>
                <h4 className="font-semibold text-sky-400 mb-1">1. Maneuvers & Targeting</h4>
                <p className="text-xs text-slate-400">
                  Use WASD or Arrow Keys for precision vector control. Move your mouse or drag your touch finger
                  across the arena to lead shots. Auto-fire is engaged by default for seamless high-cadence arcade action.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sky-400 mb-1">2. Combos & Score Multipliers</h4>
                <p className="text-xs text-slate-400">
                  Eliminating hostiles within 3.5 seconds chains your combo meter. Every tier grants sound harmonic
                  chimes and multiplies your score acquisition up to 3x!
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sky-400 mb-1">3. Powerups & Salvage</h4>
                <p className="text-xs text-slate-400">
                  Destroyed vessels drop Energy Cores (+150 pts), Nanite Hull Repair kits (+30 HP), Overcharge Stars
                  (triple rapid-fire), and EMP Nuke charges. Graviton magnetic collectors pull them in automatically.
                </p>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
              >
                Close Manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TACTICAL ARMORY */}
      {activeModal === 'ARMORY' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 shrink-0">
              <h3 className="font-display font-bold text-lg text-white">Tactical Armory & Upgrades</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 text-xs">
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="text-xl">🔱</span>
                <div>
                  <div className="font-bold text-slate-100">Tri-Spread Array</div>
                  <div className="text-slate-400">Fans out 3 high-velocity plasma bolts simultaneously for massive crowd control.</div>
                </div>
              </div>
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="text-xl">🎯</span>
                <div>
                  <div className="font-bold text-slate-100">Hyper-Railgun</div>
                  <div className="text-slate-400">Charges hyper-velocity beams that pierce clean through up to 3 hostiles in a row.</div>
                </div>
              </div>
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="text-xl">🚀</span>
                <div>
                  <div className="font-bold text-slate-100">Seeker Micro-Missiles</div>
                  <div className="text-slate-400">Fires autonomous homing rockets on every third salvo that lock onto the closest enemy.</div>
                </div>
              </div>
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="text-xl">🛸</span>
                <div>
                  <div className="font-bold text-slate-100">Autonomous Combat Drone</div>
                  <div className="text-slate-400">Deploys an automated support drone that orbits your interceptor and auto-targets threats.</div>
                </div>
              </div>
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-start gap-3">
                <span className="text-xl">🛡️</span>
                <div>
                  <div className="font-bold text-slate-100">Aegis Shield Matrix</div>
                  <div className="text-slate-400">Installs a regenerating kinetic barrier that recharges when evading damage for 4 seconds.</div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
              >
                Close Armory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PILOT RECORDS */}
      {activeModal === 'RECORDS' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-display font-bold text-lg text-white">Pilot Flight Telemetry</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400">All-Time High Score</span>
                <span className="font-mono tabular-nums font-bold text-sky-400 text-base">
                  {stats.highScore.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400">Max Combo Streak</span>
                <span className="font-mono tabular-nums font-bold text-amber-400 text-base">
                  {stats.maxCombo > 0 ? `x${stats.maxCombo}` : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400">Total Hostiles Defeated</span>
                <span className="font-mono tabular-nums font-bold text-slate-200 text-base">
                  {stats.kills}
                </span>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
              >
                Close Telemetry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
