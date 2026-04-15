/**
 * Sport-specific taxonomy for video analysis clips, AI capabilities, and observation categories.
 *
 * Each sport defines:
 *  - clipCategories: tag types when a coach creates a manual clip
 *  - observationCategories: AI segment/synthesis observation buckets
 *  - capabilities: the core performance capabilities evaluated per pupil (replaces FA Core Capabilities for non-football)
 *  - capabilityScale: rating labels used for capabilities
 *  - positionGroups: position-specific evaluation guidance for the AI prompt
 *  - terminology: sport-specific word map so AI prompts use correct language
 */

export const SPORTS = ['football', 'rugby', 'cricket', 'hockey', 'netball']

// ─── Clip categories (manual tagging by coaches) ──────────────────────────

const COMMON_CATEGORIES = [
  { value: 'general', label: 'General', color: 'navy' },
  { value: 'highlight', label: 'Highlight', color: 'pitch' },
  { value: 'coaching_point', label: 'Coaching Point', color: 'energy' },
  { value: 'mistake', label: 'Learning Moment', color: 'caution' },
]

export const CLIP_CATEGORIES = {
  football: [
    ...COMMON_CATEGORIES,
    { value: 'goal', label: 'Goal', color: 'pitch' },
    { value: 'assist', label: 'Assist', color: 'pitch' },
    { value: 'save', label: 'Save', color: 'alert' },
    { value: 'set_piece', label: 'Set Piece', color: 'alert' },
    { value: 'tackle', label: 'Tackle', color: 'navy' },
    { value: 'dribble', label: 'Dribble', color: 'energy' },
    { value: 'through_ball', label: 'Through Ball', color: 'energy' },
  ],
  rugby: [
    ...COMMON_CATEGORIES,
    { value: 'try', label: 'Try', color: 'pitch' },
    { value: 'conversion', label: 'Conversion', color: 'pitch' },
    { value: 'penalty_kick', label: 'Penalty Kick', color: 'alert' },
    { value: 'tackle', label: 'Tackle', color: 'navy' },
    { value: 'lineout', label: 'Lineout', color: 'alert' },
    { value: 'scrum', label: 'Scrum', color: 'alert' },
    { value: 'ruck', label: 'Ruck', color: 'navy' },
    { value: 'maul', label: 'Maul', color: 'navy' },
    { value: 'kick', label: 'Kick', color: 'energy' },
    { value: 'turnover', label: 'Turnover', color: 'energy' },
    { value: 'line_break', label: 'Line Break', color: 'pitch' },
  ],
  cricket: [
    ...COMMON_CATEGORIES,
    { value: 'wicket', label: 'Wicket', color: 'pitch' },
    { value: 'boundary', label: 'Boundary', color: 'pitch' },
    { value: 'catch', label: 'Catch', color: 'energy' },
    { value: 'run_out', label: 'Run Out', color: 'alert' },
    { value: 'bowling', label: 'Bowling', color: 'navy' },
    { value: 'batting_shot', label: 'Batting Shot', color: 'energy' },
    { value: 'fielding', label: 'Fielding', color: 'navy' },
    { value: 'partnership', label: 'Partnership', color: 'pitch' },
  ],
  hockey: [
    ...COMMON_CATEGORIES,
    { value: 'goal', label: 'Goal', color: 'pitch' },
    { value: 'assist', label: 'Assist', color: 'pitch' },
    { value: 'save', label: 'Save', color: 'alert' },
    { value: 'short_corner', label: 'Short Corner', color: 'alert' },
    { value: 'penalty_corner', label: 'Penalty Corner', color: 'alert' },
    { value: 'tackle', label: 'Tackle', color: 'navy' },
    { value: 'dribble', label: 'Dribble', color: 'energy' },
    { value: 'aerial', label: 'Aerial', color: 'energy' },
  ],
  netball: [
    ...COMMON_CATEGORIES,
    { value: 'goal', label: 'Goal', color: 'pitch' },
    { value: 'interception', label: 'Interception', color: 'energy' },
    { value: 'centre_pass', label: 'Centre Pass', color: 'navy' },
    { value: 'shooting', label: 'Shooting', color: 'pitch' },
    { value: 'defence', label: 'Defence', color: 'alert' },
    { value: 'turnover', label: 'Turnover', color: 'energy' },
    { value: 'rebound', label: 'Rebound', color: 'navy' },
  ],
}

