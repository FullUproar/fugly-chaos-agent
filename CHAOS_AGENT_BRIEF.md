# Fugly's Chaos Agent — Complete Product Brief

**Last Updated:** 2026-03-24
**Status:** Alpha — feature-complete, entering beta testing
**Repository:** https://github.com/FullUproar/fugly-chaos-agent
**Company:** Full Uproar Games, Inc.

---

## What It Is

Fugly's Chaos Agent is a mobile app (Android, iOS planned) that injects fun, unpredictable chaos into social gatherings. It's not a standalone game — it's a chaos layer that overlays any activity: board game nights, parties, bar hangouts, work events, family dinners, cast parties.

**The Pitch:** "Your phone just became a secret agent. Everyone's got missions. Nobody knows who's doing what. Trust no one."

## How It Works

Players join a room via a 6-character code or QR scan. The app delivers secret missions, surprise challenges, polls, and social signals — all silently through phones. Players claim completed missions, and the group votes LEGIT or BULLSHIT with dramatic theatrical reveals. Points are earned, reputations are built, chaos ensues.

## Two-Product Ecosystem

Chaos Agent exists within the Full Uproar ecosystem alongside **Afterroar HQ** (a web-based game night planning tool at fulluproar.com).

- **Chaos Agent** (this app) — The in-the-moment chaos engine. Works completely standalone.
- **Afterroar HQ** (website, already built) — The ritual layer. Crew management, game night planning, advanced scheduling, voting on dates, recaps, season standings, Game Night Wrapped, rivalry cards.
- **Neither requires the other.** Each drives traffic to the other through added value. Never upsells. The brand is explicitly anti-corporate. Anything that feels like a sales pitch is a hard no.
- AHQ uses the term "Crew" (not "Group") for player groups.

### Integration Points
- **Auth:** Standalone uses anonymous Supabase auth. Optional "Connect to Full Uproar" via OAuth links to Afterroar account.
- **Session sync:** Chaos results push to AHQ recap system when session ends.
- **Cross-night stats:** Aggregate to crew member profiles on AHQ.
- **One-button trigger:** AHQ Game Night Dashboard can launch Chaos Agent sessions.
- **Scheduled events:** AHQ events can pre-populate Chaos Agent rooms.

## Experience Lifecycle

The app supports a spectrum from quick-play (join and go) to planned events (days of buildup):

### 1. INVITE
- Host creates event: "Play Now" (instant) or "Plan a Night" (scheduled with date/time)
- Generates shareable invite link / QR code
- Players RSVP and answer pre-game questions about each other
- Host can add/remove players during this phase
- Basic scheduling in-app; advanced scheduling nudges toward AHQ ("Need to find a date that works for everyone? Your crew on Afterroar HQ can help with that.")

### 2. SLOW BURN (optional)
- Days before the event, teasers build paranoia
- 44 teaser templates in Fugly's voice across 5 categories (personal, group, mysterious, threat, countdown)
- AI mode generates personalized teasers using player data
- One teaser per day at random times between 10am-8pm
- Examples: "Someone in your group has a secret weakness... we'll exploit it.", "Your chaos profile is being compiled...", "The missions are ready. You are not."

