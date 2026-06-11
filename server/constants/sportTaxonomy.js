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

export const SPORTS = [
  'football', 'rugby', 'cricket', 'hockey', 'netball',
  'athletics', 'basketball', 'swimming', 'gymnastics', 'tennis',
  'badminton', 'rounders', 'dance', 'volleyball', 'cross-country',
]

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
  basketball: [
    ...COMMON_CATEGORIES,
    { value: 'basket', label: 'Basket', color: 'pitch' },
    { value: 'assist', label: 'Assist', color: 'pitch' },
    { value: 'rebound', label: 'Rebound', color: 'navy' },
    { value: 'steal', label: 'Steal', color: 'energy' },
    { value: 'block', label: 'Block', color: 'alert' },
    { value: 'fast_break', label: 'Fast Break', color: 'energy' },
  ],
  athletics: [
    ...COMMON_CATEGORIES,
    { value: 'sprint', label: 'Sprint', color: 'energy' },
    { value: 'endurance', label: 'Endurance', color: 'navy' },
    { value: 'jump', label: 'Jump', color: 'pitch' },
    { value: 'throw', label: 'Throw', color: 'alert' },
    { value: 'relay_changeover', label: 'Relay Changeover', color: 'energy' },
    { value: 'technique', label: 'Technique', color: 'navy' },
  ],
  swimming: [
    ...COMMON_CATEGORIES,
    { value: 'start', label: 'Start', color: 'energy' },
    { value: 'turn', label: 'Turn', color: 'alert' },
    { value: 'stroke_technique', label: 'Stroke Technique', color: 'pitch' },
    { value: 'finish', label: 'Finish', color: 'energy' },
    { value: 'relay_takeover', label: 'Relay Takeover', color: 'navy' },
  ],
  gymnastics: [
    ...COMMON_CATEGORIES,
    { value: 'routine', label: 'Routine', color: 'pitch' },
    { value: 'balance', label: 'Balance', color: 'navy' },
    { value: 'flight', label: 'Flight', color: 'energy' },
    { value: 'landing', label: 'Landing', color: 'alert' },
    { value: 'sequence', label: 'Sequence', color: 'navy' },
  ],
  tennis: [
    ...COMMON_CATEGORIES,
    { value: 'serve', label: 'Serve', color: 'energy' },
    { value: 'rally', label: 'Rally', color: 'pitch' },
    { value: 'net_play', label: 'Net Play', color: 'alert' },
    { value: 'winner', label: 'Winner', color: 'pitch' },
    { value: 'movement', label: 'Movement', color: 'navy' },
  ],
  badminton: [
    ...COMMON_CATEGORIES,
    { value: 'serve', label: 'Serve', color: 'energy' },
    { value: 'rally', label: 'Rally', color: 'pitch' },
    { value: 'smash', label: 'Smash', color: 'alert' },
    { value: 'net_play', label: 'Net Play', color: 'navy' },
    { value: 'movement', label: 'Movement', color: 'navy' },
  ],
  rounders: [
    ...COMMON_CATEGORIES,
    { value: 'batting', label: 'Batting', color: 'pitch' },
    { value: 'bowling', label: 'Bowling', color: 'energy' },
    { value: 'fielding', label: 'Fielding', color: 'navy' },
    { value: 'stumping', label: 'Stumping', color: 'alert' },
    { value: 'running', label: 'Post Running', color: 'energy' },
  ],
  dance: [
    ...COMMON_CATEGORIES,
    { value: 'performance', label: 'Performance', color: 'pitch' },
    { value: 'technique', label: 'Technique', color: 'navy' },
    { value: 'musicality', label: 'Musicality', color: 'energy' },
    { value: 'formation_change', label: 'Formation Change', color: 'navy' },
    { value: 'expression', label: 'Expression', color: 'pitch' },
  ],
  volleyball: [
    ...COMMON_CATEGORIES,
    { value: 'serve', label: 'Serve', color: 'energy' },
    { value: 'dig', label: 'Dig', color: 'navy' },
    { value: 'set', label: 'Set', color: 'pitch' },
    { value: 'spike', label: 'Spike', color: 'alert' },
    { value: 'block', label: 'Block', color: 'alert' },
    { value: 'rally', label: 'Rally', color: 'pitch' },
  ],
  'cross-country': [
    ...COMMON_CATEGORIES,
    { value: 'start', label: 'Start', color: 'energy' },
    { value: 'pacing', label: 'Pacing', color: 'navy' },
    { value: 'hill_technique', label: 'Hill Technique', color: 'alert' },
    { value: 'finish', label: 'Finish', color: 'energy' },
  ],
}