// ─── AI observation categories ────────────────────────────────────────────

export const OBSERVATION_CATEGORIES = {
  football: ['formation', 'attack', 'defence', 'transition', 'set_piece'],
  rugby: ['attack', 'defence', 'set_piece', 'breakdown', 'kicking', 'transition'],
  cricket: ['batting', 'bowling', 'fielding', 'captaincy', 'partnership'],
  hockey: ['attack', 'defence', 'set_piece', 'transition', 'pressing'],
  netball: ['attack', 'defence', 'centre_pass', 'shooting', 'transition'],
}

// ─── Core capabilities per sport ──────────────────────────────────────────

export const CAPABILITIES = {
  football: {
    label: 'FA Core Capabilities',
    items: [
      { key: 'scanning', label: 'Scanning', description: 'Looking around before receiving — aware of options and dangers' },
      { key: 'timing', label: 'Timing', description: 'Choosing the right moment to pass, tackle, or make a run' },
      { key: 'movement', label: 'Movement', description: 'Movement on and off the ball — body shape, runs, shielding' },
      { key: 'positioning', label: 'Positioning', description: 'Pitch placement and body orientation' },
      { key: 'deception', label: 'Deception', description: 'Feints, disguised passes, changes of direction' },
      { key: 'techniques', label: 'Techniques', description: 'Core technical actions — passing, shooting, tackling, first touch' },
    ],
  },
  rugby: {
    label: 'Rugby Core Skills',
    items: [
      { key: 'ball_handling', label: 'Ball Handling', description: 'Catching, passing accuracy, offloads under pressure' },
      { key: 'tackling', label: 'Tackling', description: 'Tackle technique, timing, and effectiveness' },
      { key: 'decision_making', label: 'Decision Making', description: 'Reading the game, choosing when to pass/carry/kick' },
      { key: 'positioning', label: 'Positioning', description: 'Defensive line speed, alignment in attack, support lines' },
      { key: 'communication', label: 'Communication', description: 'Organising defence, calling plays, directing teammates' },
      { key: 'set_piece', label: 'Set Piece', description: 'Lineout, scrum, and restart execution' },
      { key: 'work_rate', label: 'Work Rate', description: 'Effort off the ball, getting back onside, support play' },
    ],
  },
  cricket: {
    label: 'Cricket Core Skills',
    items: [
      { key: 'batting_technique', label: 'Batting Technique', description: 'Stance, footwork, shot selection, and execution' },
      { key: 'bowling_technique', label: 'Bowling Technique', description: 'Action, accuracy, variation, and consistency' },
      { key: 'fielding', label: 'Fielding', description: 'Ground fielding, catching, throwing accuracy' },
      { key: 'decision_making', label: 'Decision Making', description: 'Shot selection, bowling changes, field placement' },
      { key: 'game_awareness', label: 'Game Awareness', description: 'Reading the match situation, adapting approach' },
      { key: 'temperament', label: 'Temperament', description: 'Composure under pressure, concentration, resilience' },
    ],
  },
  hockey: {
    label: 'Hockey Core Skills',
    items: [
      { key: 'stick_skills', label: 'Stick Skills', description: 'Dribbling, trapping, receiving, and ball control' },
      { key: 'positioning', label: 'Positioning', description: 'Pitch awareness, spacing, and defensive shape' },
      { key: 'passing', label: 'Passing', description: 'Accuracy, weight, and timing of passes' },
      { key: 'tackling', label: 'Tackling', description: 'Jab tackle, block tackle, channelling' },
      { key: 'movement', label: 'Movement', description: 'Leading, creating space, support runs' },
      { key: 'game_awareness', label: 'Game Awareness', description: 'Reading play, anticipation, decision-making' },
    ],
  },
  netball: {
    label: 'Netball Core Skills',
    items: [
      { key: 'shooting', label: 'Shooting', description: 'Accuracy, technique, composure in the circle' },
      { key: 'footwork', label: 'Footwork', description: 'Landing, pivoting, and the footwork rule' },
      { key: 'passing', label: 'Passing', description: 'Accuracy, variety, speed, and decision-making' },
      { key: 'defending', label: 'Defending', description: 'Marking, interceptions, 3-foot rule compliance' },
      { key: 'court_awareness', label: 'Court Awareness', description: 'Spatial awareness, timing of leads, reading play' },
      { key: 'timing', label: 'Timing', description: 'Movement timing, drives onto the ball, dodges' },
    ],
  },
}

