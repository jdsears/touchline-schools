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
// ATHLETICS (ENGLAND ATHLETICS)
// ==========================================
export const athleticsGuidance = {
  framework: `ATHLETICS DEVELOPMENT FRAMEWORK (ENGLAND ATHLETICS):
Based on England Athletics development guidance, Funetics, and the Athletics 365 multi-event framework.

Development Phases:
- Funetics / Fundamentals (ages 4-11): running, jumping and throwing through play and games
- Athletics 365 (ages 8-15): multi-event skill development across all event groups
- Event Group Development (U15-U17): sprints, endurance, jumps, throws - broad within group
- Event Specialisation (U17+): event-specific training and competition focus

Key Development Principles:
- Multi-event development before specialisation: athletes should experience sprints, endurance, jumps and throws every term
- Do NOT specialise in a single event before ~age 14; early specialisation harms long-term development
- Technique before load: sprint mechanics, take-off shapes, and throwing actions taught with light/modified equipment
- Age-appropriate implements: lighter shots, foam javelins/howlers, modified discus at primary and early secondary
- Jumping safety: scissors technique before Fosbury flop; flop only with appropriate landing area and supervision
- Endurance through play and varied paces, not high-mileage grinding (especially primary age)
- Competition formats: Sportshall (indoor team, U11/U13/U15), Quadkids (4-event team scoring), track and field with age-group rules
- Relative age and growth: sprint and jump performance fluctuates through growth spurts - judge technique, not just times/distances`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 6) { // primary
      return `ENGLAND ATHLETICS GUIDANCE - FUNDAMENTALS (Years 2-6):
- Run/jump/throw through games and relays, not formal event training
- Sportshall and Quadkids style team formats: everyone competes, team scoring
- Throwing: foam javelins/howlers, light balls, bean bags; strict safety lines and throwing on command only
- Jumping: standing long jump, scissors over low elastic; soft landing areas
- Running: short sprints, agility and relay races, fun paced runs (no laps-as-punishment)
- Score effort and personal improvement, not just placings`
    }
    if (yearGroup <= 9) { // KS3
      return `ENGLAND ATHLETICS GUIDANCE - MULTI-EVENT DEVELOPMENT (Years 7-9 / U12-U14):
- Athletics 365 approach: every athlete experiences all event groups each cycle
- Teach sprint mechanics (drive, posture, arm action), relay changeovers, hurdle rhythm over low hurdles
- Jumps: long jump approach and take-off, high jump scissors -> flop progression only with proper landing beds
- Throws: shot (age-appropriate weight), discus and javelin technique with modified implements; strict throwing-area discipline
- Endurance: varied-pace work, 800m-1500m race experience; avoid high mileage
- Quadkids and Sportshall competitions; introduce English Schools' age-group rules`
    }
    return `ENGLAND ATHLETICS GUIDANCE - EVENT GROUP DEVELOPMENT (Year ${yearGroup} / U${yearGroup + 5}):
- Develop within an event GROUP (sprints/endurance/jumps/throws) while keeping a second event
- Implement weights and hurdle heights per English Schools'/UKA age-group specifications
- Introduce structured training: acceleration work, plyometric foundations, throws technique under load
- Growth-related injury awareness (Osgood-Schlatter, Sever's): manage volume during growth spurts
- Competition pathway: school -> district -> county -> English Schools' Championships
- Officiating and self-management: athletes learn rules, check-in procedures, warm-up routines`
  }
}

