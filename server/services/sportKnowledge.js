// Sport-specific development frameworks and age-appropriate guidance
// for the AI coaching assistant. Each sport has NGB-aligned guidance
// that is injected into the system prompt based on sport context.

// ==========================================
// FOOTBALL (FA / UEFA)
// ==========================================
export const footballGuidance = {
  framework: `FOOTBALL DEVELOPMENT FRAMEWORK (FA / UEFA):
Based on the FA Player Development Framework, England DNA, and UEFA coaching guidelines.

Development Phases:
- Foundation Phase (U7-U11): Fun, play-based, ABC (Agility/Balance/Coordination), small-sided games, falling in love with the ball
- Youth Development Phase (U12-U16): Decision-making, positional understanding, tactical concepts, physical development awareness
- Professional Development Phase (U17+): Tactical sophistication, physical maturity, competitive intensity, specialisation

FA Four Corner Model (applies to all ages):
1. Technical/Tactical: skill acquisition, game understanding, decision-making
2. Physical: movement, agility, speed, endurance (age-appropriate)
3. Psychological: confidence, resilience, concentration, motivation
4. Social: teamwork, communication, respect, fair play

Key Principles:
- Player-centred, coach-guided approach
- Game-realistic training environments
- Guided discovery over instruction
- Small-sided games as the primary vehicle for learning
- Equal playing time at grassroots level
- No heading at U11 and below; gradual reintroduction at U12`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 3) { // U7-U8
      return `FA GUIDANCE - FOUNDATION PHASE (Years 2-3 / U7-U8):
- Mini Soccer: 5v5, size 3 ball, 20-minute halves
- No league tables, no published results
- No deliberate heading (indirect free kick)
- Pass-in/dribble-in replaces throw-in
- Unlimited rolling substitutions, every pupil gets equal time
- Focus: dribbling, turning, 1v1 skills, fun with the ball
- 70/30 ratio: ball rolling time vs talking time
- Training: fun games, SSGs (1v1, 2v2, 3v3), skills challenges
- NO complex tactics, NO fixed positions, NO rigid formations`
    }
    if (yearGroup <= 5) { // U9-U10
      return `FA GUIDANCE - FOUNDATION PHASE (Years 4-5 / U9-U10):
- Mini Soccer: 7v7, size 3/4 ball, 25-minute halves
- Still fun-focused with maximum game time for all pupils
- No deliberate heading
- Begin introducing: basic width, support play, simple passing combinations
- Technical focus: passing, receiving, dribbling under pressure, shooting
- Let pupils explore positions, do not lock them into fixed roles
- Training: SSGs (3v3, 4v4, 5v5), fun technical challenges
- Minimal tactical instruction, guide through questions not commands`
    }
    if (yearGroup <= 7) { // U11-U12
      return `FA GUIDANCE - YOUTH DEVELOPMENT PHASE (Years 6-7 / U11-U12):
- 9v9 format, size 4 ball, 30-minute halves
- Offside introduced at U11, heading gradually reintroduced at U12
- Pupils beginning to understand positions, basic shape, simple tactics
- Focus: decision-making, positional awareness, understanding space
- Still prioritise development over results
- Training: game-realistic practices, guided discovery, positional play introduction
- Be aware of growth spurts and relative age effect`
    }
    // U13+ (Years 8-13)
    return `FA GUIDANCE - YOUTH DEVELOPMENT PHASE (Year ${yearGroup} / U${yearGroup + 5}):
- 11v11 format, size 5 ball, ${yearGroup <= 9 ? '35' : '40'}-minute halves
- Tactical development appropriate: formations, pressing, transitions, set pieces
- Physical awareness: growth spurts, Peak Height Velocity, injury risk
- Mental resilience: coping with pressure, competitive environment
- FA Four Corner Model remains central
- Development still matters, avoid win-at-all-costs mentality
- Encourage playing multiple positions for tactical understanding`
  }
}