export const CAPABILITY_SCALE = ['Excellent', 'Very Good', 'Good', 'Developing', 'Needs Work']

// ─── Position groups for AI evaluation guidance ───────────────────────────

export const POSITION_GUIDANCE = {
  football: {
    goalkeeper: {
      positions: ['GK'],
      guidance: `GOALKEEPER:
- Do NOT assume the GK "had a quiet match" or "was rarely tested" unless you have clear evidence. In school football, goalkeepers are usually busy.
- Evaluate: shot-stopping, distribution (goal kicks, throws), communication with defenders, positioning for crosses, sweeping, bravery in 1v1s.
- If goals were conceded, assess whether the GK could have done better. If not conceded, the GK likely played a significant part.
- A busy GK who makes several saves deserves a HIGH rating (8+).`,
    },
    defenders: {
      positions: ['CB', 'LCB', 'RCB', 'LB', 'RB', 'LWB', 'RWB'],
      guidance: `DEFENDERS:
- Defenders who rarely appear in highlights may be performing EXCELLENTLY — keeping things quiet.
- Assess: did they push forward? Contribute to build-up? Fullbacks who get forward and create chances should be rewarded.
- A defender who is solid AND dangerous going forward deserves a higher rating.`,
    },
    midfield: {
      positions: ['CM', 'CDM', 'CAM', 'LM', 'RM', 'LW', 'RW'],
      guidance: `MIDFIELDERS & ATTACKERS:
- Evaluate based on specific role — a holding midfielder shields the defence, an attacking midfielder creates chances.
- Goals and assists are NOT the only way to stand out — controlling tempo or winning the ball back repeatedly is equally valuable.`,
    },
  },
  rugby: {
    forwards: {
      positions: ['Prop', 'Hooker', 'Lock', 'Flanker', 'Number 8'],
      guidance: `FORWARDS:
- Evaluate: scrummaging, lineout work, carrying in tight, tackling, breakdown work, and work rate.
- Forwards who make lots of tackles and carry hard but don't score tries can still have excellent matches.
- Assess contribution at the breakdown — securing or contesting rucks.`,
    },
    backs: {
      positions: ['Scrum Half', 'Fly Half', 'Centre', 'Wing', 'Full Back'],
      guidance: `BACKS:
- Evaluate: handling under pressure, decision-making (pass/carry/kick), defensive reads, and support play.
- Scrum halves: assess service speed, box-kicking, and snipe running.
- Fly halves: playmaking, kicking from hand, tactical kicking, and defensive positioning.
- Outside backs: finishing, aerial ability, counter-attacking, and defensive alignment.`,
    },
  },
  cricket: {
    batters: {
      positions: ['Opener', 'Top Order', 'Middle Order', 'Lower Order'],
      guidance: `BATTING:
- Evaluate: shot selection, footwork, intent, and ability to rotate strike.
- Assess against the match situation — blocking out a tight spell is as valuable as scoring quickly when required.
- Note partnerships and how pupils batted as pairs.`,
    },
    bowlers: {
      positions: ['Opening Bowler', 'First Change', 'Spinner', 'All-Rounder'],
      guidance: `BOWLING:
- Evaluate: accuracy (line and length), variation, consistency across overs, and wicket-taking ability.
- A bowler with economical figures but no wickets may have been crucial in building pressure.
- Note the bowling action quality and any concerning technical issues.`,
    },
    fielders: {
      positions: ['Wicketkeeper', 'Slip', 'Close Catcher', 'Outfielder'],
      guidance: `FIELDING:
- Evaluate: ground fielding, catching, throwing accuracy, and athleticism.
- Wicketkeeper: standing up/back, leg-side takes, stumpings, and communication.
- Note pupils who saved runs with good fielding or cost runs with poor fielding.`,
    },
  },
  hockey: {
    goalkeeper: {
      positions: ['GK'],
      guidance: `GOALKEEPER:
- Evaluate: shot-stopping, positioning, distribution, communication, and 1v1 saves.
- Assess aerial clearances and sweep play outside the circle.
- A goalkeeper who organises the defence well contributes even in quiet spells.`,
    },
    defenders: {
      positions: ['CB', 'LB', 'RB', 'SW'],
      guidance: `DEFENDERS:
- Evaluate: jab tackles, channelling attackers, intercepting, and distribution.
- Assess involvement in short corners (both defending and injecting).
- Note ability to play out from the back under pressure.`,
    },
    midfield: {
      positions: ['CM', 'LM', 'RM', 'CDM', 'CAM'],
      guidance: `MIDFIELDERS:
- Evaluate: link play, pressing, transition speed, and stamina.
- Midfielders should connect defence to attack — assess their passing accuracy and vision.`,
    },
    forwards: {
      positions: ['CF', 'LW', 'RW', 'ST'],
      guidance: `FORWARDS:
- Evaluate: movement in the circle, finishing, pressing from the front, and creating chances.
- Assess aerial control, receiving on the move, and short corner routines.`,
    },
  },
  netball: {
    shooters: {
      positions: ['GS', 'GA'],
      guidance: `SHOOTERS (GS/GA):
- Evaluate: shooting accuracy (note attempts vs goals), movement in the circle, rebounding, and holding space.
- GA: also assess mid-court link play and feeding into the circle.
- Note shooting technique — balance, release point, consistency.`,
    },
    midcourt: {
      positions: ['WA', 'C', 'WD'],
      guidance: `MID-COURT (WA/C/WD):
- Evaluate: centre pass execution, driving onto the ball, spacing, and transition speed.
- C: assess both attacking and defensive contribution — this position covers the most court.
- WD: note interceptions, ability to limit the opposition's WA.`,
    },
    defenders: {
      positions: ['GD', 'GK'],
      guidance: `DEFENDERS (GD/GK):
- Evaluate: marking, interceptions, rebounding, and 3-foot rule compliance.
- GK: assess ability to contest shots, positioning on the post, and timing of jumps.
- GD: note ability to read the game and intercept passes into the circle.`,
    },
  },
}