// ==========================================
// BASKETBALL (BASKETBALL ENGLAND)
// ==========================================
export const basketballGuidance = {
  framework: `BASKETBALL DEVELOPMENT FRAMEWORK (BASKETBALL ENGLAND):
Based on Basketball England development guidance, Mini Basketball, and the Jr. NBA schools programme.

Development Phases:
- Mini Basketball (U11): modified game - size 5 ball, lower rings (2.60m), simplified rules
- Junior Development (U12-U14): transition to full rules, fundamental skill consolidation
- Youth Performance (U15-U18): tactical systems, athletic development, pathway competition

Mini Basketball Modifications (U11):
- Size 5 ball, ring height 2.60m where equipment allows
- Man-to-man defence only - NO zone defences (this continues through junior basketball)
- Equal playing time expectations; every player experiences different roles
- No three-point line emphasis; score inside play and good movement

Key Development Principles:
- Fundamentals before systems: dribbling (both hands), passing, footwork (pivot, triple threat), lay-ups both sides
- Ball size progression: size 5 (mini/primary), size 6 (typically U14 boys and all girls from U12), size 7 (boys ~U14+)
- Man-to-man defensive principles (stance, positioning, help) before any zone concepts
- Small-sided games (3v3 especially) maximise touches and decision-making; 3x3 is also a formal discipline
- Free-flowing play over set plays at school level: teach spacing, give-and-go, screening concepts progressively
- Respect officials; learn the rules (travelling, double dribble, fouls) through game play`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 6) { // primary
      return `BASKETBALL ENGLAND GUIDANCE - MINI BASKETBALL (Years 4-6 / U11):
- Size 5 ball, lowered rings (2.60m) where possible
- 4v4 or 5v5 with simplified rules; relaxed violations while learning
- Man-to-man only, no zones, no presses
- Focus: dribbling with head up, chest/bounce pass, pivoting, lay-up introduction
- High-activity practices: every child has a ball for skill work
- Equal playing time, rotate positions and roles`
    }
    if (yearGroup <= 9) { // KS3
      return `BASKETBALL ENGLAND GUIDANCE - JUNIOR BASKETBALL (Years 7-9 / U12-U14):
- Transition to full rules and standard rings; size 6 ball (size 5 -> 6 transition at U12)
- Man-to-man defence remains the rule and the teaching focus
- Fundamentals under pressure: both-hands finishing, jump stop, triple threat, on-ball defence
- Concepts: spacing, cutting, give-and-go, basic screening; fast-break lanes
- 3v3 games heavily - touches, decisions, conditioning
- Introduce shooting form work (BEEF/balance-eyes-elbow-follow-through style cues)`
    }
    return `BASKETBALL ENGLAND GUIDANCE - YOUTH BASKETBALL (Year ${yearGroup} / U${yearGroup + 5}):
- Full FIBA-aligned rules; size 7 (boys) / size 6 (girls) ball
- Tactical development: pick-and-roll basics, help-side defence, press offence/defence, set plays in moderation
- Athletic development: landing mechanics, change of direction, injury prevention (ankle/knee)
- Game management: time and score awareness, fouls management, timeout usage
- Pathway: school -> local league -> Basketball England club/regional competition
- Encourage officiating and table-official experience for game understanding`
  }
}

// ==========================================
// SWIMMING (SWIM ENGLAND)
// ==========================================
export const swimmingGuidance = {
  framework: `SWIMMING DEVELOPMENT FRAMEWORK (SWIM ENGLAND):
Based on the Swim England Learn to Swim Framework and School Swimming and Water Safety guidance.

Statutory Context (England):
- National curriculum requires that by the end of primary school pupils can: swim competently over at least 25 metres, use a range of strokes effectively, and perform safe self-rescue
- School swimming is the only statutory PE activity with defined outcomes - prioritise non-swimmers

Development Phases:
- Learn to Swim Stages 1-7: water confidence -> stroke foundations -> 25m+ proficiency across all four strokes
- Aquatic Skills Stages 8-10: stroke refinement and pathway into competitive/artistic/water polo/diving disciplines
- Club/Competitive Pathway: club development squads -> county -> regional -> national age groups

Key Development Principles:
- Water safety and self-rescue are core outcomes, not extras: floating, treading water, HELP position, safe entry/exit, calling for help
- Stroke development order: front crawl and backstroke foundations first; breaststroke timing and butterfly introduced progressively
- Technique before distance; distance before speed
- Short, frequent quality swims beat occasional long sessions
- SEND inclusion: swimming is often the most accessible PA for pupils with physical disabilities - adapt entry, support, and equipment
- Safety governance: appropriate lifeguard/teacher ratios, pool depth rules for diving entries, clear poolside behaviour codes
- Competitive introduction: club galas, school galas with stroke-law basics (legal turns, finishes, starts)`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 6) { // primary
      return `SWIM ENGLAND GUIDANCE - SCHOOL SWIMMING (Years 3-6):
- Target the statutory outcomes: 25m unaided, range of strokes, safe self-rescue
- Group by ability stage (Learn to Swim 1-7), not by age; prioritise non-swimmers
- Every lesson includes a water safety element (floating, treading, reach rescue, HELP position)
- Front crawl/backstroke foundations: body position, kick from hips, breathing patterns
- Use aids purposefully (noodles, floats) and remove them progressively
- Maximise active swim time; short distances with quality technique`
    }
    if (yearGroup <= 9) { // KS3
      return `SWIM ENGLAND GUIDANCE - AQUATIC DEVELOPMENT (Years 7-9):
- Audit and close gaps: some pupils will still not meet the 25m standard - provide catch-up
- Refine all four strokes: bilateral breathing, breaststroke timing, butterfly body undulation
- Introduce racing skills: dive starts (DEEP water only per pool rules), legal turns and finishes
- Personal survival skills: clothed swimming, surface dives, extended treading water
- Water polo / mini-polo and relays add game-based engagement
- Signpost club pathway for swimmers beyond Stage 7`
    }
    return `SWIM ENGLAND GUIDANCE - COMPETITIVE/LIFESTYLE SWIMMING (Year ${yearGroup}):
- Two tracks: competitive development (stroke law, pacing, training sets) and lifelong fitness/safety
- Training structure: warm-up, technique set, main set, swim-down; stroke-count and pacing awareness
- Lifesaving qualifications (e.g. Rookie Lifeguard/RLSS awards) as leadership options
- Officiating/timekeeping roles at galas build engagement
- Safety leadership: pupils articulate open-water dangers (cold shock, currents, Float to Live)
- Maintain stroke breadth even for swimmers who favour one stroke or distance`
  }
}