// ==========================================
// RUGBY (RFU)
// ==========================================
export const rugbyGuidance = {
  framework: `RUGBY DEVELOPMENT FRAMEWORK (RFU):
Based on the RFU Player Development Model and Age-Grade Rugby guidelines.

Development Phases:
- Mini Rugby (U7-U8): Tag rugby only, no contact, fun and movement
- Midi Rugby (U9-U12): Gradual introduction of contact, progressive game formats
- Junior Rugby (U13-U15): Full contact, developing game understanding
- Colts Rugby (U16-U18): Near-adult game, tactical sophistication

RFU Age-Grade Variations:
- U7-U8: Tag rugby, 4v4 or 7v7, no scrums, no lineouts, no kicking
- U9: Introduction of uncontested scrums (3-person), mauling from a catch
- U10: Contested rucks introduced, still no competitive scrums
- U11-U12: Contested scrums introduced, lineouts, tactical kicking begins
- U13+: Full game with age-appropriate law variations

Critical Safety Rules:
- Tackle height law: must be below the armpit line (all ages)
- No tackling above the shoulders at any age
- Scrum engagement must follow "crouch, bind, set" sequence
- No lifting in lineouts below U13
- Rolling substitutions mandatory at mini/midi level
- Concussion protocols: immediate and permanent removal (GRTP)

Key Development Principles:
- Core skills: catch, pass, run, tackle technique, body position
- Game understanding through small-sided, conditioned games
- Physical literacy before rugby-specific fitness
- Character development: teamwork, respect, sportsmanship, discipline
- Enjoyment is the primary driver of retention`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 3) { // U7-U8
      return `RFU GUIDANCE - MINI RUGBY (Years 2-3 / U7-U8):
- TAG RUGBY ONLY: absolutely no contact, no tackling
- 4v4 or 7v7 on a small pitch
- No scrums, no lineouts, no kicking in play
- Focus: running with the ball, evading, catching, passing
- All games should be fun, inclusive, with equal playing time
- Scoring: every try celebrated equally
- Training: tag games, running games, basic ball handling
- Keep sessions to 45 minutes maximum`
    }
    if (yearGroup <= 5) { // U9-U10
      return `RFU GUIDANCE - MIDI RUGBY (Years 4-5 / U9-U10):
- Gradual contact introduction: U9 starts uncontested 3-person scrums
- U10 introduces contested rucks
- 7v7 or 9v9 format, appropriate pitch size
- Tackle technique is paramount: cheek to cheek, ring of steel, safe body position
- No competitive scrums yet at U9, introduced at U10 under supervision
- Focus: tackle technique drills (on bags first), basic passing, support play
- Training: lots of evasion games, tackle technique in controlled environments
- Safety first: any player uncomfortable with contact must not be forced`
    }
    if (yearGroup <= 7) { // U11-U12
      return `RFU GUIDANCE - MIDI/JUNIOR RUGBY (Years 6-7 / U11-U12):
- Contested scrums introduced, lineouts begin
- 12v12 or 15v15 depending on age
- Tactical kicking begins at U12
- Focus: set piece basics, positional understanding, team shape
- Decision-making: when to run, pass, or kick
- Physical: growth awareness, strength and conditioning introduction
- Training: game-realistic scenarios, positional understanding, set piece basics
- Equal playing time still encouraged at school level`
    }
    return `RFU GUIDANCE - JUNIOR/COLTS RUGBY (Year ${yearGroup} / U${yearGroup + 5}):
- Full 15-a-side game with age-appropriate law variations
- Tactical development: set pieces, defensive systems, attack patterns
- Forward/back specialisation appropriate but encourage versatility
- Physical: structured strength and conditioning, injury prevention
- Concussion awareness and management protocols essential
- Leadership and decision-making on the field
- Respect for the referee and opponents is non-negotiable`
  }
}