// ─── Sport-specific terminology for AI prompts ────────────────────────────

export const TERMINOLOGY = {
  football: {
    sport: 'football',
    scoring: 'goal',
    scoringPlural: 'goals',
    assist: 'assist',
    period: 'half',
    periods: 'halves',
    matchWord: 'match',
    teamSize: '11-a-side (or 9/7/5 for younger age groups)',
    governing: 'FA',
    context: 'UK school football',
  },
  rugby: {
    sport: 'rugby union',
    scoring: 'try',
    scoringPlural: 'tries',
    assist: 'try assist',
    period: 'half',
    periods: 'halves',
    matchWord: 'match',
    teamSize: '15-a-side (or 12/10/7 for younger age groups)',
    governing: 'RFU',
    context: 'UK school rugby',
  },
  cricket: {
    sport: 'cricket',
    scoring: 'run',
    scoringPlural: 'runs',
    assist: 'partnership',
    period: 'innings',
    periods: 'innings',
    matchWord: 'match',
    teamSize: '11-a-side',
    governing: 'ECB',
    context: 'UK school cricket',
  },
  hockey: {
    sport: 'hockey',
    scoring: 'goal',
    scoringPlural: 'goals',
    assist: 'assist',
    period: 'half',
    periods: 'halves',
    matchWord: 'match',
    teamSize: '11-a-side (or 7/6 for younger age groups)',
    governing: 'England Hockey',
    context: 'UK school hockey',
  },
  netball: {
    sport: 'netball',
    scoring: 'goal',
    scoringPlural: 'goals',
    assist: 'feed',
    period: 'quarter',
    periods: 'quarters',
    matchWord: 'match',
    teamSize: '7-a-side',
    governing: 'England Netball',
    context: 'UK school netball',
  },
}