// ==========================================
// GYMNASTICS (BRITISH GYMNASTICS)
// ==========================================
export const gymnasticsGuidance = {
  framework: `GYMNASTICS DEVELOPMENT FRAMEWORK (BRITISH GYMNASTICS):
Based on British Gymnastics schools guidance (Rise Gymnastics) and fundamental movement development.

Development Phases:
- Foundation movement (KS1): shapes, travels, balances, rolls through exploration
- Skill development (KS2): rolls, cartwheels, balances, low apparatus, sequences
- Technical development (KS3+): progressions to inverted skills, flight, apparatus work, composition

Core Content Strands:
- Shapes: tuck, pike, straddle, straight, star, dish, arch - the alphabet of gymnastics
- Travels and rolls: log, egg, forward, backward (with progressions), teddy-bear roll
- Balances: points and patches, partner balances (counter-balance/counter-tension), headstand/handstand progressions
- Flight: jumps with shape, landings BEFORE height, vault progressions
- Sequence and composition: linking movements with control, levels, speed and direction changes

Critical Safety Rules:
- Landings first: teach safe landing mechanics (bent knees, feet together, arms forward) before any height/flight work
- Headstands/handstands: wall and partner progressions; mats appropriate; no pressure on neck for forward roll (chin to chest, weight on shoulders)
- NO somersaults or flight-to-inversion skills without a suitably qualified gymnastics coach and appropriate matting
- Apparatus: check, carry and set up correctly; height appropriate to ability; supervised at all times
- Jewellery removed, hair tied back, bare feet or gym shoes (no socks on apparatus)
- Spotting/support only with taught technique - never improvised manual support of inverted skills`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 6) {
      return `BRITISH GYMNASTICS GUIDANCE - PRIMARY GYMNASTICS (Years 1-6):
- Explore shapes, travels, balances, rolls; quality of body tension and extension over difficulty
- Forward roll progressions (rock and roll, down a slope) - never force; backward roll only with progressions
- Points and patches balances, partner balances at KS2 (counter-balance introduced carefully)
- Low apparatus: benches, low beams, padded boxes; jumping AND landing with shape
- Short sequences: 4-6 elements with a clear start and finish position
- High activity, minimal queuing: stations with mats for all`
    }
    if (yearGroup <= 9) {
      return `BRITISH GYMNASTICS GUIDANCE - KS3 GYMNASTICS (Years 7-9):
- Refine rolls, cartwheel -> round-off progressions, headstand/handstand against wall -> free
- Vault progressions on suitable equipment: squat-on, straddle-over only when take-off and landing are secure
- Flight with shape from height (controlled): tuck/star/pike jumps off boxes with stuck landings
- Partner/group balances: counter-balance and counter-tension, safe building and dismounting order
- Composition: unison/canon, levels, pathways; peer assessment against criteria
- Strength and flexibility foundations: core tension (dish/arch holds), shoulder and hamstring mobility`
    }
    return `BRITISH GYMNASTICS GUIDANCE - KS4+ GYMNASTICS (Year ${yearGroup}):
- Personalised skill development: students select apparatus/skill families suited to their ability
- Advanced skills (flight, inversion combinations) ONLY with qualified coaching support and correct matting
- Leadership: students lead warm-ups, judge sequences against criteria, choreograph group routines
- Trampolining (if offered) requires specifically qualified staff - one bouncer at a time, spotters trained
- Link to exam PE: analysis of movement, biomechanics of rotation, aesthetic appreciation
- Lifelong link: conditioning, mobility and body management for any sport`
  }
}

