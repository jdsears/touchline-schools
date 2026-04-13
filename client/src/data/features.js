import {
  Brain,
  Target,
  ClipboardList,
  Trophy,
  Users,
  Video,
  MessageSquare,
  Grip,
  Clock,
  Download,
  Lightbulb,
  Star,
  BarChart3,
  Share2,
  Upload,
  Scissors,
  Tag,
  Sparkles,
  FileText,
  Zap,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  Bell,
  CalendarDays,
  CalendarClock,
  CreditCard,
  FileBarChart,
  Building2,
} from 'lucide-react'

export const features = [
  {
    slug: 'session-planner',
    icon: ClipboardList,
    title: 'Training Session Generator',
    subtitle: 'Plan complete sessions in minutes, not hours',
    seo: {
      title: 'AI Training Session Planner for Grassroots Football',
      description: 'Generate complete football training sessions in minutes. Tell the AI what you need — age group, focus area, number of players — and get a full session plan. Built for UK grassroots coaches.',
      keywords: 'football training session planner, football coaching session generator, grassroots training plans, football drill planner, AI coaching assistant',
    },
    problem: {
      intro: "It's 10pm on a Friday night. Training is tomorrow morning. You're sat at the kitchen table trying to plan a session for 16 players with mixed ability, and you've got an hour on a half-size pitch.",
      hook: 'Sound familiar?',
      body: "Most grassroots coaches spend more time planning sessions than running them. You're a volunteer — this shouldn't feel like a second job.",
    },
    steps: [
      {
        icon: MessageSquare,
        title: 'Tell Touchline what you need',
        detail: '"U12s, 14 players, 75 minutes, focus on passing and movement, wet weather"',
      },
      {
        icon: FileText,
        title: 'Get a complete session plan',
        detail: 'Warm-up, main drills, small-sided game, cool-down — all structured, timed, and explained. Every drill includes coaching points, progressions, and equipment needed.',
      },
      {
        icon: Smartphone,
        title: 'Take it to the pitch',
        detail: "Download your session or use the app on your phone. Works offline — no relying on dodgy wifi at the rec ground.",
      },
    ],
    capabilities: [
      {
        icon: Target,
        title: 'Tailored to your constraints',
        detail: 'Tell it your pitch size, number of players, available equipment, and session length. Every plan fits YOUR situation.',
      },
      {
        icon: Users,
        title: 'Age-appropriate progressions',
        detail: 'Sessions are designed for the right developmental stage. U8 sessions look completely different to U14 — as they should.',
      },
      {
        icon: Lightbulb,
        title: 'Coaching points included',
        detail: "Each drill comes with what to look for, common mistakes, and how to progress or simplify. Like having an experienced coach whispering in your ear.",
      },
      {
        icon: Star,
        title: 'Save and reuse',
        detail: 'Build a library of sessions that worked. Rate them, add notes, and come back to your favourites.',
      },
    ],
    quote: {
      text: "I used to spend Sunday evenings dreading Monday's training. Now I do it in 5 minutes on the bus to work.",
      author: 'Grassroots coach, U11s',
    },
    relatedSlugs: ['tactics-board', 'player-development'],
  },
  {
    slug: 'player-development',
    icon: Users,
    title: 'Player Profiles & IDP',
    subtitle: 'Every player tracked. Every parent answered.',
    seo: {
      title: 'Player Development Tracking for Grassroots Football',
      description: "Track every player's development with individual profiles, session feedback, skills tracking, and AI-generated development plans. Give parents real answers about their child's progress.",
      keywords: 'grassroots player development, football player tracking, individual development plan football, youth football player profiles, player progress tracking',
    },
    problem: {
      intro: '"How\'s my daughter doing?" Six words that strike fear into every grassroots coach. You\'ve got 16 players. You see them twice a week. You\'re trying to remember who needs to work on their weak foot while also setting up cones and finding the missing bib.',
      hook: 'Your players deserve individual attention.',
      body: "Elite academies have development officers, analysts, and databases. You've got a good memory and maybe a notebook you lost three weeks ago. Now they can get it.",
    },
    steps: [
      {
        icon: Users,
        title: 'Set up your squad',
        detail: 'Add your players with basic info. Position, age, strengths, areas to develop. Takes 5 minutes for a full squad.',
      },
      {
        icon: FileText,
        title: 'Log feedback after sessions',
        detail: 'Quick notes after training or matches. "Worked hard on positioning today. Still rushing passes under pressure — we\'ll focus on that." Takes 30 seconds per player.',
      },
      {
        icon: Sparkles,
        title: 'AI builds development plans',
        detail: 'Touchline tracks feedback over time and generates individual development plans. Each player gets specific goals and focus areas based on real observations, not guesswork.',
      },
    ],
    capabilities: [
      {
        icon: Users,
        title: 'Individual player profiles',
        detail: "Every player has their own page with observations, feedback history, skills tracking, and development goals. A complete picture at a glance.",
      },
      {
        icon: ClipboardList,
        title: 'Session-by-session feedback',
        detail: 'Quick post-session notes that build into a rich development record over weeks and months. Finally, evidence of progress.',
      },
      {
        icon: Sparkles,
        title: 'AI-generated development plans',
        detail: 'The Gaffer analyses your observations and creates individual development plans with specific, age-appropriate goals and recommended activities.',
      },
      {
        icon: Share2,
        title: 'Shareable with parents',
        detail: "Give parents visibility into their child's progress. Real feedback, real goals, real development — not just \"yeah, doing well.\"",
      },
    ],
    quote: {
      text: "For the first time, I can actually show parents what their child is working on and how they've improved. It's changed the conversations completely.",
      author: 'Volunteer coach, U13s',
    },
    relatedSlugs: ['video-analysis', 'session-planner'],
  },
  {
    slug: 'video-analysis',
    icon: Video,
    title: 'Video Analysis',
    subtitle: 'Upload your match footage. Let The Gaffer break it down.',
    seo: {
      title: 'AI Video Analysis for Grassroots Football',
      description: 'Upload match footage from your phone or camera, create clips, tag players, and get AI-powered tactical analysis. Built for grassroots coaches, not elite academies.',
      keywords: 'grassroots football video analysis, football match video review, AI football analysis, youth football video, coaching video analysis tool',
    },
    problem: {
      intro: "You filmed the match on your phone. It's sat in your camera roll doing nothing. You know there are moments worth reviewing — that goal you conceded from a corner, the shape when you're pressing — but who has time to scrub through 60 minutes of shaky footage?",
      hook: 'Your phone footage is all you need.',
      body: 'Video analysis used to be for clubs with analysts and budgets. Now any coach can do it.',
    },
    steps: [
      {
        icon: Upload,
        title: 'Upload your footage',
        detail: 'Film on your phone or use a sideline camera. Upload directly to Touchline — no file size headaches, works with any video format.',
      },
      {
        icon: Scissors,
        title: 'Clip and tag',
        detail: "Mark the moments that matter. Create clips, tag the players involved, and add coaching notes. Clips automatically appear in each player's profile.",
      },
      {
        icon: Sparkles,
        title: 'Ask The Gaffer',
        detail: 'Hit "Analyse" and The Gaffer AI reviews your footage. Get tactical observations, individual player notes, and specific training recommendations for your next session.',
      },
    ],
    capabilities: [
      {
        icon: Upload,
        title: 'Upload anything',
        detail: 'Phone footage, sideline camera recordings, GoPro clips — any video format, any file size. Upload happens in the background while you carry on.',
      },
      {
        icon: Scissors,
        title: 'Clip and annotate',
        detail: 'Mark start and end points to create clips. Add titles, coaching notes, and categorise as highlights, coaching points, set pieces, or goals.',
      },
      {
        icon: Tag,
        title: 'Player tagging',
        detail: "Tag players in clips. Each tagged clip appears in that player's profile, building a visual development record over the season.",
      },
      {
        icon: Sparkles,
        title: 'AI tactical analysis',
        detail: 'The Gaffer analyses your footage and provides formation assessment, tactical observations, individual player feedback, and recommended drills for next training.',
      },
    ],
    quote: {
      text: "I showed the lads clips from Saturday's match at Tuesday training. Their faces lit up. They'd never had that before.",
      author: 'Parent coach, U12s',
    },
    relatedSlugs: ['player-development', 'match-prep'],
  },
  {
    slug: 'tactical-advisor',
    icon: Brain,
    title: 'AI Tactical Advisor',
    subtitle: 'Chat with The Gaffer. Get advice that actually makes sense for your team.',
    seo: {
      title: 'AI Football Tactical Advisor for Grassroots Coaches',
      description: 'Chat with The Gaffer — an AI that understands football formations, player roles, and match situations. Get tactical advice tailored to your grassroots team.',
      keywords: 'AI football coaching, football tactics advisor, grassroots coaching help, football formation advice, AI coaching assistant football',
    },
    problem: {
      intro: "You've got 13 players available on Saturday but you normally play a 4-3-3. Your best midfielder is injured. The opposition play long balls. What do you do?",
      hook: 'The Gaffer is the assistant coach you never had.',
      body: "Most grassroots coaches don't have anyone to talk tactics with. You're making it up as you go, Googling \"9v9 formations\" at midnight and hoping for the best.",
    },
    steps: [
      {
        icon: MessageSquare,
        title: 'Ask anything',
        detail: '"I\'ve got 11 players for Saturday, only one natural centre-back. What formation should I play?" — just type like you\'re talking to a coaching mate.',
      },
      {
        icon: Lightbulb,
        title: 'Get practical advice',
        detail: "The Gaffer gives you formations, player roles, and tactical instructions that make sense for grassroots. No Pep Guardiola theory — just practical advice your players can execute.",
      },
      {
        icon: Zap,
        title: 'Apply it',
        detail: "Take The Gaffer's suggestions into your match prep, team talk, or training plan. Everything is saved so you can revisit before matchday.",
      },
    ],
    capabilities: [
      {
        icon: Users,
        title: 'Knows your team',
        detail: 'The Gaffer knows your squad, their strengths, positions, and development areas. Advice is personalised, not generic.',
      },
      {
        icon: Target,
        title: 'Grassroots-appropriate',
        detail: "Advice is calibrated for youth and grassroots football. It won't suggest gegenpressing to your U10s. It understands age-appropriate tactics.",
      },
      {
        icon: Grip,
        title: 'Formation help',
        detail: 'Struggling with 7v7, 9v9, or 11v11 formations? The Gaffer explains options, player roles, and when to use what — with your available players.',
      },
      {
        icon: Smartphone,
        title: 'Match situation advice',
        detail: 'Losing at half time? Opposition sitting deep? Ask The Gaffer for tactical adjustments mid-match from your phone on the touchline.',
      },
    ],
    quote: {
      text: "It's like having a Level 3 coach on speed dial. I asked about switching from 4-3-3 to 3-5-2 and it explained exactly how to set it up with my players.",
      author: 'FA Level 1 coach',
    },
    relatedSlugs: ['tactics-board', 'match-prep'],
  },
  {
    slug: 'tactics-board',
    icon: Target,
    title: 'Visual Tactics Board',
    subtitle: 'Ditch the whiteboard. Plan your formations digitally.',
    seo: {
      title: 'Football Tactics Board App for Coaches',
      description: 'Create and save formations, plan set pieces, and visualise your game model with an intuitive drag-and-drop tactics board. Share with your team before matchday.',
      keywords: 'football tactics board app, football formation creator, coaching tactics board, football set piece planner, digital tactics board football',
    },
    problem: {
      intro: "Drawing formations on a foggy whiteboard with a dead pen. Trying to explain a set piece routine by waving your arms about. Texting a photo of your notebook to the assistant coach and hoping they can read your handwriting.",
      hook: 'There has to be a better way.',
      body: "Your tactical ideas deserve to be clear, saved, and shareable. Now they can be.",
    },
    steps: [
      {
        icon: Grip,
        title: 'Drag and drop',
        detail: 'Place players on the pitch with a simple drag-and-drop interface. Choose your formation template or build from scratch. Works on phone or tablet — even on the touchline.',
      },
      {
        icon: Zap,
        title: 'Plan set pieces and movements',
        detail: 'Add arrows to show runs, passing lanes, and movement patterns. Create set piece routines for corners, free kicks, and goal kicks.',
      },
      {
        icon: Download,
        title: 'Save and share',
        detail: 'Save formations for different match situations. Share with players or assistant coaches before the game. Build a library of tactical setups over the season.',
      },
    ],
    capabilities: [
      {
        icon: Grip,
        title: 'Intuitive drag-and-drop',
        detail: 'Place and move players with a tap. Works smoothly on phone, tablet, and desktop. No fiddly controls.',
      },
      {
        icon: Target,
        title: 'Formation templates',
        detail: 'Start from common formations (4-3-3, 3-5-2, 4-4-2, etc.) for 7v7, 9v9, and 11v11 and customise from there.',
      },
      {
        icon: Zap,
        title: 'Movement arrows',
        detail: "Draw runs, passes, and movement patterns. Show your team exactly what you want — visually, not verbally.",
      },
      {
        icon: Star,
        title: 'Save multiple setups',
        detail: "Attacking shape, defensive shape, corners, free kicks — save them all. Flip between them during your team talk.",
      },
    ],
    quote: {
      text: "I showed the team our corner routine on my phone before the match. First time they'd actually understood it. We scored from it in the first half.",
      author: 'U14 coach',
    },
    relatedSlugs: ['tactical-advisor', 'session-planner'],
  },
  {
    slug: 'match-prep',
    icon: Trophy,
    title: 'Match Prep & Analysis',
    subtitle: 'Prepare like the pros. Review like an analyst.',
    seo: {
      title: 'AI Match Preparation Tool for Football Coaches',
      description: 'AI-powered match preparation with focus points, team talks, and post-match reports. Prepare your grassroots team like a professional setup.',
      keywords: 'football match preparation, football match analysis tool, pre match preparation football, post match report football, team talk generator football',
    },
    problem: {
      intro: "You arrive at the ground, set up the goals, find the corner flags, greet the ref, deal with the parent who's forgotten shin pads, and suddenly it's kick-off. What was the plan again?",
      hook: 'Even a few minutes of structured prep makes a massive difference.',
      body: 'Matchday preparation at grassroots level usually means "wing it and hope." But it doesn\'t have to be that way.',
    },
    steps: [
      {
        icon: ClipboardList,
        title: 'Pre-match prep',
        detail: 'Tell Touchline about the match — opposition, your available players, any specific challenges. Get focus points for the team, a suggested formation, and key messages for your team talk.',
      },
      {
        icon: Zap,
        title: 'Matchday',
        detail: 'Use your focus points during the warm-up team talk. Quick reference on your phone for half-time adjustments. The Gaffer can suggest tactical changes based on what\'s happening.',
      },
      {
        icon: BarChart3,
        title: 'Post-match review',
        detail: 'Log the result, key moments, and quick observations. Touchline generates a structured post-match report with what went well, what to work on, and suggestions for next training.',
      },
    ],
    capabilities: [
      {
        icon: MessageSquare,
        title: 'AI team talks',
        detail: "Get structured, age-appropriate talking points for before the match. Not a script — just clear messages to focus your team.",
      },
      {
        icon: Clock,
        title: 'Half-time helper',
        detail: 'Quick prompts for half-time adjustments. Tell The Gaffer what\'s happening and get tactical suggestions on the spot.',
      },
      {
        icon: FileText,
        title: 'Post-match reports',
        detail: 'Structured review with match observations, individual player notes, and recommendations that feed into your next training plan.',
      },
      {
        icon: BarChart3,
        title: 'Season tracking',
        detail: "Match reports build over the season. Spot patterns — do you always concede from set pieces? Are second-half performances dropping? Data without the spreadsheet.",
      },
    ],
    quote: {
      text: "The post-match reports have been brilliant. I can actually see patterns across the season that I never noticed before.",
      author: 'Club secretary and U15 coach',
    },
    relatedSlugs: ['tactical-advisor', 'video-analysis'],
  },
  {
    slug: 'safeguarding',
    icon: ShieldCheck,
    title: 'Safeguarding & DBS Tracking',
    subtitle: 'Stay compliant. Protect your club. Never miss an expiry.',
    seo: {
      title: 'Safeguarding & DBS Tracking for Football Clubs',
      description: 'Track DBS checks, first aid certificates, and safeguarding qualifications for every coach and volunteer. Automatic expiry alerts, incident reporting, and FA-compliant records.',
      keywords: 'football club safeguarding, DBS tracking grassroots football, safeguarding compliance football club, welfare officer football, incident reporting football',
    },
    problem: {
      intro: "Your club has 12 coaches and 8 volunteers across 6 age groups. Do you know who has an up-to-date DBS? When does your welfare officer's safeguarding certificate expire? Where's that incident report from October?",
      hook: 'Safeguarding is non-negotiable. But tracking it on spreadsheets is a nightmare.',
      body: "The FA requires every club to maintain safeguarding records, DBS checks, and incident logs. Most clubs do this on spreadsheets, WhatsApp groups, and filing cabinets. Things get missed. Certificates expire. And nobody notices until an audit.",
    },
    steps: [
      {
        icon: Users,
        title: 'Add your staff and volunteers',
        detail: 'Log every coach, volunteer, and committee member. Record their DBS number, issue date, first aid qualifications, and safeguarding training level.',
      },
      {
        icon: Bell,
        title: 'Automatic expiry alerts',
        detail: 'Touchline monitors every certificate and DBS check. You get alerts at 90, 60, and 30 days before expiry — and escalating warnings if nothing is renewed.',
      },
      {
        icon: AlertTriangle,
        title: 'Log incidents confidentially',
        detail: 'Record safeguarding concerns with a full audit trail. Assign to your welfare officer, track resolutions, and maintain records that satisfy FA compliance audits.',
      },
    ],
    capabilities: [
      {
        icon: ShieldCheck,
        title: 'DBS & qualification tracking',
        detail: 'Track DBS certificates, first aid, safeguarding courses, and coaching badges for every person at your club. Upload documents and store them securely.',
      },
      {
        icon: Bell,
        title: 'Compliance alerts',
        detail: 'Automatic daily scanning flags upcoming expiries, missing qualifications, and compliance gaps. Alerts go to club admins and welfare officers.',
      },
      {
        icon: AlertTriangle,
        title: 'Incident reporting',
        detail: 'Confidential incident logging with severity levels, witness details, and full audit trails. Restricted access ensures only authorised staff can view sensitive reports.',
      },
      {
        icon: FileBarChart,
        title: 'Compliance dashboard',
        detail: 'See your club\'s compliance status at a glance. Traffic-light overview showing who\'s compliant, expiring soon, or overdue. Export reports for FA audits.',
      },
    ],
    quote: {
      text: "We used to dread the annual audit. Now our compliance is tracked automatically and we can pull a report in seconds.",
      author: 'Club secretary, 8-team club',
    },
    relatedSlugs: ['events-camps', 'ai-intelligence'],
  },
  {
    slug: 'events-camps',
    icon: CalendarDays,
    title: 'Events & Camp Management',
    subtitle: 'Run camps, tournaments, and events. Registration and payments built in.',
    seo: {
      title: 'Football Club Event & Camp Management Software',
      description: 'Run holiday camps, tournaments, and club events with online registration and integrated payments. Parents register and pay in one step. Track attendance and manage capacity.',
      keywords: 'football camp management software, football club events, holiday football camp registration, tournament management football, football club camp booking',
    },
    problem: {
      intro: "Half-term camp next week. You've got a Google Form for sign-ups, a spreadsheet to track who's paid, WhatsApp messages from parents asking for details, and no idea if you've hit capacity yet.",
      hook: 'Running events shouldn\'t need five different tools.',
      body: "Camps and events are a lifeline for grassroots clubs — they bring in revenue, keep players active during holidays, and attract new families. But organising them is painful when registration, payments, and communication are all disconnected.",
    },
    steps: [
      {
        icon: CalendarDays,
        title: 'Create your event',
        detail: 'Set up a camp, tournament, or club event in minutes. Add dates, times, pricing, capacity limits, and a description. Free or paid — you choose.',
      },
      {
        icon: CreditCard,
        title: 'Parents register and pay',
        detail: 'Share your event link. Parents register their children and pay online in one step via Stripe. No chasing bank transfers or cash in envelopes.',
      },
      {
        icon: Users,
        title: 'Manage attendees',
        detail: 'See who\'s registered, who\'s paid, and who\'s on the waitlist. Send updates to all attendees. Mark attendance on the day. Export participant lists as CSV.',
      },
    ],
    capabilities: [
      {
        icon: CalendarDays,
        title: 'Any event type',
        detail: 'Holiday camps, one-day tournaments, fundraising events, presentation evenings, trials — create any kind of club event with custom fields and pricing.',
      },
      {
        icon: CreditCard,
        title: 'Integrated payments',
        detail: 'Parents pay when they register. Money goes straight to your Stripe account with just a 0.5% platform fee. No separate invoicing needed.',
      },
      {
        icon: Share2,
        title: 'Shareable event pages',
        detail: 'Each event gets a public page you can share on social media, WhatsApp, or your club website. Non-members can register too — great for attracting new players.',
      },
      {
        icon: BarChart3,
        title: 'Capacity & waitlists',
        detail: 'Set maximum participants. When an event fills up, parents can join a waitlist. You control who gets a spot and can manage cancellations easily.',
      },
    ],
    quote: {
      text: "Our half-term camp sold out in 3 days. Parents just clicked a link, paid, and they were done. We didn't chase a single payment.",
      author: 'Club chairman, community club',
    },
    relatedSlugs: ['safeguarding', 'ai-intelligence'],
  },
  {
    slug: 'ai-intelligence',
    icon: Sparkles,
    title: 'AI Club Intelligence',
    subtitle: 'Match reports, attendance insights, season summaries, and grant applications — powered by AI.',
    seo: {
      title: 'AI-Powered Club Intelligence for Grassroots Football',
      description: 'AI-generated match reports for parents, attendance trend analysis, season summary reports for your AGM, grant application drafts, and compliance gap analysis. All powered by AI.',
      keywords: 'AI football club reports, grassroots football AI, football club intelligence, AI match reports parents, football grant application help',
    },
    problem: {
      intro: "Your AGM is next month. The committee wants a season summary. The council grant application is due Friday. Parents keep asking how the team\'s doing. And you\'re still trying to work out why attendance drops every November.",
      hook: 'Your club generates loads of data. AI turns it into answers.',
      body: "Every match result, attendance record, training session, and player observation creates data. But nobody has time to analyse it. AI Club Intelligence does it for you — automatically generating the reports and insights your club needs.",
    },
    steps: [
      {
        icon: Sparkles,
        title: 'AI works in the background',
        detail: 'As your club uses Touchline — logging matches, marking attendance, recording feedback — the AI builds a rich picture of your club\'s activity.',
      },
      {
        icon: FileBarChart,
        title: 'Generate reports on demand',
        detail: 'Need a season summary? A grant application? Attendance analysis? Just click generate. The AI creates professional reports using your real club data.',
      },
      {
        icon: Share2,
        title: 'Share with stakeholders',
        detail: 'Send match reports to parents. Present season summaries at your AGM. Submit grant applications to councils. Everything is formatted and ready to go.',
      },
    ],
    capabilities: [
      {
        icon: FileText,
        title: 'AI match reports for parents',
        detail: 'After every match, generate a parent-friendly report covering how the team played, key moments, and individual highlights. Parents feel connected without needing to be on the touchline.',
      },
      {
        icon: BarChart3,
        title: 'Attendance insights',
        detail: 'AI analyses attendance patterns across your club. Spot trends — which teams have dropping attendance, which sessions are most popular, seasonal patterns — and get suggestions to improve.',
      },
      {
        icon: FileBarChart,
        title: 'Season summaries',
        detail: 'Generate comprehensive season reports covering results, player development, participation stats, and club achievements. Perfect for AGMs, committee meetings, and funding applications.',
      },
      {
        icon: Building2,
        title: 'Grant application helper',
        detail: 'AI drafts grant applications using your real club data — participation numbers, community impact, and development metrics. Tailored to common funding bodies like Sport England and local councils.',
      },
    ],
    quote: {
      text: "The AI season report for our AGM was brilliant. It pulled together everything — results, attendance, player development — into a professional document in seconds.",
      author: 'Club treasurer, youth football club',
    },
    relatedSlugs: ['safeguarding', 'events-camps'],
  },
]

export const featuresBySlug = Object.fromEntries(features.map(f => [f.slug, f]))

export const featureRouteMap = {
  'AI Tactical Advisor': '/features/tactical-advisor',
  'Visual Tactics Board': '/features/tactics-board',
  'Training Session Generator': '/features/session-planner',
  'Match Prep & Analysis': '/features/match-prep',
  'Player Profiles & IDP': '/features/player-development',
  'Video Analysis': '/features/video-analysis',
  'Safeguarding & DBS Tracking': '/features/safeguarding',
  'Events & Camp Management': '/features/events-camps',
  'AI Club Intelligence': '/features/ai-intelligence',
}