// ─── Match event types per sport ──────────────────────────────────────────

export const MATCH_EVENT_TYPES = {
  football: [
    { key: 'goal', label: 'Goal', icon: 'goal', points: 1, hasSecondary: true, secondaryLabel: 'Assist' },
    { key: 'penalty_goal', label: 'Penalty Goal', icon: 'goal', points: 1 },
    { key: 'free_kick_goal', label: 'Free Kick Goal', icon: 'goal', points: 1 },
    { key: 'own_goal', label: 'Own Goal', icon: 'own_goal', points: 1 },
    { key: 'yellow_card', label: 'Yellow Card', icon: 'card', points: 0 },
    { key: 'red_card', label: 'Red Card', icon: 'card', points: 0 },
    { key: 'penalty_save', label: 'Penalty Save', icon: 'save', points: 0 },
  ],
  rugby: [
    { key: 'try', label: 'Try', icon: 'try', points: 5, hasSecondary: true, secondaryLabel: 'Try Assist' },
    { key: 'conversion', label: 'Conversion', icon: 'kick', points: 2 },
    { key: 'penalty_kick', label: 'Penalty Kick', icon: 'kick', points: 3 },
    { key: 'drop_goal', label: 'Drop Goal', icon: 'kick', points: 3 },
    { key: 'yellow_card', label: 'Yellow Card (Sin Bin)', icon: 'card', points: 0 },
    { key: 'red_card', label: 'Red Card', icon: 'card', points: 0 },
  ],
  cricket: [
    { key: 'wicket', label: 'Wicket', icon: 'wicket', points: 0, hasSecondary: true, secondaryLabel: 'Caught By',
      subtypes: ['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket'] },
    { key: 'boundary_four', label: 'Boundary (4)', icon: 'bat', points: 4 },
    { key: 'boundary_six', label: 'Six', icon: 'bat', points: 6 },
    { key: 'catch', label: 'Catch', icon: 'catch', points: 0 },
    { key: 'run_out', label: 'Run Out', icon: 'fielding', points: 0 },
    { key: 'stumping', label: 'Stumping', icon: 'fielding', points: 0 },
  ],
  hockey: [
    { key: 'goal', label: 'Goal', icon: 'goal', points: 1, hasSecondary: true, secondaryLabel: 'Assist' },
    { key: 'penalty_corner_goal', label: 'Penalty Corner Goal', icon: 'goal', points: 1 },
    { key: 'penalty_stroke_goal', label: 'Penalty Stroke Goal', icon: 'goal', points: 1 },
    { key: 'green_card', label: 'Green Card', icon: 'card', points: 0 },
    { key: 'yellow_card', label: 'Yellow Card', icon: 'card', points: 0 },
    { key: 'red_card', label: 'Red Card', icon: 'card', points: 0 },
  ],
  netball: [
    { key: 'goal', label: 'Goal', icon: 'goal', points: 1 },
    { key: 'interception', label: 'Interception', icon: 'defence', points: 0 },
    { key: 'turnover_won', label: 'Turnover Won', icon: 'defence', points: 0 },
    { key: 'centre_pass_receive', label: 'Centre Pass Receive', icon: 'pass', points: 0 },
  ],
}

// ─── Per-pupil stat fields per sport (for match_pupil_stats) ──────────────