// ==========================================
// TENNIS (LTA)
// ==========================================
export const tennisGuidance = {
  framework: `TENNIS DEVELOPMENT FRAMEWORK (LTA):
Based on LTA Youth and the international red/orange/green/yellow ball progression.

Stage Progression (by age and competence):
- Red (typically 8 & under): mini court (badminton-size), red felt/foam ball (75% slower), 17-23" rackets
- Orange (typically 9 & under): 3/4 court, orange ball (50% slower), 23-25" rackets
- Green (typically 10 & under): full court, green ball (25% slower), 25-26" rackets
- Yellow (11+): full court, standard ball - only when ready; many beginners at ANY age start on slower balls

Key Development Principles:
- The slower-ball progression is the single most important tool: it makes rallying achievable, which is where learning happens
- Serve, rally, score from the first lesson: game-based learning over isolated technique queues
- Fundamental priorities: ready position, racket-head control, contact point in front, recovery after each shot
- Rally cooperation before competition: count consecutive rallies, then introduce point play
- Whole-class formats: tarmac/playground tennis with lines/cones, sponge balls indoors - no courts required
- Competition: team tennis formats and individual box leagues; match-play etiquette (self-umpiring, line calls, scoring)
- Older beginners still start with slower balls - stage by competence, not just age`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 6) {
      return `LTA GUIDANCE - RED/ORANGE STAGE (Years 1-6):
- Red ball mini-courts (or cones/lines on playground); short rackets sized to the child
- Rally-based games: floor tennis, throw-catch tennis -> racket feeds -> cooperative rallies
- Underarm serve to start every point; simple first-to-7 scoring
- Develop: ready position, sideways hitting stance, gentle racket-head control, tracking the ball
- Orange stage (upper KS2): bigger court, introduce basic serve action and rally tactics (deep vs short)
- Every child plays every lesson - doubles and team formats keep activity high`
    }
    if (yearGroup <= 9) {
      return `LTA GUIDANCE - GREEN/YELLOW TRANSITION (Years 7-9):
- Stage by competence: many beginners should still rally with green (or orange) balls
- Technique within game play: forehand/backhand swing shape, overarm serve progression, volley introduction
- Tactics: consistency first, then placement (deep, wide), approach-and-volley basics
- Scoring: full tennis scoring, tie-breaks, self-umpired match play with etiquette
- Doubles formats maximise court usage; rotate partners
- Box leagues and team tennis for sustained competition`
    }
    return `LTA GUIDANCE - YELLOW BALL DEVELOPMENT (Year ${yearGroup}):
- Full-court yellow ball play for competent players; slower balls remain a teaching tool for new starters
- Shot development: spin (topspin drive, slice), serve placement and second-serve reliability
- Tactical play: patterns (serve+1), defending vs attacking court positions, doubles formations
- Physical: split-step timing, lateral movement, shoulder care for serving loads
- Leadership: pupils run box leagues, umpire matches, coach red-ball groups
- Signpost LTA Youth clubs and competitions for development beyond school`
  }
}

// ==========================================
// BADMINTON (BADMINTON ENGLAND)
// ==========================================
export const badmintonGuidance = {
  framework: `BADMINTON DEVELOPMENT FRAMEWORK (BADMINTON ENGLAND):
Based on Badminton England schools programmes (Racket Pack primary, Smash Up! secondary).

Development Phases:
- Racket Pack (primary): fun, game-based racket-skill foundations
- Smash Up! (secondary): fast, social, challenge-based badminton for engagement
- Club/Performance Pathway: junior club -> county -> regional performance centres

Key Development Principles:
- Racket familiarity first: balloon/shuttle balancing, tap-ups, partner feeds before full-court play
- Grip fundamentals: relaxed forehand ("handshake") and thumb-up backhand grip; grip changes are the gateway skill
- Serve rules taught early: underarm action, below the waist, diagonal service courts
- Half-court singles is the core school format: maximises court usage and rally relevance
- Shot progression: high serve, overhead clear -> drop shot -> net shot -> smash (introduce smash last)
- Movement: split-step base, chasse to corners, lunge at the net, recover to base every shot
- Modified equipment: slower/plastic shuttles for beginners; lower nets acceptable for KS1-2
- Scoring: rally scoring to 21 (or shorter games to 11/15 for rotation); umpire your own games`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 6) {
      return `BADMINTON ENGLAND GUIDANCE - RACKET PACK (Years 2-6):
- Racket-skill stations: shuttle balancing, tap-ups, throw-hit rallies over low nets/benches
- Balloon badminton and slow shuttles make rallies achievable
- Underarm serve and cooperative rally counting (beat your record)
- Light, short rackets; one between two maximum
- Simple half-court games with relaxed rules once rallying emerges
- Celebrate rally length and improvement, not just winners`
    }
    if (yearGroup <= 9) {
      return `BADMINTON ENGLAND GUIDANCE - KS3 / SMASH UP! (Years 7-9):
- Half-court singles as the default; rotate via ladder/king-of-the-court formats
- Teach: high serve, overhead clear, drop shot, net shot; introduce smash once clears are sound
- Grips checked constantly - forehand/backhand grip change drills
- Movement: base position, split-step, lunge recovery
- Rally scoring, service rules and faults; pupils umpire and score
- Doubles introduction: sides vs front-and-back basics`
    }
    return `BADMINTON ENGLAND GUIDANCE - KS4+ BADMINTON (Year ${yearGroup}):
- Full-court singles and doubles with tactical intent: attack from rear court, defend the smash, net pressure
- Doubles systems: serve and return formations, rotation between attack (front/back) and defence (sides)
- Deception and variation: slice drops, flick serves, punch clears
- Conditioning: multi-shuttle feeding, shadow movement patterns
- Leadership: organise ladders, umpire, coach younger groups
- Signpost local club and county pathways`
  }
}

