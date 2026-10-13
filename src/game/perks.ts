import { Perk } from './types';

export const ALL_PERKS: Perk[] = [
  {
    id: 'rapid_fire',
    name: 'Overclocked Emitters',
    description: 'Increases weapon fire rate by +30%.',
    category: 'OFFENSE',
    tier: 'COMMON',
    icon: '⚡',
  },
  {
    id: 'heavy_plasma',
    name: 'High-Density Cores',
    description: 'Increases bullet damage by +35%.',
    category: 'OFFENSE',
    tier: 'COMMON',
    icon: '💥',
  },
  {
    id: 'tri_spread',
    name: 'Tri-Spread Array',
    description: 'Converts primary weapons to a wide 3-way spread pattern.',
    category: 'OFFENSE',
    tier: 'RARE',
    icon: '🔱',
  },
  {
    id: 'rail_beam',
    name: 'Hyper-Railgun',
    description: 'Charges hyper-velocity beams that pierce clean through up to 3 targets.',
    category: 'OFFENSE',
    tier: 'RARE',
    icon: '🎯',
  },
  {
    id: 'homing_pods',
    name: 'Seeker Micro-Missiles',
    description: 'Fires tracking homing missiles on every third salvo.',
    category: 'OFFENSE',
    tier: 'RARE',
    icon: '🚀',
  },
  {
    id: 'auxiliary_drone',
    name: 'Autonomous Combat Drone',
    description: 'Deploys an automated support drone that orbits your vessel and fires at hostiles.',
    category: 'TACTICAL',
    tier: 'RARE',
    icon: '🛸',
  },
  {
    id: 'kinetic_shield',
    name: 'Aegis Shield Matrix',
    description: 'Installs an energy shield with +50 max capacity that regenerates when avoiding damage.',
    category: 'DEFENSE',
    tier: 'RARE',
    icon: '🛡️',
  },
  {
    id: 'reinforced_plating',
    name: 'Titanium Nanite Armor',
    description: '+40 Maximum Hull and immediately repairs 40 HP.',
    category: 'DEFENSE',
    tier: 'COMMON',
    icon: '🔧',
  },
  {
    id: 'magnetic_graviton',
    name: 'Graviton Harvester',
    description: 'Increases pickup attraction radius by 250% to vacuum score gems and powerups.',
    category: 'UTILITY',
    tier: 'COMMON',
    icon: '🧲',
  },
  {
    id: 'crit_matrix',
    name: 'Hyper-Harmonic Matrix',
    description: '+25% Critical strike chance, dealing 2.5x devastating damage.',
    category: 'OFFENSE',
    tier: 'RARE',
    icon: '✨',
  },
  {
    id: 'super_emp',
    name: 'Singularity Overdrive',
    description: '+2 EMP Nuke Bombs. Bombs now clear all incoming hostile projectiles.',
    category: 'TACTICAL',
    tier: 'LEGENDARY',
    icon: '💣',
  },
  {
    id: 'aerodynamic_afterburners',
    name: 'Ion Afterburners',
    description: '+25% Ship acceleration and top maneuvering speed.',
    category: 'UTILITY',
    tier: 'COMMON',
    icon: '💨',
  },
];

export function getRandomPerks(count = 3, existingPerkIds: string[] = []): Perk[] {
  // Filter out single-tier weapons if already chosen, or allow stacking
  const pool = ALL_PERKS.filter(
    (p) => !(p.id === 'tri_spread' && existingPerkIds.includes('tri_spread')) &&
           !(p.id === 'rail_beam' && existingPerkIds.includes('rail_beam')) &&
           !(p.id === 'auxiliary_drone' && existingPerkIds.includes('auxiliary_drone')) &&
           !(p.id === 'kinetic_shield' && existingPerkIds.includes('kinetic_shield'))
  );

  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