// ==========================================
// CRICKET (ECB)
// ==========================================
export const cricketGuidance = {
  framework: `CRICKET DEVELOPMENT FRAMEWORK (ECB):
Based on ECB Inspiring Generations strategy and ECB Player Pathway.

Development Phases:
- All Stars Cricket (U5-U8): Fun introduction, soft ball, basic skills
- Dynamos Cricket (U8-U11): Pairs cricket format, developing core skills
- Junior Cricket (U11-U15): Hardball transition, competitive formats
- Youth Cricket (U15-U19): Adult-format pathway, specialisation

ECB Fast Bowling Directives (mandatory):
- U13: max 5 overs per spell, 10 overs per day
- U14-U15: max 6 overs per spell, 12 overs per day
- U16-U17: max 7 overs per spell, 18 overs per day
- U18-U19: max 7 overs per spell, 18 overs per day
- A spell is ended by rest from bowling, not by changing ends
- Fast bowlers must have adequate rest between spells

Key Development Principles:
- Bat, bowl, field: all players develop all three skills
- Do not specialise too early (before U13)
- Soft ball to hardball transition at U10-U11 (managed carefully)
- Game formats progress: pairs cricket, incremental cricket, time/overs cricket
- Equal opportunity: every player bats and bowls in development cricket
- Safeguarding: helmet mandatory for batting and close fielding (U18 and below)`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 3) { // U7-U8
      return `ECB GUIDANCE - ALL STARS CRICKET (Years 2-3 / U7-U8):
- Soft ball only (incrediball or windball)
- Fun activity stations: batting off a tee, target throwing, catching games
- No competitive matches, purely skills and fun
- Sessions: 45 minutes maximum, high activity, minimal queuing
- Every child bats, every child bowls, every child fields
- Parents encouraged to participate
- Focus: hand-eye coordination, throwing, catching, basic batting stance`
    }
    if (yearGroup <= 6) { // U9-U11
      return `ECB GUIDANCE - DYNAMOS CRICKET (Years 4-6 / U9-U11):
- Pairs cricket format: everyone bats, everyone bowls
- Transition from soft to hard ball begins at U10-U11 (school discretion)
- Helmet mandatory when batting against hard ball
- Focus: grip, stance, backlift, basic bowling action, fielding positions
- Bowling: encourage variety (pace and spin), correct action over speed
- Batting: play straight, watch the ball, basic shot selection
- No fast bowling restrictions yet but monitor workloads
- Training: nets, throwdowns, fielding circuits, small-sided games`
    }
    if (yearGroup <= 9) { // U12-U14
      return `ECB GUIDANCE - JUNIOR CRICKET (Years 7-9 / U12-U14):
- Hardball cricket, competitive formats
- ECB bowling directives apply: monitor overs carefully
- U13: max 5 overs per spell, 10 per day
- Specialisation beginning but all players should still bat and bowl
- Tactical awareness: field placing, bowling plans, batting partnerships
- Physical: bowling action biomechanics, injury prevention
- Helmet mandatory for batting and close fielding
- Training: structured nets, match simulation, tactical scenarios`
    }
    return `ECB GUIDANCE - YOUTH CRICKET (Year ${yearGroup} / U${yearGroup + 5}):
- Full competitive formats, declaration/timed games at senior level
- ECB bowling directives strictly enforced
- Specialisation appropriate: batting order, bowling roles, keeping
- Tactical sophistication: game management, pressure situations, captaincy
- Physical: strength and conditioning, bowling workload management
- Mental: handling pressure, concentration over long periods
- Encourage county pathway engagement where appropriate`
  }
}

// ==========================================
// HOCKEY (ENGLAND HOCKEY)
// ==========================================
export const hockeyGuidance = {
  framework: `HOCKEY DEVELOPMENT FRAMEWORK (ENGLAND HOCKEY):
Based on England Hockey Player Pathway and development guidelines.

Development Phases:
- Quick Sticks (U7-U9): Small-sided, indoor/outdoor, fun introduction
- In2Hockey (U10-U12): 7-a-side, developing core skills and game understanding
- Junior Hockey (U13-U16): Full 11-a-side, tactical development
- Youth Hockey (U16-U18): Performance pathway, adult-level game

Key Development Principles:
- All players play across the pitch (not fixed positions until U13+)
- Left-hand dominant stick: no reverse stick hitting at young ages
- Progressive skill development: dribbling, pushing, hitting, receiving
- Small-sided games as primary learning tool
- Fun and enjoyment, especially at Quick Sticks and In2Hockey levels
- Goalkeeper development: specialisation from U12, all players experience it before then

Safety Rules:
- Raised balls: strict rules at junior level, ball must not be raised dangerously
- Protective equipment: shin pads mandatory, goalkeeper full kit
- No body contact: hockey is a non-contact sport
- Stick below shoulder height at all times (below waist at junior level)`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 4) { // U7-U9
      return `ENGLAND HOCKEY GUIDANCE - QUICK STICKS (Years 2-4 / U7-U9):
- 4v4, small pitch, soft ball or indoor ball
- No goalkeeper at this level
- Focus: grip, dribbling, basic push pass, stopping the ball
- Fun games and relays, minimal standing around
- All players rotate positions
- No hitting (push/slap only)
- Sessions: 30-45 minutes, high energy, inclusive`
    }
    if (yearGroup <= 7) { // U10-U12
      return `ENGLAND HOCKEY GUIDANCE - IN2HOCKEY (Years 5-7 / U10-U12):
- 7v7 format, appropriate pitch size
- Goalkeeper introduced (with full protective equipment)
- Focus: push pass, receiving, basic dribbling under pressure, shooting
- Introduce: basic positional play (attack, midfield, defence)
- Small-sided games: 3v3, 4v4, 5v5 for skill development
- No hitting until U11-U12 (school policy dependent)
- Fun and development focused, encourage trying different positions`
    }
    return `ENGLAND HOCKEY GUIDANCE - JUNIOR/YOUTH HOCKEY (Year ${yearGroup} / U${yearGroup + 5}):
- 11-a-side, full pitch
- Tactical development: set plays, penalty corners, pressing, transitions
- Positional specialisation appropriate from U14+
- Skills: hitting, aerial balls (controlled), 3D skills, elimination
- Physical: speed, agility, endurance (hockey-specific conditioning)
- Goalkeeper coaching: specific sessions, shot-stopping, distribution
- Understand: self-pass rule, rolling subs, green/yellow/red cards`
  }
}