// ==========================================
// ROUNDERS (ROUNDERS ENGLAND)
// ==========================================
export const roundersGuidance = {
  framework: `ROUNDERS DEVELOPMENT FRAMEWORK (ROUNDERS ENGLAND):
Based on Rounders England rules and schools guidance.

Game Essentials:
- 9 players a side (school variants flexible); innings-based; batting square, bowling square, 4 posts
- Legal bowl: smooth underarm action, ball between knee and head height, inside the batting square, no bouncing
- Scoring: 1 rounder (hit and reach 4th post), 1/2 rounder (reach 4th without hit, or reach 2nd post after a hit), penalty 1/2 rounders for no-balls
- Out: caught, stumped out at post running to, run out, obstruction; batters must keep contact with post until next bowl

Key Development Principles:
- Striking and fielding literacy: throwing, catching, tracking, ground fielding transfer across cricket/softball
- Maximise involvement: small-sided versions (5-6 a side), everyone bats each innings, rotate fielding positions including backstop and bowler
- Batting: one-handed grip, watch the ball, hit into space (placement over power), run on every hit decision-making
- Bowling: consistent legal action first, then variation (pace, height within legal zone, spin)
- Fielding: backstop technique, post-player footwork (ball before foot on post), deep fielders' long barrier and overarm return
- Safety: batters carry the bat (never thrown), waiting batters behind the line, no jewellery, post bases stable
- Modify for ability: bigger/softer balls, batting tees or drop-feeds, shorter pitch distances at primary`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 6) {
      return `ROUNDERS ENGLAND GUIDANCE - PRIMARY ROUNDERS (Years 3-6):
- Modified games: 5-6 a side, big soft ball, everyone bats every innings
- Striking from a tee or gentle drop-feed before live bowling
- Throwing/catching circuits and target games every lesson
- Simple rules: hit and run to 1st post, build to full post-running
- Rotate every role including bowler and backstop
- Score team rounders collectively - celebrate fielding stops as much as hits`
    }
    if (yearGroup <= 9) {
      return `ROUNDERS ENGLAND GUIDANCE - KS3 ROUNDERS (Years 7-9):
- Full rules introduced: legal bowling action, no-ball calls, post-running and contact rules
- Batting: placement into space, choosing when to run, backward hit rules
- Bowling: accuracy under the legal zone, introduce pace/height variation
- Fielding systems: backstop + post players' stumping chains, deep field coverage, relay throws
- Small-sided versions retained for touches; full 9v9 for fixtures
- Pupils umpire (bowler's and batter's square umpires) to learn the laws`
    }
    return `ROUNDERS ENGLAND GUIDANCE - KS4+ ROUNDERS (Year ${yearGroup}):
- Tactical play: batting orders, targeting weaker field zones, sacrifice running decisions
- Advanced fielding: pre-set plays for likely hits, communication systems, cut-off throws
- Bowling variation as a weapon: spin, pace change, legal height extremes
- Fitness through fielding circuits and sprint-running between posts
- Leadership: pupils captain, set fields, umpire full games
- Inter-form and district competition; link to Rounders England club opportunities`
  }
}