// ─── AI observation categories ────────────────────────────────────────────

export const OBSERVATION_CATEGORIES = {
  football: ['formation', 'attack', 'defence', 'transition', 'set_piece'],
  rugby: ['attack', 'defence', 'set_piece', 'breakdown', 'kicking', 'transition'],
  cricket: ['batting', 'bowling', 'fielding', 'captaincy', 'partnership'],
  hockey: ['attack', 'defence', 'set_piece', 'transition', 'pressing'],
  netball: ['attack', 'defence', 'centre_pass', 'shooting', 'transition'],
  basketball: ['offence', 'defence', 'transition', 'rebounding', 'shooting'],
  athletics: ['sprints', 'endurance', 'jumps', 'throws', 'relays'],
  swimming: ['starts', 'turns', 'stroke_technique', 'pacing', 'relays'],
  gymnastics: ['shapes', 'balances', 'rotation', 'flight', 'composition'],
  tennis: ['serve', 'groundstrokes', 'net_play', 'movement', 'tactics'],
  badminton: ['serve', 'overhead', 'net_play', 'movement', 'tactics'],
  rounders: ['batting', 'bowling', 'fielding', 'base_running', 'tactics'],
  dance: ['technique', 'performance', 'composition', 'musicality', 'expression'],
  volleyball: ['serve', 'serve_receive', 'attack', 'block', 'defence'],
  'cross-country': ['pacing', 'technique', 'racecraft', 'endurance', 'mentality'],
}

// ─── Core capabilities per sport ──────────────────────────────────────────