// ==========================================
// NETBALL (ENGLAND NETBALL)
// ==========================================
export const netballGuidance = {
  framework: `NETBALL DEVELOPMENT FRAMEWORK (ENGLAND NETBALL):
Based on England Netball development guidelines and pathway.

Development Phases:
- High 5 Netball (U9-U11): Modified rules, rotating positions, fun introduction
- Junior Netball (U11-U14): Standard 7-a-side, developing game understanding
- Youth Netball (U14-U18): Full competitive game, performance pathway

Key Rules and Principles:
- 7-a-side: GK, GD, WD, C, WA, GA, GS
- Positional areas: each position restricted to specific thirds of the court
- Contact rule: no physical contact allowed (penalty for contact/obstruction)
- Footwork: landing foot rule (no travelling with the ball)
- 3-second possession: must pass or shoot within 3 seconds of receiving
- Centre pass alternates between teams after each goal

Development Principles:
- All players experience all positions in development phases (High 5)
- Core skills: catching, passing (chest, bounce, shoulder), footwork, shooting
- Movement: leading, driving, changing direction, timing of movement
- Game understanding: space creation, attacking and defending principles
- Fitness: netball-specific agility, speed off the mark, change of direction
- Shooting technique: balanced stance, high release, follow through`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 4) { // U7-U9
      return `ENGLAND NETBALL GUIDANCE - INTRODUCTORY (Years 2-4 / U7-U9):
- Fun ball-handling games, not formal netball yet
- Focus: throwing and catching, basic footwork, spatial awareness
- Small-sided games: 3v3, 4v4 with modified rules
- No positional restrictions, let everyone play everywhere
- Short sessions (30-45 min), high activity, lots of touches
- Use size 4 ball (smaller and lighter)
- Focus on enjoyment and developing basic movement skills`
    }
    if (yearGroup <= 6) { // U10-U11
      return `ENGLAND NETBALL GUIDANCE - HIGH 5 NETBALL (Years 5-6 / U10-U11):
- High 5 format: 5-a-side, rotating positions each quarter
- EVERY player must play in ALL positions across a match
- Shorter quarters (6 minutes each)
- Focus: landing foot rule, 3-second rule, basic positional awareness
- Passing: chest pass, bounce pass, introduce shoulder pass
- Shooting: balanced stance, technique over power
- Training: lots of SSGs, catching/passing drills with movement`
    }
    if (yearGroup <= 9) { // U12-U14
      return `ENGLAND NETBALL GUIDANCE - JUNIOR NETBALL (Years 7-9 / U12-U14):
- Standard 7-a-side, full court, 15-minute quarters
- Positional understanding developing: thirds of court, area restrictions
- Focus: movement off the ball, driving, change of pace/direction
- Tactical: centre pass plays, defensive positioning, transitions
- Shooting: consistency, technique under pressure
- Fitness: netball-specific agility, footwork ladders, reaction drills
- Encourage versatility but allow some positional preference`
    }
    return `ENGLAND NETBALL GUIDANCE - YOUTH NETBALL (Year ${yearGroup} / U${yearGroup + 5}):
- Full competitive format, regional/national pathways
- Tactical sophistication: team strategies, set plays, defensive systems
- Positional specialisation with tactical flexibility
- Physical: advanced speed/agility training, injury prevention
- Mental: game management, decision-making under pressure, leadership
- Shooting: advanced techniques, pressure shooting, goal percentage targets
- Encourage pathway engagement (satellite academies, county squads)`
  }
}

// ==========================================
// SPORT SELECTOR
// ==========================================
const sportModules = {
  football: footballGuidance,
  rugby: rugbyGuidance,
  cricket: cricketGuidance,
  hockey: hockeyGuidance,
  netball: netballGuidance,
}

/**
 * Get the development framework text for a sport.
 * Used as a baseline in the AI system prompt.
 */
export function getSportFramework(sport) {
  const module = sportModules[sport]
  if (!module) return ''
  return module.framework
}

/**
 * Get age-appropriate guidance for a sport and year group.
 * Injected into the AI system prompt alongside the framework.
 */
export function getSportAgeGuidance(sport, yearGroup) {
  const module = sportModules[sport]
  if (!module) return ''
  return module.getAgeGuidance(yearGroup)
}

/**
 * Get the governing body name for a sport.
 */
export function getSportGoverningBody(sport) {
  const bodies = {
    football: 'The Football Association (FA) and UEFA',
    rugby: 'Rugby Football Union (RFU)',
    cricket: 'England and Wales Cricket Board (ECB)',
    hockey: 'England Hockey',
    netball: 'England Netball',
  }
  return bodies[sport] || ''
}

/**
 * List all supported sports.
 */
export const SUPPORTED_SPORTS = ['football', 'rugby', 'cricket', 'hockey', 'netball']