### 3. PRE-GAME
- Night of. Players check in. Setup questions feed the mission engine.
- 4 setup questions: chaos_comfort (chill/moderate/maximum), social_style (observer/participant/instigator), physical_ok, competitive_ok
- Plus a wildcard question that varies by game type
- First-timers see the "Code of Chaos" rules modal (keep it fun not mean, in Fugly's voice)
- Late arrivals can join mid-game

### 4. ACTIVE PLAY

#### Standing Missions
- Free-for-all rules active all night (e.g., "Catch someone checking their phone — claim it")
- Most are claim-once-and-vanish; some (like forbidden word traps) are repeatable
- Hidden by default — one surfaces at a time as a subtle reminder, not a wall of cards
- When someone claims, that mission locks for everyone until voted on
- After resolution, mission reopens (if repeatable) or disappears (if one-time)

#### Flash Missions
- Surprise time-limited challenges pushed at random intervals
- Three types: race (first to claim wins), target (directed at specific player), group (everyone participates)
- Full-screen overlay with countdown timer and claim button
- AI mode generates contextual flashes referencing recent events

#### Mini-Games
- **Drawing Contest** (Drawful-style): Wacky prompt, everyone draws on a canvas (thin/thick pen, 7 colors), everyone votes on favorites
- **Caption This** (Quiplash-style): Scenario presented, everyone writes a caption, anonymous voting
- **Hot Takes**: Wild statement, agree/disagree, minority opinion gets bonus points
- **Lie Detector**: One player tells a story, group votes truth or bluff

#### Table Talk Chat
- Room-wide chat ("TABLE" tab) + private DMs ("WHISPER" tab)
- Tap a player name to start a DM
- DM messages shown with lock icon
- Unread message count badge
- Feeds AI context for personalized missions (paid tier)

#### Polls
- Mid-game group votes pushed between flash missions
- Fun: "Who's the most chaotic tonight?" / Useful: "Ready for a break?"
- Stay open until dismissed (no auto-expire timer)
- Results visible to all

#### Social Signals
- Quick-tap feedback that triggers real game consequences
- Types: "Shake it up" (queues a flash mission), "Slow your roll", "Target [player]", "I'm bored"
- Instant theatrical responses with rotating messages ("Hell yeah, let's do it!", "Chaos incoming...", "You asked for it!")
- 30-second cooldown per signal type

#### Photo Challenges
- Opt-in per room (toggle during setup)
- Camera/gallery capture with caption
- Photos feed into the shareable recap
- Flash missions can require photos ("Take a selfie of the whole party")

### 5. INTERMISSION
- Host-triggered breaks at any time
- Animated Fugly chilling with a beverage
- "Halftime Report" — mid-game stats, funniest moments, who's leading
- Quick polls during break
- Mission refresh — retire stale missions, introduce fresh ones
- Countdown timer (host sets duration)

### 6. RESULTS
- Dramatic final standings revealed one player at a time
- Highlights: "Most Bullshitted", "Chaos Champion", "Biggest Bluffer"
- Photo grid from the night
- Shareable recap card (Instagram story format, 9:16, 1080x1920) via native share sheet + save to photos
- Stats sync to Afterroar HQ for linked players

### 7. REPLAY
- "That was epic. Make it a ritual?"
- One tap: schedule next session (stays in app, basic)
- Or: "Your crew on Afterroar HQ can keep the streak going" (only if not linked, shown once, dismissible)
- If already linked: "Next Thursday Crew night is in 4 days"
- Stats persist: "You've played 3 nights together"
- "Play again now?" for quick rematches same night

## Claim & Vote Mechanics

This is the core game loop and where the theatrical energy lives:

1. **Player claims a mission** → that mission locks for everyone
2. **Claim alert steals focus** from any tab — slides down with inline LEGIT/BULLSHIT vote buttons and a decay timer bar
3. **All eligible voters must vote** — no early majority cutoff
4. **Auto-accept timeout:** 60 seconds for flash missions, 180 seconds for standing missions. Non-voters default to ACCEPT after timeout.
5. **Verdict reveal:** Dramatic overlay — "VOTES ARE IN..." → pause → vote cards flip one by one → "IT IS..." → "BULLSHIT!" with 90+ rotating expressions (different every time)
6. **Tie-breaking:** Server timestamp for simultaneous claims, coin flip on exact ties
7. **Points:** Missions award 5-50 points based on difficulty. Failed claims deduct 5 penalty points.
8. **Nudge button:** When a vote is pending, poke non-voters with escalating messages across 4 tiers (gentle → pointed → aggressive → unhinged). 30-second cooldown.
9. **Grey countdown bar:** After you've voted, the Activity tab shows a muted grey bar with vote tally ("2/4 voted") so you know you're not blocking.

### Verdict Expressions (90+ rotating, never repeat within a session)
- LEGIT: "CLEAN AS A WHISTLE", "GIGA CHAD ENERGY", "SMOOTH OPERATOR", "THE COUNCIL APPROVES", etc.
- BULLSHIT: "SHAME, CHAOS AGENT SEES ALL", "BUSTED", "NICE TRY THOUGH", "THE AUDACITY", etc.

## Player Profiles & Progression

- **Anonymous by default** — no account needed, just join and play
- **Optional Afterroar HQ link** — persists stats across sessions
- **Chaos titles** progress with games played:
  - 0-2 games: "Chaos Rookie"
  - 3-5: "Agent of Mischief"
  - 6-10: "Certified Troublemaker"
  - 11-20: "Master of Mayhem"
  - 21-50: "Legendary Chaos Lord"
  - 50+: "Fugly's Chosen One"
- **Lifetime stats:** Games played, total points, claims won/lost, bullshit call accuracy, win rate

## Monetization Strategy

- **Free tier:** Curated static mission pool (20+ standing templates, flash templates, all mini-games). Full game experience. All stats persist. This is a complete, fun product.
- **Paid tier** (Afterroar subscription): AI-generated personalized missions via Claude. Cross-session memory ("Last time, Mike fell for every pun..."). Table Talk chat context feeds mission generation. Advanced crew features.
- **Physical game integration:** Full Uproar's product line (Hack Your Deck, Splice Your Dice, Crime and Funishment, Dumbest Ways To Win) are chaos expansion decks that mod other games. Surface contextually: "Playing Uno tonight? Hack Your Deck adds chaos rules that stack on top." Enhancement suggestions alongside games, not replacements. Never interruptive.
- **All product recommendations are value-first.** They only surface when there's a genuine lineup gap and a strong match.

## Technical Architecture

### Tech Stack
- **Frontend:** React Native (Expo SDK 55) — iOS + Android from single codebase
- **Backend:** Supabase (PostgreSQL, Anonymous Auth, Edge Functions in Deno)
- **AI:** Claude API via Supabase Edge Functions (paid tier missions + teasers)
- **Distribution:** EAS Build for cloud APK/AAB. Google Play internal testing track for beta.
- **Real-time:** Polling-based (3s default, 10s with push notifications enabled). Push notifications via Expo Push API for key events.

### Repository Structure
```
fugly-chaos-agent/
  apps/
    mobile/          # React Native (Expo) app
      app/           # Expo Router screens
        index.tsx         # Home screen (Play Now / Plan a Night / Join Room)
        create.tsx        # Create room screen
        join.tsx          # Join room screen
        plan.tsx          # Plan a Night screen
        event/[id]/
          invite.tsx      # Event invite management + teasers
        room/[code]/
          _layout.tsx     # Room layout wrapper
          lobby.tsx       # Pre-game lobby
          setup.tsx       # Setup questions
          play.tsx        # Main gameplay (3 tabs: Missions/Activity/Leaderboard)
          results.tsx     # End-game results + recap
          replay.tsx      # Post-game replay options
      src/
        components/       # Reusable UI components
          ClaimAlert.tsx       # Vote alert overlay (steals focus)
          VerdictOverlay.tsx   # Dramatic vote result reveal
          FlashMissionOverlay.tsx
          PollOverlay.tsx
          SignalPanel.tsx
          TableTalk.tsx        # Chat (room-wide + DMs)
          MiniGameOverlay.tsx  # Drawing/Caption/HotTakes/LieDetector
          DrawingCanvas.tsx
          IntermissionOverlay.tsx
          PhotoCapture.tsx
          RoomCodeShare.tsx    # QR code + share overlay
          RecapCard.tsx        # Shareable recap image
          AHQConnect.tsx       # Afterroar HQ OAuth WebView
          CodeOfChaos.tsx      # First-time rules modal
          Toast.tsx            # Global toast system
          HourglassTimer.tsx
        hooks/
          use-polling.ts       # Smart polling (push-aware)
          use-debounce-press.ts
        lib/
          api.ts               # All API endpoint wrappers
          auth.ts              # Supabase auth + token refresh
          notifications.ts     # Push notification registration
          sounds.ts            # Sound effect system (expo-av)
          haptics.ts           # Haptic feedback patterns
        stores/
          session-store.ts     # Zustand store (all game state)
        theme/
          colors.ts            # Full Uproar brand colors
      assets/
        FuglyLaying.webp       # Fugly mascot
        FuglyLogo.webp         # Fugly with company name
    supabase/
      migrations/              # 8 SQL migrations
        001_initial_schema.sql
        002_mission_refactor.sql
        003_event_lifecycle.sql
        004_mini_games.sql
        005_photos.sql
        006_push_tokens.sql
        007_ahq_integration.sql
        008_table_talk.sql
      functions/               # 31 Supabase Edge Functions (Deno)
        _shared/
          supabase-client.ts   # Admin client
          cors.ts              # CORS headers
          claude.ts            # Claude API helper
          push.ts              # Expo Push API helper
          mission-pool.ts      # Mission generation logic
        create-room/
        join-room/
        setup-complete/
        generate-missions/     # Static pool or AI-generated
        room-state/            # Main polling endpoint
        claim-mission/         # With tie-breaking
        vote-claim/            # With push notifications
        end-session/           # With AHQ sync
        trigger-event/         # Flash missions + polls (dev backdoor)
        send-signal/
        send-message/          # Table Talk
        get-messages/
        mini-game/
        nudge-voters/
        start-intermission/
        end-intermission/
        create-event/
        invite-player/
        respond-invite/
        event-state/
        generate-teasers/
        get-teasers/
        upload-photo/
        get-photos/
        register-push-token/
        send-push/
        submit-poll-vote/
        session-highlights/
        link-ahq-account/     # OAuth flow
        sync-to-ahq/          # Session result sync
        get-player-profile/
  packages/
    shared/                    # Shared types + constants
      src/
        types/
          database.ts          # All data models
          api.ts               # Request/response types
        constants/
          standing-missions.ts # 20+ mission templates
          flash-missions.ts
          poll-questions.ts
          teasers.ts           # 44 teaser templates
          game-types.ts
          setup-questions.ts
          scoring.ts           # Points, timers, intervals
```

### Database Tables
| Table | Purpose |
|-------|---------|
| players | Anonymous auth users |
| rooms | Game sessions (status: LOBBY/SETUP/ACTIVE/INTERMISSION/ENDED) |
| room_players | Players in a room (nickname, score, setup_answers, push_token, ahq_user_id) |
| missions | Standing + flash missions (type, category, points, expiry, target) |
| claims | Mission claim attempts (status: PENDING/ACCEPTED/CHALLENGED/VOTE_PASSED/VOTE_FAILED) |
| votes | Individual votes on claims (ACCEPT/BULLSHIT) |
| signals | Social signals (shake_it_up, slow_your_roll, target_player, im_bored, nudge) |
| polls | Mid-game polls with options |
| poll_votes | Individual poll responses |
| messages | Table Talk chat (room-wide + DMs) |
| photos | Captured photos linked to rooms/missions |
| event_invites | Planned event RSVPs |
| teasers | Scheduled pre-event teasers |
| mini_game_sessions | Mini-game instances |
| mini_game_submissions | Player submissions (drawings, captions, votes) |
| player_profiles | Cross-session persistent stats + chaos title |
| session_history | Per-session results for each player |

### Key Configuration
- **Supabase Project:** fyiyhzwkbmgggtpxxnjq.supabase.co
- **Supabase anon key:** JWT (stored in .env)
- **Claude API key:** Stored as Supabase secret (CLAUDE_API_KEY)
- **Expo account:** fulluproar (EAS Build)
- **Package name:** com.fugly.chaosagent
- **EAS Project ID:** 9551d205-7f4f-4b36-b20c-2d982ca2662a

## Brand Identity

- **Company:** Full Uproar Games
- **Mascot:** Fugly (appears on home screen, intermission, branding)
- **Primary Orange:** #FF8200 (accent everywhere)
- **Highlight Yellow:** #FBDB65 (secondary headings)
- **Dark Background:** #111827 with gradient into #1f2937
- **Success Green:** #10b981 | Error Red: #ef4444 | Warning Yellow: #fbbf24
- **Buttons:** Pill-shaped (border-radius 50px), dark text on orange, weight 900
- **Font:** Geist Sans equivalent (system font, bold headings)
- **Tone:** Chaotic, playful, irreverent. Anti-corporate. Fun energy, not corporate polish.

## Key Design Principles

1. **The app should feel like a loaded gun, not a to-do list.** Quiet, tense, then BANG.
2. **Focus is everything.** One thing happening at a time so punchlines land.
3. **Every UI moment needs theatrical animated energy.** No silent state changes.
4. **Signals trigger real game consequences,** not just feedback to an AI.
5. **Ecosystem gravity, not sales pitches.** "Want to make this a ritual?" not "Subscribe now!"
6. **Stats are free.** The paid value is the AI chaos engine and the ritual layer.
7. **Every moment of chaos lives forever.**

## Current State (2026-03-24)

### What's Built and Working
- Full room lifecycle (create, join, setup, play, results, replay)
- Standing missions + flash missions + polls + signals
- Claim/vote mechanics with theatrical verdict overlay (90+ expressions)
- Claim alert that steals focus from any tab
- Mini-games (Drawing, Caption, Hot Takes, Lie Detector)
- Table Talk chat (room-wide + DMs)
- Photo challenges with camera/gallery capture
- Room code QR share overlay
- Push notifications (smart polling: 10s with push, 3s fallback)
- Nudge button with 4-tier escalating messages
- Sound effects system + haptic feedback patterns
- AI-personalized missions via Claude context loop (paid tier)
- Shareable recap card export (Instagram story format)
- Slow burn teaser drip system (44 templates)
- Event lifecycle (invite/pre-game/active/intermission/results/replay)
- Afterroar HQ OAuth + player profiles + session sync
- Safe area insets + keyboard avoiding + touch targets on all screens
- EAS Build pipeline for cloud builds
- 31 edge functions deployed, 8 database migrations applied

### What's Built but Untested
- Mini-games end-to-end flow
- Photo challenge flow with flash mission integration
- Push notifications on real devices
- AI mission generation with real Claude responses
- Teaser drip delivery timing
- AHQ OAuth flow (needs endpoint on fulluproar.com)
- Recap image export quality

### Known Issues / Polish Needed
- Sound effects are placeholder (need real audio files)
- Some screens may feel cramped on very small phones
- Editorial pass needed on all mission/teaser/verdict content for humor and tone
- Standing mission UI should hide by default (surface one at a time as reminders)
- Date/time picker on Plan a Night is basic text input (needs proper picker)
- Intermission flow needs full testing
- Cross-session stat persistence needs real-world testing

### Deployment Status
- **Supabase:** All functions deployed, all migrations applied
- **Play Store:** Google Play Developer account created, pending identity verification. AAB built and ready to upload to internal testing track.
- **APK:** Preview build available at Expo for sideloading

## Development Workflow

### Local Development
```bash
git clone https://github.com/FullUproar/fugly-chaos-agent.git
cd fugly-chaos-agent
npm install
cd apps/mobile
npx expo start --dev-client
```

### Building for Testing
```bash
cd apps/mobile
export EXPO_TOKEN=<token>
eas build --platform android --profile preview  # APK for sideloading
eas build --platform android --profile production  # AAB for Play Store
```

### Deploying Edge Functions
```bash
export SUPABASE_ACCESS_TOKEN=<token>
npx supabase functions deploy --no-verify-jwt --workdir apps
```

### Running Database Migrations
```bash
export SUPABASE_ACCESS_TOKEN=<token>
npx supabase db push --workdir apps --password '<db_password>'
```

### Bot Testing (simulating players via curl)
The `trigger-event` edge function serves as a dev backdoor for testing flash missions, polls, and events. Bot players can be created via anonymous auth signup + join-room API calls to simulate multi-player scenarios.