// ==========================================
// DANCE (NATIONAL CURRICULUM PE / ONE DANCE UK)
// ==========================================
export const danceGuidance = {
  framework: `DANCE DEVELOPMENT FRAMEWORK (NC PE / ONE DANCE UK):
Based on national curriculum PE dance requirements and One Dance UK education guidance.

Three Strands (all key stages):
1. Performing: technical control, musicality, expression, performance presence
2. Creating/Choreographing: generating movement from stimuli, using choreographic devices
3. Appreciating: describing, analysing and evaluating dance using appropriate vocabulary

Progression Expectations:
- KS1: simple movement patterns, respond to music/stimuli, perform with control
- KS2: compose phrases, use canon/unison/levels/pathways, perform with expression, evaluate peers
- KS3: advanced techniques in specific styles, longer compositions, professional work analysis
- KS4+: refined performance and choreography; links to GCSE Dance and vocational pathways

Key Principles:
- Stimulus-led creation: music, words, images, props, themes - movement generated by pupils, not just copied
- Choreographic devices: unison, canon, repetition, retrograde, levels, dynamics, formations, contact work (taught safely)
- Style breadth: creative/contemporary core plus cultural and social styles (e.g. street, Bhangra, capoeira-influenced, ballroom basics)
- Safe practice: structured warm-up, safe landing/rolling technique, no high lifts without taught progressions, appropriate flooring
- Performance for an audience (even just the class) every unit; filming for self-evaluation where school policy allows
- Inclusive by design: dance is assessable on individual quality of movement, not physical prowess`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 6) {
      return `DANCE GUIDANCE - PRIMARY (Years 1-6):
- Respond to varied stimuli (music, stories, weather, animals) with whole-body movement
- Build phrases of 4-8 counts; practise, refine, perform to the class
- Devices: unison, mirroring, levels (high/medium/low), simple canon at upper KS2
- Action words: travel, turn, jump, gesture, stillness - vary speed and size
- Warm-up rituals every lesson; bare feet or suitable footwear; clear spacing
- Evaluate with two stars and a wish using dance vocabulary`
    }
    if (yearGroup <= 9) {
      return `DANCE GUIDANCE - KS3 (Years 7-9):
- Technique development within styles (contemporary release/contraction, street foundations, cultural forms)
- Choreograph in pairs/groups from abstract stimuli; use retrograde, fragmentation, formation change
- Contact work and weight-sharing with taught progressions and trust-building
- Musicality: counts, phrasing, accenting beats vs moving through them
- Analyse professional repertoire (live or filmed): action, space, dynamics, relationships
- Perform every unit; structured peer feedback against shared criteria`
    }
    return `DANCE GUIDANCE - KS4+ (Year ${yearGroup}):
- Extended choreography: develop motifs through a full piece with clear intent
- Performance skills: projection, focus, stamina, style-specific precision
- Safe practice leadership: students lead warm-ups and risk-assess contact/lift work
- Critical appreciation using professional works as reference points
- Links: GCSE/A-level Dance, BTEC performing arts, community dance leadership
- Celebrate showcase opportunities (assemblies, school productions, local festivals)`
  }
}

// ==========================================
// VOLLEYBALL (VOLLEYBALL ENGLAND)
// ==========================================
export const volleyballGuidance = {
  framework: `VOLLEYBALL DEVELOPMENT FRAMEWORK (VOLLEYBALL ENGLAND):
Based on Volleyball England schools guidance and mini-volleyball progressions.

Development Progression:
- Catch-throw volleyball (introduction): 1v1/2v2 over a low net, catching allowed - teaches court movement and tactics
- Mini volleyball (2v2/3v3/4v4): small courts, lower nets, lighter balls; volley and dig develop
- 6v6 transition (KS3+): rotation, positions, three-touch play
- Formats: indoor 6v6, beach/grass doubles, sitting volleyball (fully inclusive format)

Key Development Principles:
- Three-touch culture from the start: dig/receive -> set -> attack; reward teams that use three touches
- Skill order: volley (set) shape first, underarm serve, dig/forearm pass, then overarm serve, spike and block last
- Lighter/softer balls and lower nets remove fear and enable rallies; progress equipment as control grows
- Small courts and small teams = more touches; 4v4 is the ideal school format
- Rotation and serving order teach the unique positional structure of the game
- Rally scoring (point every rally) keeps games moving; first to 15/21/25 by context
- Sitting volleyball: outstanding inclusion tool and a serious Paralympic discipline - use it for mixed-ability units`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 6) {
      return `VOLLEYBALL ENGLAND GUIDANCE - PRIMARY INTRODUCTION (Years 4-6):
- Balloon and beach-ball rallies, catch-throw games over low nets/benches
- 1v1 and 2v2 tiny courts: throw-catch -> throw-volley -> volley-volley progressions
- Volley shape: triangle window above forehead, extend through the ball
- Underarm serve from close range; move back as success grows
- Count cooperative rally records before competitive points
- High-activity circuits: every pair has a ball and a 'net' (bench, rope, line)`
    }
    if (yearGroup <= 9) {
      return `VOLLEYBALL ENGLAND GUIDANCE - KS3 MINI-VOLLEYBALL (Years 7-9):
- 3v3/4v4 on badminton-court footprints, net ~2m, soft training balls
- Dig (forearm pass) technique: platform, legs not arms, angle to target
- Three-touch play rewarded (bonus point schemes work well)
- Overarm serve introduction once underarm is consistent
- Spike from a setter's feed - approach footwork (left-right-left for right-handers), arm swing
- Rotation basics and simple positional play (setter at net)`
    }
    return `VOLLEYBALL ENGLAND GUIDANCE - 6v6 VOLLEYBALL (Year ${yearGroup}):
- Full 6v6 with rotation, serving order, and positional fault rules
- Systems: W-receive pattern, setter penetration basics (e.g. simple 4-2), block + cover
- Skills under pressure: jump serve/float serve options, spike vs tip decisions, defensive digging
- Beach/grass doubles and sitting volleyball as format breadth
- Officiating: first referee hand signals, scoring, line judging by pupils
- Pathway: Volleyball England junior clubs and competitions`
  }
}