export const CAPABILITIES = {
  football: {
    label: 'FA Core Capabilities',
    items: [
      { key: 'scanning', label: 'Scanning', description: 'Looking around before receiving - aware of options and dangers' },
      { key: 'timing', label: 'Timing', description: 'Choosing the right moment to pass, tackle, or make a run' },
      { key: 'movement', label: 'Movement', description: 'Movement on and off the ball - body shape, runs, shielding' },
      { key: 'positioning', label: 'Positioning', description: 'Pitch placement and body orientation' },
      { key: 'deception', label: 'Deception', description: 'Feints, disguised passes, changes of direction' },
      { key: 'techniques', label: 'Techniques', description: 'Core technical actions - passing, shooting, tackling, first touch' },
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
  basketball: {
    label: 'Basketball Core Skills',
    items: [
      { key: 'ball_handling', label: 'Ball Handling', description: 'Dribbling with either hand, protecting the ball under pressure' },
      { key: 'shooting', label: 'Shooting', description: 'Form, range and shot selection including lay-ups both sides' },
      { key: 'passing', label: 'Passing & Vision', description: 'Chest/bounce/overhead passing and finding the open player' },
      { key: 'footwork', label: 'Footwork', description: 'Pivoting, triple threat, jump stops, defensive slides' },
      { key: 'rebounding', label: 'Rebounding', description: 'Boxing out and pursuing the ball on both ends' },
      { key: 'defence', label: 'Defence', description: 'Man-to-man stance, positioning and help defence' },
    ],
  },
  athletics: {
    label: 'Athletics Core Skills',
    items: [
      { key: 'sprint_mechanics', label: 'Sprint Mechanics', description: 'Drive phase, posture, arm action and cadence' },
      { key: 'endurance', label: 'Endurance & Pacing', description: 'Aerobic base and even-pace judgement' },
      { key: 'jumping', label: 'Jumping', description: 'Approach, take-off and safe landing across jump events' },
      { key: 'throwing', label: 'Throwing', description: 'Technique and safety across throwing implements' },
      { key: 'mobility', label: 'Agility & Mobility', description: 'Coordination, balance and movement range' },
      { key: 'competition_craft', label: 'Competition Craft', description: 'Warm-up routine, check-in, rules and event management' },
    ],
  },
  swimming: {
    label: 'Swimming Core Skills',
    items: [
      { key: 'stroke_technique', label: 'Stroke Technique', description: 'Body position, catch and timing across all four strokes' },
      { key: 'breathing', label: 'Breathing', description: 'Bilateral and stroke-appropriate breathing patterns' },
      { key: 'starts_turns', label: 'Starts & Turns', description: 'Dive starts, push-offs, legal turns and finishes' },
      { key: 'pacing', label: 'Pacing', description: 'Even-pace swimming and race judgement' },
      { key: 'water_safety', label: 'Water Safety', description: 'Self-rescue skills, floating and safe behaviour' },
      { key: 'racecraft', label: 'Racecraft', description: 'Gala routines, relay takeovers and stroke law' },
    ],
  },
  gymnastics: {
    label: 'Gymnastics Core Skills',
    items: [
      { key: 'body_tension', label: 'Body Tension', description: 'Shapes held with control and extension' },
      { key: 'balance', label: 'Balance', description: 'Points and patches, partner balances, stability' },
      { key: 'rotation', label: 'Rotation', description: 'Rolls and turns with safe technique' },
      { key: 'flight', label: 'Flight & Landing', description: 'Jumps with shape and controlled, safe landings' },
      { key: 'sequencing', label: 'Sequencing', description: 'Linking movements fluently with changes of level and speed' },
      { key: 'strength_flexibility', label: 'Strength & Flexibility', description: 'Core strength and mobility underpinning skills' },
    ],
  },
  tennis: {
    label: 'Tennis Core Skills',
    items: [
      { key: 'groundstrokes', label: 'Groundstrokes', description: 'Forehand and backhand consistency and shape' },
      { key: 'serve', label: 'Serve', description: 'Action, placement and second-serve reliability' },
      { key: 'net_play', label: 'Net Play', description: 'Volleys, approach play and overheads' },
      { key: 'movement', label: 'Movement', description: 'Split step, recovery and court coverage' },
      { key: 'rally_craft', label: 'Rally Craft', description: 'Consistency, placement and building points' },
      { key: 'competition', label: 'Competition Skills', description: 'Scoring, etiquette and self-umpiring' },
    ],
  },
  badminton: {
    label: 'Badminton Core Skills',
    items: [
      { key: 'grip_control', label: 'Grip & Racket Control', description: 'Forehand/backhand grips and grip changes' },
      { key: 'serve', label: 'Serve', description: 'Legal low and high serves with placement' },
      { key: 'overhead', label: 'Overhead Shots', description: 'Clears, drops and smash development' },
      { key: 'net_play', label: 'Net Play', description: 'Net shots, lifts and tight control' },
      { key: 'movement', label: 'Court Movement', description: 'Base position, chasse and lunge recovery' },
      { key: 'tactics', label: 'Tactics', description: 'Building rallies and exploiting space, singles and doubles' },
    ],
  },
  rounders: {
    label: 'Rounders Core Skills',
    items: [
      { key: 'batting', label: 'Batting', description: 'Contact, placement into space and decision-making' },
      { key: 'bowling', label: 'Bowling', description: 'Legal, accurate action with variation' },
      { key: 'fielding', label: 'Fielding', description: 'Catching, ground fielding and throwing accuracy' },
      { key: 'base_play', label: 'Post Play', description: 'Stumping technique and footwork at posts' },
      { key: 'running', label: 'Running Between Posts', description: 'Speed and risk judgement between posts' },
      { key: 'game_sense', label: 'Game Sense', description: 'Field placement awareness and tactical decisions' },
    ],
  },
  dance: {
    label: 'Dance Core Skills',
    items: [
      { key: 'technique', label: 'Technique', description: 'Control, alignment and accuracy of action' },
      { key: 'performance', label: 'Performance', description: 'Projection, focus and confidence' },
      { key: 'musicality', label: 'Musicality', description: 'Timing, phrasing and response to accompaniment' },
      { key: 'composition', label: 'Composition', description: 'Generating and structuring movement material' },
      { key: 'expression', label: 'Expression', description: 'Communicating intent, character and dynamics' },
      { key: 'ensemble', label: 'Ensemble Work', description: 'Unison, canon and spatial awareness with others' },
    ],
  },
  volleyball: {
    label: 'Volleyball Core Skills',
    items: [
      { key: 'serve', label: 'Serve', description: 'Underarm to overarm progression with placement' },
      { key: 'dig', label: 'Dig', description: 'Forearm platform control from serve and attack' },
      { key: 'set', label: 'Set', description: 'Volley shape, footwork and decision-making' },
      { key: 'attack', label: 'Attack', description: 'Approach footwork, arm swing and shot choice' },
      { key: 'block_defence', label: 'Block & Defence', description: 'Net presence, timing and court coverage' },
      { key: 'rotation_awareness', label: 'Rotation Awareness', description: 'Positional structure and three-touch play' },
    ],
  },
  'cross-country': {
    label: 'Cross Country Core Skills',
    items: [
      { key: 'pacing', label: 'Pacing', description: 'Even-pace and negative-split judgement' },
      { key: 'running_form', label: 'Running Form', description: 'Posture, cadence and relaxed technique' },
      { key: 'hills', label: 'Hill Technique', description: 'Uphill drive and controlled descending' },
      { key: 'racecraft', label: 'Racecraft', description: 'Starts, positioning and finishing strategy' },
      { key: 'resilience', label: 'Resilience', description: 'Sustained effort and response to discomfort' },
      { key: 'preparation', label: 'Preparation', description: 'Warm-up, kit and course awareness' },
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
- Defenders who rarely appear in highlights may be performing EXCELLENTLY - keeping things quiet.
- Assess: did they push forward? Contribute to build-up? Fullbacks who get forward and create chances should be rewarded.
- A defender who is solid AND dangerous going forward deserves a higher rating.`,
    },
    midfield: {
      positions: ['CM', 'CDM', 'CAM', 'LM', 'RM', 'LW', 'RW'],
      guidance: `MIDFIELDERS & ATTACKERS:
- Evaluate based on specific role - a holding midfielder shields the defence, an attacking midfielder creates chances.
- Goals and assists are NOT the only way to stand out - controlling tempo or winning the ball back repeatedly is equally valuable.`,
    },
  },
  rugby: {
    forwards: {
      positions: ['Prop', 'Hooker', 'Lock', 'Flanker', 'Number 8'],
      guidance: `FORWARDS:
- Evaluate: scrummaging, lineout work, carrying in tight, tackling, breakdown work, and work rate.
- Forwards who make lots of tackles and carry hard but don't score tries can still have excellent matches.
- Assess contribution at the breakdown - securing or contesting rucks.`,
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
- Assess against the match situation - blocking out a tight spell is as valuable as scoring quickly when required.
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
- Midfielders should connect defence to attack - assess their passing accuracy and vision.`,
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
- Note shooting technique - balance, release point, consistency.`,
    },
    midcourt: {
      positions: ['WA', 'C', 'WD'],
      guidance: `MID-COURT (WA/C/WD):
- Evaluate: centre pass execution, driving onto the ball, spacing, and transition speed.
- C: assess both attacking and defensive contribution - this position covers the most court.
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
  basketball: {
    guards: {
      positions: ['PG', 'SG', 'G'],
      guidance: `GUARDS:
- Evaluate ball handling under pressure, decision-making in transition, and on-ball defence.
- Point guards run the offence: assess vision, pass selection and tempo control.`,
    },
    forwards_centres: {
      positions: ['SF', 'PF', 'C', 'F'],
      guidance: `FORWARDS/CENTRES:
- Evaluate rebounding effort at both ends, finishing inside, and help defence.
- Note screening quality and movement without the ball.`,
    },
  },
  athletics: {
    all: {
      positions: ['ATH'],
      guidance: `ATHLETES:
- Judge technique and improvement against personal bests, not just placings.
- Performance fluctuates through growth spurts - weigh effort and execution.
- For relays, assess changeover technique as heavily as leg speed.`,
    },
  },
  swimming: {
    all: {
      positions: ['SWIM'],
      guidance: `SWIMMERS:
- Assess stroke legality and technique, starts, turns and finishes - not just times.
- Compare against personal bests; note pacing judgement across the race.`,
    },
  },
  gymnastics: {
    all: {
      positions: ['GYM'],
      guidance: `GYMNASTS:
- Judge control, body tension, extension and safe landings over difficulty.
- Note composition quality in sequences and confidence on apparatus.`,
    },
  },
  tennis: {
    all: {
      positions: ['TEN'],
      guidance: `TENNIS PLAYERS:
- Assess consistency first, then placement and shot variety.
- Note serve reliability, movement and recovery between shots, and scoreboard composure.`,
    },
  },
  badminton: {
    all: {
      positions: ['BAD'],
      guidance: `BADMINTON PLAYERS:
- Assess grip changes, base recovery and overhead clears before advanced shots.
- Note rally-building patience and use of the full court.`,
    },
  },
  rounders: {
    batters: {
      positions: ['BAT'],
      guidance: `BATTERS:
- Evaluate contact rate, placement into space, and running decisions between posts.`,
    },
    fielders: {
      positions: ['BOWL', 'BACKSTOP', 'POST', 'DEEP'],
      guidance: `BOWLER/FIELDERS:
- Bowler: legality and consistency first, then variation.
- Backstop and post players: clean takes and quick stumping decisions deserve high ratings.`,
    },
  },
  dance: {
    all: {
      positions: ['DAN'],
      guidance: `DANCERS:
- Assess technique, musicality and expression; ensemble timing matters as much as solo quality.
- Reward committed performance and compositional ideas, not just physical facility.`,
    },
  },
  volleyball: {
    all: {
      positions: ['S', 'OH', 'MB', 'OPP', 'L'],
      guidance: `VOLLEYBALL PLAYERS:
- Setters: decision quality and consistency of delivery.
- Hitters: approach timing and shot selection, not just power.
- Liberos/back court: serve-receive platform control is the foundation skill.`,
    },
  },
  'cross-country': {
    all: {
      positions: ['RUN'],
      guidance: `RUNNERS:
- Judge pacing discipline and finishing strength against personal bests and course conditions.
- Team scoring: every finishing place counts - reward pack running and resilience.`,
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
  basketball: {
    sport: 'basketball', scoring: 'basket', scoringPlural: 'baskets', assist: 'assist',
    period: 'quarter', periods: 'quarters', matchWord: 'game',
    teamSize: '5v5 (4v4 mini basketball for primary)',
    governing: 'Basketball England', context: 'UK school basketball',
  },
  athletics: {
    sport: 'athletics', scoring: 'points finish', scoringPlural: 'points finishes', assist: 'relay changeover',
    period: 'event', periods: 'events', matchWord: 'meet',
    teamSize: 'squad across track and field events',
    governing: 'England Athletics', context: 'UK school athletics',
  },
  swimming: {
    sport: 'swimming', scoring: 'race win', scoringPlural: 'race wins', assist: 'relay takeover',
    period: 'event', periods: 'events', matchWord: 'gala',
    teamSize: 'gala team across strokes and distances',
    governing: 'Swim England', context: 'UK school swimming',
  },
  gymnastics: {
    sport: 'gymnastics', scoring: 'routine score', scoringPlural: 'routine scores', assist: 'spot',
    period: 'rotation', periods: 'rotations', matchWord: 'competition',
    teamSize: 'squad across apparatus',
    governing: 'British Gymnastics', context: 'UK school gymnastics',
  },
  tennis: {
    sport: 'tennis', scoring: 'game', scoringPlural: 'games', assist: 'set-up',
    period: 'set', periods: 'sets', matchWord: 'match',
    teamSize: 'team of singles and doubles rubbers',
    governing: 'LTA', context: 'UK school tennis',
  },
  badminton: {
    sport: 'badminton', scoring: 'point', scoringPlural: 'points', assist: 'set-up',
    period: 'game', periods: 'games', matchWord: 'match',
    teamSize: 'team of singles and doubles rubbers',
    governing: 'Badminton England', context: 'UK school badminton',
  },
  rounders: {
    sport: 'rounders', scoring: 'rounder', scoringPlural: 'rounders', assist: 'fielding assist',
    period: 'innings', periods: 'innings', matchWord: 'match',
    teamSize: '9-a-side',
    governing: 'Rounders England', context: 'UK school rounders',
  },
  dance: {
    sport: 'dance', scoring: 'performance', scoringPlural: 'performances', assist: 'partnering',
    period: 'piece', periods: 'pieces', matchWord: 'performance',
    teamSize: 'ensemble',
    governing: 'One Dance UK', context: 'UK school dance',
  },
  volleyball: {
    sport: 'volleyball', scoring: 'point', scoringPlural: 'points', assist: 'set',
    period: 'set', periods: 'sets', matchWord: 'match',
    teamSize: '6v6 (4v4 mini volleyball for development)',
    governing: 'Volleyball England', context: 'UK school volleyball',
  },
  'cross-country': {
    sport: 'cross country', scoring: 'finishing place', scoringPlural: 'finishing places', assist: 'pacing',
    period: 'race', periods: 'races', matchWord: 'race',
    teamSize: 'scoring team of 4-6 runners',
    governing: 'England Athletics', context: 'UK school cross country',
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
  basketball: [
    { key: 'basket', label: 'Basket (2pts)', icon: 'goal', points: 2 },
    { key: 'three_pointer', label: 'Three Pointer', icon: 'goal', points: 3 },
    { key: 'free_throw', label: 'Free Throw', icon: 'goal', points: 1 },
    { key: 'assist', label: 'Assist', icon: 'pass', points: 0 },
    { key: 'rebound', label: 'Rebound', icon: 'defence', points: 0 },
    { key: 'steal', label: 'Steal', icon: 'defence', points: 0 },
  ],
  athletics: [
    { key: 'event_win', label: 'Event Win', icon: 'goal', points: 0 },
    { key: 'podium', label: 'Podium Finish', icon: 'goal', points: 0 },
    { key: 'personal_best', label: 'Personal Best', icon: 'goal', points: 0 },
    { key: 'relay_leg', label: 'Relay Leg', icon: 'pass', points: 0 },
  ],
  swimming: [
    { key: 'race_win', label: 'Race Win', icon: 'goal', points: 0 },
    { key: 'podium', label: 'Podium Finish', icon: 'goal', points: 0 },
    { key: 'personal_best', label: 'Personal Best', icon: 'goal', points: 0 },
    { key: 'relay_leg', label: 'Relay Leg', icon: 'pass', points: 0 },
  ],
  gymnastics: [
    { key: 'routine_completed', label: 'Routine Completed', icon: 'goal', points: 0 },
    { key: 'apparatus_score', label: 'Apparatus Score', icon: 'goal', points: 0 },
    { key: 'personal_best', label: 'Personal Best', icon: 'goal', points: 0 },
  ],
  tennis: [
    { key: 'rubber_won', label: 'Rubber Won', icon: 'goal', points: 1 },
    { key: 'set_won', label: 'Set Won', icon: 'goal', points: 0 },
    { key: 'ace', label: 'Ace', icon: 'goal', points: 0 },
  ],
  badminton: [
    { key: 'rubber_won', label: 'Rubber Won', icon: 'goal', points: 1 },
    { key: 'game_won', label: 'Game Won', icon: 'goal', points: 0 },
  ],
  rounders: [
    { key: 'rounder', label: 'Rounder', icon: 'goal', points: 1 },
    { key: 'half_rounder', label: 'Half Rounder', icon: 'goal', points: 0.5 },
    { key: 'catch_out', label: 'Catch Out', icon: 'defence', points: 0 },
    { key: 'stumped_out', label: 'Stumped Out', icon: 'defence', points: 0 },
  ],
  dance: [
    { key: 'performance', label: 'Performance', icon: 'goal', points: 0 },
    { key: 'solo_feature', label: 'Solo Feature', icon: 'goal', points: 0 },
  ],
  volleyball: [
    { key: 'set_won', label: 'Set Won', icon: 'goal', points: 1 },
    { key: 'service_ace', label: 'Service Ace', icon: 'goal', points: 0 },
    { key: 'spike_winner', label: 'Spike Winner', icon: 'goal', points: 0 },
    { key: 'block_point', label: 'Block Point', icon: 'defence', points: 0 },
  ],
  'cross-country': [
    { key: 'race_finish', label: 'Race Finish', icon: 'goal', points: 0 },
    { key: 'top_ten', label: 'Top 10 Finish', icon: 'goal', points: 0 },
    { key: 'personal_best', label: 'Personal Best', icon: 'goal', points: 0 },
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
  basketball: [
    { key: 'minutes_played', label: 'Minutes Played', type: 'number' },
    { key: 'points', label: 'Points', type: 'number' },
    { key: 'assists', label: 'Assists', type: 'number' },
    { key: 'rebounds', label: 'Rebounds', type: 'number' },
    { key: 'steals', label: 'Steals', type: 'number' },
    { key: 'blocks', label: 'Blocks', type: 'number' },
  ],
  athletics: [
    { key: 'events_entered', label: 'Events Entered', type: 'number' },
    { key: 'best_result', label: 'Best Result', type: 'text' },
    { key: 'personal_bests', label: 'Personal Bests', type: 'number' },
    { key: 'points_scored', label: 'Points Scored', type: 'number' },
  ],
  swimming: [
    { key: 'events_entered', label: 'Events Entered', type: 'number' },
    { key: 'best_time', label: 'Best Time', type: 'text' },
    { key: 'personal_bests', label: 'Personal Bests', type: 'number' },
    { key: 'relay_legs', label: 'Relay Legs', type: 'number' },
  ],
  gymnastics: [
    { key: 'routines', label: 'Routines Performed', type: 'number' },
    { key: 'best_score', label: 'Best Score', type: 'text' },
    { key: 'apparatus_count', label: 'Apparatus Covered', type: 'number' },
  ],
  tennis: [
    { key: 'rubbers_played', label: 'Rubbers Played', type: 'number' },
    { key: 'rubbers_won', label: 'Rubbers Won', type: 'number' },
    { key: 'sets_won', label: 'Sets Won', type: 'number' },
    { key: 'aces', label: 'Aces', type: 'number' },
  ],
  badminton: [
    { key: 'rubbers_played', label: 'Rubbers Played', type: 'number' },
    { key: 'rubbers_won', label: 'Rubbers Won', type: 'number' },
    { key: 'games_won', label: 'Games Won', type: 'number' },
  ],
  rounders: [
    { key: 'rounders_scored', label: 'Rounders', type: 'number' },
    { key: 'half_rounders', label: 'Half Rounders', type: 'number' },
    { key: 'catches', label: 'Catches', type: 'number' },
    { key: 'stumpings', label: 'Stumpings', type: 'number' },
    { key: 'balls_bowled', label: 'Balls Bowled', type: 'number' },
  ],
  dance: [
    { key: 'pieces_performed', label: 'Pieces Performed', type: 'number' },
    { key: 'solo_features', label: 'Solo Features', type: 'number' },
  ],
  volleyball: [
    { key: 'sets_played', label: 'Sets Played', type: 'number' },
    { key: 'service_aces', label: 'Service Aces', type: 'number' },
    { key: 'kills', label: 'Attack Winners', type: 'number' },
    { key: 'blocks', label: 'Blocks', type: 'number' },
    { key: 'digs', label: 'Digs', type: 'number' },
  ],
  'cross-country': [
    { key: 'races', label: 'Races Run', type: 'number' },
    { key: 'best_position', label: 'Best Position', type: 'number' },
    { key: 'personal_bests', label: 'Personal Bests', type: 'number' },
  ],
}

// ─── Helper: get taxonomy for a sport (with football fallback) ────────────

const GENERIC_TAXONOMY_SPORT = {
  clipCategories: [...COMMON_CATEGORIES],
  observationCategories: ['technique', 'tactics', 'physical', 'teamwork', 'performance'],
  capabilities: {
    label: 'Core PE Capabilities',
    items: [
      { key: 'technique', label: 'Technique', description: 'Execution of the activity\'s core skills' },
      { key: 'decision_making', label: 'Decision Making', description: 'Choosing the right option under pressure' },
      { key: 'physical', label: 'Physical', description: 'Speed, strength, stamina and agility for the activity' },
      { key: 'teamwork', label: 'Teamwork', description: 'Communication and working with others' },
      { key: 'resilience', label: 'Resilience', description: 'Effort, persistence and response to setbacks' },
    ],
  },
  positionGuidance: {
    all: { positions: [], guidance: 'Assess effort, technique and improvement against the pupil\'s own baseline.' },
  },
  terminology: {
    sport: 'school sport', scoring: 'score', scoringPlural: 'scores', assist: 'assist',
    period: 'period', periods: 'periods', matchWord: 'fixture',
    teamSize: 'squad', governing: 'the relevant NGB', context: 'UK school sport',
  },
  matchEventTypes: [],
  pupilStatFields: [
    { key: 'sessions_attended', label: 'Sessions Attended', type: 'number' },
    { key: 'fixtures_played', label: 'Fixtures Played', type: 'number' },
  ],
}

export function getTaxonomy(sport) {
  // Unknown sports get a neutral PE taxonomy, NOT football's
  if (!SPORTS.includes(sport)) {
    return { sport: sport || 'generic', ...GENERIC_TAXONOMY_SPORT, capabilityScale: CAPABILITY_SCALE }
  }
  const s = sport
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
