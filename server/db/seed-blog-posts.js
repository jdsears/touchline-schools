import pg from 'pg'
const { Pool } = pg

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const posts = [
  {
    title: 'Club Hub: The Engine Room Behind Every Great Grassroots Club',
    slug: 'club-hub-engine-room-behind-every-great-grassroots-club',
    excerpt: 'Running a grassroots football club means juggling registrations, DBS checks, payments, safeguarding, and parent communications -often from your kitchen table. Club Hub brings it all together.',
    author_name: 'Touchline',
    tags: ['club management', 'grassroots football', 'club hub', 'features'],
    meta_title: 'Club Hub: Smarter Club Management for Grassroots Football',
    meta_description: 'Discover how Touchline\'s Club Hub helps grassroots football clubs manage registrations, payments, safeguarding, communications, and AI-powered insights -all in one place.',
    content: `There's a version of running a grassroots football club that nobody talks about at the awards dinner. It's the Tuesday evening spent cross-referencing DBS expiry dates in a spreadsheet. It's the WhatsApp message at 10pm asking which account the subs should go into. It's the registration form that lives in three different Google Docs, none of which are up to date.

Club Hub was built for the people who do that work. Not to replace them -nobody's replacing the volunteers who keep grassroots football alive -but to give them a single place where the whole operation makes sense.

## One place for every player and parent

When a new family joins your club, the registration journey starts with a single shareable link. Parents fill in their details, their child's information, medical notes, consent forms, and kit sizes -all in one go. If you've set up payment plans, they can choose and pay during the same process. No chasing. No follow-up emails asking for the allergy form they forgot.

On your end, every registration lands in a queue for review. You see the player's details, their parent's contact information, medical flags, and uploaded documents. One click to approve. One click to reject. An automated email goes out either way.

From that point on, every player and every parent exists in your club directory. You can search across teams, see which guardian belongs to which child, check consent status, and pull up contact details instantly. No more digging through folders or asking coaches to forward phone numbers.

## Payments that actually get collected

Money is the part of club management that causes the most friction and the least fun. Club Hub connects directly to Stripe, so your club handles payments professionally without anyone becoming an amateur accountant.

You set up payment plans -monthly subs, annual fees, one-off tournament costs -and assign them to teams. Parents subscribe during registration or when you send them a link. The system tracks who's paid, who's overdue, and what your monthly revenue looks like.

The finance dashboard gives you something most grassroots clubs have never had: visibility. You can see total revenue, monthly breakdowns, active subscriptions, and projected income. When someone asks at the AGM how the finances look, you've got an answer that isn't "I think we're alright."

## Safeguarding without the shoebox

Every club knows safeguarding matters. But tracking DBS certificates, first aid qualifications, and training dates across a dozen volunteers is genuinely hard when your system is a mixture of memory, emails, and a folder in someone's car.

Club Hub gives you a safeguarding dashboard that tells you, at a glance, how many DBS certificates are valid, how many are expiring, and how many have already lapsed. You can log every volunteer's qualifications, assign safeguarding roles, and record incidents when they happen.

The AI compliance scanner goes further. It reviews your entire club's volunteer records and flags gaps -teams without first aid coverage, coaches whose training has lapsed, roles that haven't been assigned. It gives you a compliance score and a list of what to fix. When the county FA asks how your safeguarding is going, you'll actually know.

## Talking to parents without the chaos

Club communications tend to follow a familiar pattern: someone posts in the WhatsApp group, three parents miss it, two reply with questions, and the important information gets buried under a debate about parking.

Club Hub lets you send announcements with priority levels -normal, important, or urgent -and optionally deliver them by email. You can target all parents or just specific teams. Pinned announcements stay visible. There's a full communication log so you can see what was sent, when, by whom, and to how many people.

It's not about replacing WhatsApp for the banter. It's about making sure the things that matter -fixture changes, registration deadlines, safeguarding updates -actually reach the people who need them.

## Events that run themselves

Whether it's a summer camp, a tournament, a trial day, or a fundraiser quiz night, Club Hub handles the full event lifecycle. You set up the event with dates, times, venues, pricing, capacity limits, and registration deadlines. You can add early bird discounts, sibling pricing, and custom registration fields like t-shirt sizes or dietary requirements.

Each event gets a public registration page you can share. Registrations come in with all the details attached. You can track numbers against capacity, mark attendance on the day, and export everything to CSV for your records.

## The intelligence layer

This is where Club Hub goes beyond organisation and into genuine insight. The AI-powered intelligence features analyse your club's data and surface things you might not have spotted.

Attendance insights look at twelve or more weeks of training data and identify patterns -which players are drifting away, which sessions have declining turnout, where engagement is strongest.

The season summary generates a full AGM-ready report covering membership numbers, match results, financial health, and compliance status. It's the kind of document that would take hours to compile manually.

The grant helper drafts funding applications tailored to your club's situation. Tell it you need new goals or a pitch improvement, and it writes a professional application for Football Foundation, FA, or County FA grants -using your actual club data.

Coach development suggestions analyse each coach's activity -sessions delivered, observations recorded, qualifications held -and recommend personalised development pathways.

None of these replace human judgement. But they surface the information that makes good decisions easier.

## Built for the people who show up

Club Hub isn't trying to turn your grassroots club into a professional academy. It's trying to make the admin bearable for the volunteers who give up their evenings and weekends so kids can play football.

Every feature exists because someone, somewhere, was doing it on paper, in a spreadsheet, or in their head -and it was harder than it needed to be.

The kids don't see any of this. They just turn up, put their boots on, and play. But behind every session, every match, every season -there's someone making it happen. Club Hub is for them.`
  },
  {
    title: 'The Manager Hub: Your Coaching Companion from Monday to Match Day',
    slug: 'manager-hub-coaching-companion-monday-to-match-day',
    excerpt: 'From planning training sessions to streaming matches live, the Manager Hub gives grassroots coaches professional tools without the professional price tag.',
    author_name: 'Touchline',
    tags: ['coaching', 'grassroots football', 'manager hub', 'features', 'AI coaching'],
    meta_title: 'Manager Hub: AI-Powered Coaching Tools for Grassroots Football',
    meta_description: 'Explore how Touchline\'s Manager Hub helps grassroots football coaches plan training, prepare for matches, track player development, and stream games -all powered by AI.',
    content: `Most grassroots coaches have the same Monday evening routine. Sit down after the kids are in bed, open YouTube, and try to find a training drill that fits what you saw on Saturday. Maybe you'll sketch something on the back of an envelope. Maybe you'll text your assistant coach asking if they remember what formation the opposition played. Maybe you'll just wing it.

The Manager Hub exists because coaching shouldn't feel like guesswork. Not because grassroots coaches aren't good enough -most of them are brilliant, dedicated people who give up hours every week for someone else's kids. But because the tools that professional coaches take for granted have never been available at this level. Until now.

## Pep: your AI coaching assistant

Every team in Touchline gets access to Pep, an AI coaching assistant that knows football. Not in the way a chatbot knows things -Pep understands tactical principles, pressing triggers, formation dynamics, and the FA's youth development framework. Ask it how to coach a 1-4-3-3 press against a team that plays out from the back, and you'll get an answer that makes sense. Ask it how to help a quiet Under-10 gain confidence, and you'll get age-appropriate advice grounded in actual coaching philosophy.

Pep isn't a replacement for your coaching instincts. It's the conversation you'd have with a more experienced coach at the side of the pitch -except it's available at midnight when you're planning Thursday's session.

## Training sessions that write themselves

One of the hardest parts of coaching is planning sessions that are structured, progressive, and age-appropriate -week after week, all season. The training generator takes the pressure off.

Tell it what you want to focus on -possession, pressing, transitions, finishing, defending, whatever you saw at the weekend that needs work -and it builds a complete session. Warm-up with coaching points. Technical drills with progressions. A tactical exercise. A match-realistic practice. Cool-down. Everything laid out with timing, equipment lists, and the key coaching points for each activity.

You can adjust the duration, specify your pitch size and player numbers, and add constraints. The session is yours to edit, save, and share. It's not a generic template -it's built around what your team needs.

## The tactics board

Tactics at grassroots level often get dismissed. "They're kids, just let them play." And there's truth in that, especially at younger ages. But from Under-11s upward, players start to understand shape, positioning, and movement. The tactics board gives you a way to build that understanding visually.

It supports 5-a-side through to 11-a-side, with three tactical phases: in possession, out of possession, and transition. You can set defensive line depth, pressing intensity, width in attack and defence, and add movement arrows to show player runs.

For the coach who's never used a tactics board before, it's intuitive enough to figure out in five minutes. For the coach who's done their FA Level 2, it's detailed enough to plan a proper tactical session. Either way, it beats drawing circles on a whiteboard.

## Match day, covered

A match in the Manager Hub isn't just a fixture with a score. It's a complete workflow that starts days before kick-off and doesn't end until the reports are written.

You send availability requests to parents. Responses come back -available, unavailable, maybe -and you see them in real time. When you're ready, you select your squad, assign a starting formation, and the system calculates projected playing time so every player gets fair minutes.

Before the match, you can generate AI-powered match prep. It pulls together your squad, your formation, recent results, and league position to produce a tactical briefing. It's not a script -it's the kind of preparation document that helps you walk into the changing room with a plan.

After the match, you log the result and the system generates reports. There's a coach's match report for your records and a parent-friendly version that focuses on the positives and the team's development. Because parents want to know how their child's team did, and "we lost 4-1 but Tommy's pressing was excellent" is better than just the score.

## Knowing your players

Player profiles in Touchline go deeper than a name and a position. Every player has a development record built from observations you log throughout the season -technical notes, tactical comments, physical development, and mental attributes. Each observation is tagged and time-stamped, so when it comes to writing an Individual Development Plan or having a conversation with parents, you've got evidence, not just impressions.

The IDP generator takes your accumulated observations and creates a structured development plan. It identifies the player's strengths, their areas for growth, sets specific goals, and suggests practice activities they can do at home. It's the kind of document that academies produce routinely but grassroots clubs rarely have time to create.

Player badges -Player of the Match, Most Improved, Leadership Award, and more -give you a way to recognise and motivate players beyond the pitch. Parents see them. Players remember them.

## Video analysis without the camera crew

If you record your matches -even just on a phone propped against a water bottle -Touchline's video analysis can turn that footage into coaching insight. Upload the video, and the AI reviews key frames looking for team shape, tactical patterns, individual contributions, and areas for improvement.

The analysis produces a structured report with observations, player-specific feedback, and training recommendations. You review it, edit if needed, and approve it -at which point the relevant observations are saved to each player's profile automatically.

It's not Sky Sports. It's not meant to be. It's a grassroots coach watching their team back and getting a second opinion from something that doesn't get distracted by the dog running across the pitch.

## Live streaming for the people who can't be there

Not every parent can make every match. Work, other children, distance -there are a hundred reasons why mum or dad might not be on the touchline. Live streaming means they don't have to miss it.

Set up a stream, share a code with parents, and they can watch live through the Player Lounge. You can add a PIN for security, regenerate share codes if needed, and the stream auto-detects when you go live.

It's one of those features that sounds like a luxury until the first time a grandparent in another city watches their grandchild score. Then it feels essential.

## League tables and fixtures

Import your league table from a screenshot -the AI reads it and populates the standings automatically. Add fixtures the same way, or enter them manually. Track your results across the season and see where you stand at a glance.

For coaches managing multiple competitions -league, cup, friendlies -having everything in one place saves the mental overhead of remembering what's happening when.

## The thread that ties it all together

What makes the Manager Hub more than a collection of tools is how everything connects. An observation you log after training feeds into a player's IDP. A video analysis generates observations that appear on player profiles. Match prep pulls from your squad selection and recent results. Training sessions are informed by what you discussed with Pep.

Nothing exists in isolation. Your coaching builds over the season, and the system builds with it. By March, you've got a body of work -observations, plans, reports, analyses -that tells the story of your team's development in a way that memory alone never could.

That's not about technology. It's about giving coaches the chance to do what they already want to do, just better.`
  },
  {
    title: 'The Player Lounge: Where Parents and Players Stay Connected to the Team',
    slug: 'player-lounge-where-players-parents-stay-connected',
    excerpt: 'Match countdowns, live streaming, development tracking, and an AI coaching assistant -the Player Lounge gives parents a window into their child\'s football and a way to share the experience together.',
    author_name: 'Touchline',
    tags: ['player engagement', 'parent communication', 'player lounge', 'features', 'grassroots football'],
    meta_title: 'Player Lounge: The Parent and Player Experience in Touchline',
    meta_description: 'Discover how the Player Lounge keeps parents connected to their child\'s football with match countdowns, live streaming, development plans, and an AI coaching assistant.',
    content: `There's a moment every parent knows. It's half past five on a Saturday, and your child is already in their kit. The match doesn't start until ten. But the kit is on, the boots are by the door, and they're asking -for the third time -what time they need to be there.

The Player Lounge was built for that energy. It's the part of Touchline that belongs to your family. Not the tactics, not the admin, not the spreadsheets -just the experience of being part of a team, shared between parents and their children.

## How access works

When a coach or club manager adds your child to a team, you receive an invitation as their parent or guardian. You create your own account, and from that moment you have full access to the Player Lounge for your child's team. Everything flows through your login.

As your child gets older and has their own device, it's entirely your choice whether to share access with them. Some parents of older teenagers hand over the login so their child can check fixtures and chat with The Gaffer independently. Some prefer to keep it as something they look at together. Either way, you as the parent always have full visibility and control. Managers never create direct logins for children.

## Match day starts before match day

The first thing you see when you open the Lounge is the next match. Not a list of fixtures. Not a calendar. The match. The opponent's name, the countdown ticking in days and hours, and all the details that matter: where to meet, what time, which kit to wear.

On match day itself, the countdown switches to "Match day!" and the whole experience shifts. If the coach has written a match prep, it's there to read -simplified for the age group, focused on the two or three things the team needs to remember. There's a location link that opens straight in Google Maps, so there's no "we couldn't find the pitch" texts at twenty to ten.

And then there's the pep talk. A personalised, AI-generated motivational message before the match. It's age-appropriate -an Under-8 gets something about having fun and being brave with the ball, an Under-14 gets something about composure and trusting their ability. It's a small thing, but it matters when your child is nervous about a cup semi-final. Read it together on the drive there, or let them read it on their own. It sets the tone for the day.

## The Gaffer: a coaching voice for the whole family

The Player Lounge includes access to The Gaffer -an AI coaching assistant that knows your child's position, their development plan, and their recent training. It's not the same as the coach's Pep assistant. The Gaffer speaks at the right level for the age group and gives practical, encouraging advice grounded in actual coaching principles.

Your child can ask how to improve their weak foot, what to work on before trials, or how to deal with nerves. The Gaffer responds with the kind of advice a favourite coach might give -except it's available whenever you want it. Sit together and explore it, or let older children use it independently. It works both ways.

You have full control over The Gaffer from your settings. You can enable or disable it at any time, and every conversation is logged and visible, so there's complete transparency about what's being discussed.

## Watching from anywhere

Live streaming changes the dynamic of a grassroots match in a way that's hard to overstate. The parent who's working. The grandparent who lives two hours away. The sibling who's at their own match. They all miss games -and every missed game is a small disconnection from something that matters to the family.

The Lounge has a dedicated Live tab. When the coach starts a stream, it appears automatically with a pulsing "LIVE NOW" indicator. You can share the link with family members, and if the coach has set a PIN, it's displayed for easy sharing. The stream checks every ten seconds, so the moment the coach goes live, everyone knows.

It's not a produced broadcast. It's a phone on a tripod behind the goal. But when your daughter scores and you're watching from a hospital waiting room, the production quality doesn't matter.

## Watching it back

After the match, the video stays available. If the coach has uploaded match footage or linked Veo highlights, you can rewatch games from the Lounge together. Match clips -tagged by the coach as highlights, coaching points, goals, or learning moments -appear in a personal clips library.

Match photos land in a gallery that both coaches and parents can contribute to. There's a lightbox viewer for browsing, sharing, and -for the parents who arrived late -seeing what they missed. You can upload photos too, building a shared visual record of the season.

## Knowing where they stand

The league table is there because it matters. Your child wants to know if they're top, how many points behind, and what goal difference looks like. Their team is highlighted in the standings so they can spot it instantly. It's a small detail, but it matters to a ten-year-old who checks every Sunday evening.

Results from recent matches show up with colour-coded badges -win, draw, loss -along with the score and the opponent. Tap into any match to see the full details, including the coach's report and any photos. It's the kind of thing that turns the drive home from football into a proper conversation.

## Growing as a player

The Progress tab is where development becomes tangible. You can see coach observations -tagged as technical, tactical, physical, or mental -laid out in a timeline. Each one includes context, so you know whether the feedback came from a match against a strong side or a training session focused on pressing.

If the coach has created an Individual Development Plan, it appears here with strengths highlighted, areas to work on clearly stated, and specific goals to aim for. For a young player, seeing "Your close control under pressure has really improved" written down and dated is more powerful than hearing it once at the side of the pitch and forgetting it by teatime.

Go through it together. Talk about what's going well and what to work on. The information is there to support those conversations, not replace them.

Badges and achievements -Player of the Match, Most Improved, Leadership Award -are displayed in a dedicated section. Each one shows when it was earned and the context. They build up over the season, and the best ones end up screenshot and sent to grandparents.

## Having a voice

The suggestions feature is deliberately simple. Parents and players can submit ideas to the coaching team. It might be about training, communication, equipment, scheduling, or anything else. Submissions can be anonymous if preferred.

Each suggestion gets tracked with a status -pending, in review, acknowledged, or implemented -and the coach can respond. It's a small feedback loop, but it tells families that their voice matters. In a youth football environment, that message is worth more than most tactical adjustments.

## The schedule that keeps everyone sane

The Lounge includes a full team calendar with both match and training views. You can see what's coming up, check times and venues, and mark availability directly. There's a calendar export that drops fixtures into your phone calendar, so "I didn't know there was training" stops being a weekly conversation.

Training sessions show the focus areas, duration, venue, and -if the coach has shared a plan -the full session breakdown with drills, coaching points, and a "what to bring" checklist. Turning up to an S&C session in football boots gets a gentle nudge to bring trainers and a water bottle instead.

## The daily touch

Every day, the Lounge shows a different motivational quote. It cycles through words from coaches and athletes -the kind of short, punchy lines that resonate with young players. "I fear not the man who has practised 10,000 kicks once, but I fear the man who has practised one kick 10,000 times." It's not life-changing. But it sets a tone. This is a place where football matters, where effort is valued, and where your child is part of something.

Team announcements appear on the home screen with priority indicators. Urgent messages are impossible to miss. Pinned announcements stay visible. And the notification bell in the corner keeps a running count of what's new.

## What it actually feels like

The Player Lounge isn't a portal. It's not a noticeboard. It's the feeling of being part of a team, shared between a parent and their child.

For the family, it's knowing when the next match is, reading the coach's message, checking if they got Player of the Match, and asking The Gaffer how to curl a free kick. It's the team, in your pocket.

For the parent specifically, it's knowing where to be and when, watching the stream when you can't be there, seeing your child's development laid out across a season, and feeling connected to something your child cares about deeply. You have full access and full control, always.

Grassroots football is built on community. The Player Lounge is what that community looks like when families have the right tools.`
  }
]

async function seed() {
  console.log('Seeding blog posts...')
  for (const post of posts) {
    const slug = post.slug
    const existing = await pool.query('SELECT id FROM blog_posts WHERE slug = $1', [slug])
    if (existing.rows.length > 0) {
      console.log(`  Skipping "${post.title}" (already exists)`)
      continue
    }

    await pool.query(
      `INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, status, author_name, tags, meta_title, meta_description, published_at)
       VALUES ($1, $2, $3, $4, NULL, 'published', $5, $6, $7, $8, NOW())`,
      [post.title, slug, post.excerpt, post.content, post.author_name, post.tags, post.meta_title, post.meta_description]
    )
    console.log(`  Published "${post.title}"`)
  }
  console.log('Done.')
  await pool.end()
}

seed().catch(err => { console.error(err); process.exit(1) })