// ==========================================
// CROSS COUNTRY (ENGLAND ATHLETICS)
// ==========================================
export const crossCountryGuidance = {
  framework: `CROSS COUNTRY DEVELOPMENT FRAMEWORK (ENGLAND ATHLETICS):
Based on England Athletics endurance development guidance and English Schools' cross country structures.

Development Principles:
- Endurance through enjoyment: varied, game-based aerobic work for younger pupils - NOT high mileage
- Age-appropriate distances: school races typically ~1-2km (primary), building to ~3-6km by senior school age groups (English Schools' distances vary by age/gender)
- Develop the aerobic base with varied paces: steady runs, fartlek (speed-play), short hills, relays
- Running technique matters: posture, cadence, relaxed shoulders, uphill/downhill technique
- Pacing is the key racing skill: teach even-pace and negative-split strategies; practise race starts (fast-out, settle)
- Avoid early specialisation: cross country athletes should also sprint, jump and play games
- Growth awareness: endurance training load must respect growth spurts; aches at growth plates = reduce load
- Race-day skills: course walking, layered clothing, warm-up routine, spikes/trail shoe choice by ground

Safety and Welfare:
- Course risk assessment: terrain, traffic, water hazards, marshalling points, sweep runner
- Weather protocols: cold/wet kit requirements, heat modifications
- Inclusion: distance options, walk-run formats, personal-best culture over placing culture`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 6) {
      return `CROSS COUNTRY GUIDANCE - PRIMARY (Years 3-6):
- Distances ~1-2km maximum in races; training through games (stuck in the mud, relays, scavenger runs)
- Run-walk progressions for developing runners - finishing feeling good builds runners
- Daily Mile culture: regular easy running normalises the activity
- Teach simple pacing: "start like a snail, finish like a cheetah"
- Off-road experience: grass, trails, gentle hills in school grounds
- Celebrate participation and personal improvement publicly`
    }
    if (yearGroup <= 9) {
      return `CROSS COUNTRY GUIDANCE - KS3 (Years 7-9 / U13-U14):
- Race distances ~2.5-4km depending on age/gender; train below race distance mostly
- Structured variety: one steady run, one fartlek/hills, one games-based session per cycle
- Pacing practice: even-pace challenges with predicted-time scoring (closest to prediction wins)
- Hill technique: short drive uphill, controlled lean downhill
- District and county trials pathway; team scoring formats (first 4-6 score) build squad ethos
- Watch training load during growth spurts; never use running as punishment`
    }
    return `CROSS COUNTRY GUIDANCE - SENIOR (Year ${yearGroup}):
- Race distances up to ~5-7km by senior age groups; periodise toward county/English Schools' dates
- Training structure: aerobic volume (conversational pace), threshold work, hill strength, race-pace efforts
- Recovery literacy: sleep, fuelling, easy days genuinely easy
- Racing craft: course recces, positioning at starts, surging, finishing kicks
- Dual pathway: club athletics (track endurance) complements school cross country
- Leadership: senior runners lead warm-ups and mentor younger squads`
  }
}