export const PUPIL_STAT_FIELDS = {
  football: [
    { key: 'minutes_played', label: 'Minutes Played', type: 'number' },
    { key: 'goals', label: 'Goals', type: 'number' },
    { key: 'assists', label: 'Assists', type: 'number' },
    { key: 'shots', label: 'Shots', type: 'number' },
    { key: 'shots_on_target', label: 'Shots on Target', type: 'number' },
    { key: 'passes', label: 'Passes', type: 'number' },
    { key: 'tackles', label: 'Tackles', type: 'number' },
    { key: 'saves', label: 'Saves', type: 'number', positionFilter: ['GK'] },
  ],
  rugby: [
    { key: 'minutes_played', label: 'Minutes Played', type: 'number' },
    { key: 'tries', label: 'Tries', type: 'number' },
    { key: 'conversions', label: 'Conversions', type: 'number' },
    { key: 'tackles', label: 'Tackles', type: 'number' },
    { key: 'tackles_missed', label: 'Tackles Missed', type: 'number' },
    { key: 'carries', label: 'Carries', type: 'number' },
    { key: 'metres_gained', label: 'Metres Gained', type: 'number' },
    { key: 'passes', label: 'Passes', type: 'number' },
    { key: 'turnovers_won', label: 'Turnovers Won', type: 'number' },
    { key: 'lineout_wins', label: 'Lineout Wins', type: 'number' },
    { key: 'penalties_conceded', label: 'Penalties Conceded', type: 'number' },
  ],
  cricket: [
    { key: 'runs_scored', label: 'Runs Scored', type: 'number' },
    { key: 'balls_faced', label: 'Balls Faced', type: 'number' },
    { key: 'fours', label: 'Fours', type: 'number' },
    { key: 'sixes', label: 'Sixes', type: 'number' },
    { key: 'how_out', label: 'How Out', type: 'select', options: ['not out', 'bowled', 'caught', 'lbw', 'run out', 'stumped', 'hit wicket', 'retired'] },
    { key: 'overs_bowled', label: 'Overs Bowled', type: 'number', step: 0.1 },
    { key: 'runs_conceded', label: 'Runs Conceded', type: 'number' },
    { key: 'wickets_taken', label: 'Wickets Taken', type: 'number' },
    { key: 'maidens', label: 'Maidens', type: 'number' },
    { key: 'catches', label: 'Catches', type: 'number' },
    { key: 'run_outs', label: 'Run Outs', type: 'number' },
  ],
  hockey: [
    { key: 'minutes_played', label: 'Minutes Played', type: 'number' },
    { key: 'goals', label: 'Goals', type: 'number' },
    { key: 'assists', label: 'Assists', type: 'number' },
    { key: 'shots', label: 'Shots', type: 'number' },
    { key: 'tackles', label: 'Tackles', type: 'number' },
    { key: 'interceptions', label: 'Interceptions', type: 'number' },
    { key: 'penalty_corners', label: 'Penalty Corners', type: 'number' },
    { key: 'saves', label: 'Saves', type: 'number', positionFilter: ['GK'] },
    { key: 'green_cards', label: 'Green Cards', type: 'number' },
  ],
  netball: [
    { key: 'goals_scored', label: 'Goals Scored', type: 'number' },
    { key: 'goals_attempted', label: 'Goals Attempted', type: 'number' },
    { key: 'interceptions', label: 'Interceptions', type: 'number' },
    { key: 'deflections', label: 'Deflections', type: 'number' },
    { key: 'centre_pass_receives', label: 'Centre Pass Receives', type: 'number' },
    { key: 'turnovers', label: 'Turnovers', type: 'number' },
    { key: 'rebounds', label: 'Rebounds', type: 'number' },
    { key: 'penalties', label: 'Penalties', type: 'number' },
  ],
}

// ─── Helper: get taxonomy for a sport (with football fallback) ────────────

export function getTaxonomy(sport) {
  const s = SPORTS.includes(sport) ? sport : 'football'
  return {
    sport: s,
    clipCategories: CLIP_CATEGORIES[s],
    observationCategories: OBSERVATION_CATEGORIES[s],
    capabilities: CAPABILITIES[s],
    capabilityScale: CAPABILITY_SCALE,
    positionGuidance: POSITION_GUIDANCE[s],
    terminology: TERMINOLOGY[s],
    matchEventTypes: MATCH_EVENT_TYPES[s],
    pupilStatFields: PUPIL_STAT_FIELDS[s],
  }
}
