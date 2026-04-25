import FootballPitch from './FootballPitch'
import RugbyPitch from './RugbyPitch'
import HockeyPitch from './HockeyPitch'
import NetballCourt from './NetballCourt'
import CricketField from './CricketField'

const PITCH_COMPONENTS = {
  football: FootballPitch,
  rugby: RugbyPitch,
  hockey: HockeyPitch,
  netball: NetballCourt,
  cricket: CricketField,
}

// Background gradients per sport
export const PITCH_BACKGROUNDS = {
  football: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%), linear-gradient(to bottom, #15803d 0%, #16a34a 15%, #22c55e 30%, #16a34a 45%, #22c55e 55%, #16a34a 70%, #22c55e 85%, #15803d 100%)`,
  rugby: `linear-gradient(to bottom, #14532d 0%, #166534 20%, #15803d 45%, #166534 55%, #15803d 80%, #14532d 100%)`,
  hockey: `linear-gradient(to bottom, #0c4a6e 0%, #0369a1 20%, #0284c7 50%, #0369a1 80%, #0c4a6e 100%)`,
  netball: `linear-gradient(to bottom, #1e1b4b 0%, #2e1065 30%, #1e1b4b 100%)`,
  cricket: `linear-gradient(to bottom, #14532d 0%, #16a34a 40%, #15803d 60%, #14532d 100%)`,
}

// Aspect ratios per sport
export const PITCH_ASPECT_RATIOS = {
  football: '3/4',
  rugby: '3/4',
  hockey: '3/4',
  netball: '5/8',
  cricket: '1/1',
}

export default function PitchRenderer({ sport = 'football', teamFormat, children }) {
  const Component = PITCH_COMPONENTS[sport] || FootballPitch
  const bg = PITCH_BACKGROUNDS[sport] || PITCH_BACKGROUNDS.football
  const aspect = PITCH_ASPECT_RATIOS[sport] || '3/4'

  return { Component, bg, aspect }
}