// ==========================================
// GENERIC PE / MULTI-SKILLS (NC PE FALLBACK)
// ==========================================
export const genericPEGuidance = {
  framework: `PHYSICAL EDUCATION DEVELOPMENT FRAMEWORK (NATIONAL CURRICULUM):
General framework for sports and activities without a sport-specific module. Grounded in the national curriculum for PE and UK Chief Medical Officers' physical activity guidelines.

National Curriculum Aims (all sports/activities):
- Develop competence to excel in a broad range of physical activities
- Be physically active for sustained periods (CMO guidance: 60+ active minutes daily for 5-18s)
- Engage in competitive sports and activities
- Lead healthy, active lives

Universal Development Principles:
- Fundamental movement skills first (agility, balance, coordination, running, jumping, throwing, catching) - these transfer across every sport
- Development phases: explore and play (KS1) -> learn and apply core skills (KS2) -> refine technique and tactics (KS3) -> specialise and lead (KS4+)
- Game/activity-based learning over isolated drills; maximise active time, minimise queuing
- Differentiate with the STEP framework: change Space, Task, Equipment or People to make activities harder/easier
- Holistic development every session: physical (head), technical (hand) and personal/social (heart) outcomes
- Competition with purpose: balanced against participation, enjoyment and personal improvement
- Safeguarding and safety: appropriate equipment, jewellery removed, qualified supervision for higher-risk activities

Apply these principles using the conventions, rules and safety requirements of the specific sport or activity in question, and follow the relevant national governing body's guidance where it exists.`,

  getAgeGuidance(yearGroup) {
    if (yearGroup <= 6) {
      return `NC PE GUIDANCE - PRIMARY (Years 1-6):
- Master fundamental movement: running, jumping, throwing, catching, balance, agility, coordination
- Apply basics in a broad range of activities; small-sided and modified versions of games
- Simple tactics: attacking/defending principles, finding space, working with team-mates
- High activity, every child engaged with equipment sized to them
- Develop flexibility, strength, technique, control and balance through varied movement
- Personal-best culture: compare against self, celebrate effort and improvement`
    }
    if (yearGroup <= 9) {
      return `NC PE GUIDANCE - KS3 (Years 7-9):
- Build on fundamentals: develop technique and tactical understanding in a range of sports
- Overcome opponents in direct competition through team and individual games
- Analyse performances against previous ones; demonstrate improvement
- Develop physical confidence: strength, stamina, suppleness through structured activity
- Leadership introduction: warm-up leading, officiating, peer coaching
- Out-of-lesson signposting: clubs, teams and community pathways`
    }
    return `NC PE GUIDANCE - KS4+ (Year ${yearGroup}):
- Tackle complex and demanding activities; refine technique under competitive pressure
- Personal fitness ownership: design and evaluate own training approaches
- Continued participation focus: find the formats each student will sustain beyond school
- Leadership and officiating roles: organise, referee, coach
- Link to examined PE and vocational pathways where relevant
- Health literacy: training principles, recovery, lifelong activity habits`
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
  athletics: athleticsGuidance,
  basketball: basketballGuidance,
  swimming: swimmingGuidance,
  gymnastics: gymnasticsGuidance,
  tennis: tennisGuidance,
  badminton: badmintonGuidance,
  rounders: roundersGuidance,
  dance: danceGuidance,
  volleyball: volleyballGuidance,
  'cross-country': crossCountryGuidance,
  'cross country': crossCountryGuidance,
}

function normaliseSport(sport) {
  return (sport || '').toLowerCase().trim()
}

/**
 * Get the development framework text for a sport.
 * Used as a baseline in the AI system prompt. Unknown or unspecified
 * sports fall back to the national curriculum PE framework rather
 * than any single sport.
 */
export function getSportFramework(sport) {
  const module = sportModules[normaliseSport(sport)] || genericPEGuidance
  return module.framework
}

/**
 * Get age-appropriate guidance for a sport and year group.
 * Injected into the AI system prompt alongside the framework.
 */
export function getSportAgeGuidance(sport, yearGroup) {
  const module = sportModules[normaliseSport(sport)] || genericPEGuidance
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
    athletics: 'England Athletics',
    basketball: 'Basketball England',
    swimming: 'Swim England',
    gymnastics: 'British Gymnastics',
    tennis: 'Lawn Tennis Association (LTA)',
    badminton: 'Badminton England',
    rounders: 'Rounders England',
    dance: 'One Dance UK',
    volleyball: 'Volleyball England',
    'cross-country': 'England Athletics',
    'cross country': 'England Athletics',
  }
  return bodies[normaliseSport(sport)] || ''
}

/**
 * List all supported sports.
 */
export const SUPPORTED_SPORTS = [
  'football', 'rugby', 'cricket', 'hockey', 'netball',
  'athletics', 'basketball', 'swimming', 'gymnastics', 'tennis',
  'badminton', 'rounders', 'dance', 'volleyball', 'cross-country',
]
