# Fugly's Chaos Agent — Product Specification

*Last Updated: 2026-04-16*
*Platform-agnostic spec — applies to mobile (current) or web (potential)*

---

## 1. The North Star

**Chaos Agent is a chaos overlay for real-life social gatherings.** It's not a game you play — it's a layer you run alongside whatever you're already doing: a board game, a party, dinner, a bar night. Phones deliver secret missions, surprise challenges, and dramatic verdicts while the actual gathering continues around it.

### What it is NOT
- A standalone game like Jackbox (we don't compete for attention with the main activity)
- A social media app (no feeds, no followers, no algorithmic timeline)
- A sales vehicle for physical games (brand is explicitly anti-corporate — simulation proved direct pitches hurt experience)

### What it IS
- A **sidecar** — runs in the background, interrupts only when it has something good
- A **theater** — every moment is a performance, every vote a dramatic reveal
- A **memory machine** — captures the night's highlights for later sharing
- A **ritual engine** — builds weekly/monthly rhythms that become part of your crew's identity

---

## 2. The Core Experience Loop

### The Room
A shared session of 3-12 people. Joined via a 6-character code or QR scan. Each player is on their own phone. No accounts required — just a nickname.

### The Four Event Types
1. **Standing Missions** — Long-running rules active during the session ("Catch someone saying 'um' — claim it"). Most claim-once-and-vanish, some repeatable (forbidden word traps).
2. **Flash Missions** — Surprise time-limited challenges that interrupt the main activity ("First person to yell CHAOS AGENT wins 10pts"). Three flavors: race (first wins), target (aimed at a specific player), group (everyone participates).
3. **Polls** — Quick group votes that feed back into gameplay ("Who's the most chaotic tonight?"). Stay open until dismissed.
4. **Mini-Games** — Jackbox-style interludes (drawing, caption, hot takes, lie detector, worst advice, speed superlative, etc.).

### The Claim/Vote Cycle (The Money Moment)
1. Someone claims they completed a mission → phone taps, claim fires
2. **Claim alert** steals focus on everyone else's phone with a decay timer
3. **Voting mechanic** gets randomly selected from 15+ options (Standard, Dictator, Reverse Psychology, Auction, Russian Roulette, etc.) — you don't know how you'll be judged until you're in it
4. Players vote (or bid, or pitch, or whatever the mechanic demands)
5. **Verdict overlay** fires with drama: "VOTES ARE IN..." → vote cards flip one by one → "IT IS..." → dramatic reveal with 80+ rotating flavor messages ("GIGACHAD MOVE!" / "BULLSHIT!" / "HOGWASH!" / "THE LIE DETECTOR DETERMINED...")
6. Points awarded or deducted, moment captured for recap

---

## 3. The Experience Lifecycle

Spans quick-play (join and go) to planned multi-hour events.

### Phase 1: INVITE (optional, days before)
- Host creates event with date/time via "Plan a Night" (basic scheduling in-app; advanced scheduling nudges toward Afterroar HQ website)
- Players RSVP and answer pre-game questions about each other
- Host can add/remove players during this phase

### Phase 2: SLOW BURN (optional, days before)
- Teasers drip to players at random times: "Your chaos profile is being compiled..." / "Someone in your group has a weakness we'll exploit."
- Builds paranoia and anticipation
- Host can toggle on/off per event

### Phase 3: PRE-GAME (night of)
- Players check in, enter nicknames
- Setup questions feed the AI: chaos comfort (chill/moderate/maximum), social style (observer/participant/instigator), physical OK, competitive OK
- First-timers see "Code of Chaos" rules modal
- Late arrivals can join mid-game

### Phase 4: ACTIVE PLAY (the session itself)
- Calm by default — "All quiet... for now."
- 1-2 standing missions visible at a time (rotating every 10-15 min)
- Flash missions interrupt at context-appropriate intervals
- Polls and mini-games scattered throughout
- Room temperature visualizes group energy (see Section 6)

### Phase 5: INTERMISSION (host-triggered)
- Animated Fugly chilling with a beverage
- Halftime stats, mid-game highlights
- Mission refresh — stale missions expire, new ones surface
- Countdown timer (host sets duration)

### Phase 6: RESULTS (end of night)
- Dramatic final standings revealed one player at a time
- Highlights: "Most Bullshitted", "Chaos Champion", "Biggest Bluffer"
- Captured moments grid (auto + manual)
- Shareable recap card (Instagram story format)
- TikTok-ready caption options

### Phase 7: REPLAY (the flywheel back)
- **"🔥 {N}-WEEK STREAK. Don't break it."** (simulation's #1 retention mechanic)
- "Season 3, Episode 8" framing makes each night feel episodic
- One tap to schedule next session
- "Play again now" for same-night rematches

---

## 4. Simulation-Validated Design Rules

96 simulations across 5 rounds with Claude-powered agent personas (Competitor, Social Butterfly, Phone Checker, Rules Lawyer, Newbie, Host, Quiet One, Instigator). Every design decision below is backed by composite scores.

### Timing Rules
- **Board games need sparse chaos** — 1 event every 20-30 min. Suppress during high tension moments.
- **Parties work at medium pace** — 1 event every 8-12 min. Don't overcook.
- **Bar nights need the LEAST chaos** — 1 event every 10-15 min. The bar provides the chaos already.
- **Dinner parties use polls only** — NO flash missions, social/alliance mission categories only.
- **10+ player groups need half frequency** — more people = more natural social chaos happening already.
- **Linear escalation beats waves** — gentle start → intense finish (movie arc). Don't alternate.

### Feature Rules
- **Standing missions MATTER** — removing them dropped scores by 10 points. They provide background texture.
- **Mini-games alone FAIL** — need the full event mix (flash + poll + standing + mini-game). Variety is the engine.
- **Full feature stack compounds** — everything ON beats partial (65.8 vs 61.0 vanilla). Features multiply, not add.
- **Adaptive AI frequency > Deep AI personalization** — reading the room energy is more valuable than clever content.

### What NOT to Do (hard rules from data)
- **DON'T rubber-band** — Target-the-leader and comeback mechanics scored WORST vs control. Players want fairness, not pity.
- **DON'T patronize newbies** — Equal treatment beats tutorials and buddy systems. Newbies are resilient.
- **DON'T pitch products** — Direct sales scored worst. Social proof barely tolerable. Let the ecosystem sell itself.
- **DON'T be subtle with notifications** — People WANT to be interrupted. Silent/subtle modes lost to standard alerts.
- **DON'T over-engineer teasers** — Simple invite nearly matched elaborate teasers. Save the effort.

### The Killer Retention Insights
1. **"Don't break the streak" scored 73.4** — highest of any single feature. Not "Schedule next week" but "The streak is alive. Don't let it die."
2. **Season/episode framing scored 69.7** — "Season 3, Episode 8 of The Thursday Wrecking Crew." Makes every night feel like episodic TV.
3. **Social share awareness scored 68.0** — When players know the recap will be shared, they try harder. The recap IS the growth engine.

### The Peak Experience
**75.5 was the all-time high score.** Scenario: mix of experienced + brand-new players, treated equally, standard frequency. Translation: **Chaos Agent shines brightest when you're initiating newbies without making a big deal of it.** This informs the entire product positioning.

---

## 5. The Cast of Personas (who plays this)

From simulation, 8 archetypes each game night includes some of:

- **The Competitor** — wants to WIN the main game, annoyed by chaos interruptions during critical moments. Needs: conservative frequency, tension suppression.
- **The Social Butterfly** — here for the vibes, loves any interruption, generous voter. Needs: anything works.
- **The Phone Checker** — half-attention, misses ~40% of events, asks "wait, what happened?" a lot. Needs: catch-up signals.
- **The Rules Lawyer** — questions every mechanic's fairness. Needs: clear rules, predictable mechanics.
- **The Newbie** — first-timer, could go either way. Insight: don't baby them, treat them equally.
- **The Host** — managing snacks, flow, wants everyone happy. Needs: host superpowers (force break, trigger event, boost energy).
- **The Quiet One** — observes, participates when pulled in directly. Needs: gentle targeting, not aggressive.
- **The Instigator** — pushes every button, lives for chaos, strategic voter. Needs: maximum chaos setting.

A good room has 2-3 of these types. Design must serve all of them simultaneously.

---

## 6. Room Temperature / Vibe System (spec, not yet built)

Real-time visualization of group energy, driven by aggregated signals.

### The Color Spectrum
Players can signal "shake it up" / "slow your roll" / "I'm bored". The aggregate shifts the screen edge color:

- 🔴 **Red pulse** — Dead room. Signals screaming for help.
- 🔴 **Red glow** — Barely alive. Needs energy.
- 🟠 **Orange glow** — Warming up.
- 🟡 **Yellow glow** — Decent energy.
- 🟢 **Green** — Good vibes, things are working.
- 🟢 **Green shimmer** — Really flowing.
- 🔵 **Blue shimmer & waves** — In the zone. Peak experience.
- 🟣🟠 **Purple and orange fire** — Legendary. This is the night they'll talk about.

Subtle edge glow only — never competes with content. Fugly's expression (emotive mascot, illustrator TBD) matches the vibe in a corner.

### Signal Rework
- **No points for signals** — currently can be spammed for XP farming
- **60-second cooldown per signal type**, max 1 signal per player per 5 minutes
- Signals feed the temperature, which feeds the **auto-scheduler** (fire events sooner when cool, back off when hot)

### Vibe Targets (integrates with Afterroar HQ vibes)
AHQ events carry a vibe: CHILL, COMPETITIVE, CHAOS, PARTY, COZY. Each vibe has a target temperature zone:

| AHQ Vibe | Target Temperature | Ceiling |
|----------|-------------------|---------|
| CHILL | Green / Green shimmer | Yellow (never hotter) |
| COMPETITIVE | Yellow / Green | Green shimmer |
| CHAOS | Blue shimmer+ | Purple/orange fire (go there) |
| PARTY | Green shimmer / Blue | Blue shimmer |
| COZY | Green | Green shimmer (warm never hot) |

Scheduler adjusts frequency to hit the target for the current vibe. Colors can be aligned across Chaos Agent and AHQ website for visual consistency across the ecosystem.

---

## 7. Challenge of the Night (spec, not yet built)

Currently missing — players see standing missions as a calm list. Missing: **one dramatic rallying point for the evening.**

### The Concept
At game start, one mission is announced dramatically: **"TONIGHT'S CHALLENGE: No one can say the word 'like'. Catch someone? Claim it."**

- Announced with theatrical reveal at game start (not buried in a list)
- Stays active ALL night — it's the background rule everyone knows about
- Claimable MULTIPLE times by different players (cooldown per player, 5-10 min)
- Gets its own visual treatment — persistent banner or corner indicator
- Everyone can see it, everyone plays it, it's the shared context

### Why It Matters
Simulation data showed standing missions work best when there's ONE focal point rather than a wall. This is the focal point. It's the campfire everyone gathers around.

---

## 8. Asymmetric Missions (spec, not yet built)

Currently every standing mission is public. Missing: **the private agenda layer.**

### Three Flavors

**Secret Missions (private)**
- Only YOU see it on your phone
- "Get Marcus to compliment someone without him realizing you caused it"
- Claim privately — others only see the verdict reveal, not the mission
- Creates paranoia: "why did you ask me that weird question?"

**Duo Missions (shared agenda)**
- Two players get the SAME target, neither knows the other has it
- "Both of you are trying to get River to tell a childhood story"
- First to claim wins. Creates natural competitive tension.

**Saboteur Missions (direct conflict)**
- Two players have missions that directly oppose each other
- Player A: "Get Marcus to laugh in the next 10 minutes"
- Player B: "Keep Marcus from laughing for 10 minutes"
- Players don't know they're in direct conflict until verdict

### Why It Matters
Public missions create a game. Secret missions create **a spy novel.** The mix is what makes every moment feel charged — any compliment could be a mission, any question could be an attack.

---

## 9. The Two-Product Ecosystem

### Chaos Agent (this product)
The in-the-moment chaos engine. Works completely standalone.

### Afterroar HQ (sister product — website)
The ritual layer. Crew management, planning, recaps, season standings.

### The Relationship
- Neither requires the other
- Each drives traffic to the other through earned value, never upsells
- AHQ can launch a Chaos Agent session ("One-button Chaos Agent trigger")
- Chaos Agent results push back to AHQ's recap system
- Crew identity (season/episode framing) lives in AHQ, shows up in Chaos Agent

### Integration Points (built or spec'd)
- **OAuth linking** — "Connect to Full Uproar" on Chaos Agent home screen (endpoint needs to be built on website)
- **Session sync** — On game end, stats push to player profile on AHQ
- **Crew identity** — Room carries crew name, season/episode if linked
- **Recap handoff** — Shareable recap card links to AHQ's full recap page
- **Cross-night stats** — Lifetime totals shown on home screen for linked players

### Monetization
- **Free tier**: Curated static missions, all mini-games, all voting mechanics, standalone play. This is a COMPLETE product.
- **Paid tier** (Afterroar HQ subscription): AI-generated personalized missions, adaptive frequency, cross-session memory, advanced crew features, AI recap narratives.

### Hard Rules
- **No product pitches in-app ever** (data-validated)
- **No upsells in the play flow** (breaks immersion)
- **AHQ nudges only appear at natural transition moments** (post-game, "make it a ritual")

---

## 10. What's Built vs What's Left

### Built & Working
- Full lifecycle: invite → slow burn → pre-game → play → intermission → results → replay
- Room creation with game type selection, optional room name, party mode toggle, speed round mode
- Standing missions (1-2 visible at a time, rotating)
- Flash missions (race, target, group)
- Polls and signals
- 10 mini-game types (drawing, caption, hot takes, lie detector, worst advice, speed superlative, emoji story, two-word story, bluff stats, assumption arena)
- 15 voting mechanics (standard, dictator, auction, russian roulette, etc.) with random selection
- 12 mini-game voting variations (worst wins, editor, double down, etc.)
- Theatrical verdict overlay with 80+ rotating flavor messages
- Claim alert steals focus from any tab
- Streak tracking with weekly rollover and expiry warnings
- Season/episode framing
- Auto-scheduler with context-aware frequency profiles per game type
- Escalation pacing (gentle start → intense finish)
- Adaptive AI frequency for paid tier
- Moment capture (auto + manual)
- Recap card with TikTok-ready captions
- Table Talk chat (room-wide + private DMs)
- Photo challenges with opt-in
- Room code QR share overlay
- Push notifications
- Sound effects + haptics
- Nudge button with escalating messages
- Host superpowers (force break, target quiet player, boost energy)
- Safe area insets, keyboard avoiding, touch targets
- Android back button confirmation

### NOT Built (priority order for next sprint)

1. **Room temperature/vibe system** (Section 6) — the color-shifting edges driven by signals
2. **Signal rework** (Section 6) — no points, cooldown, vibe-aware targets
3. **Challenge of the Night** (Section 7) — one dramatic mission per session
4. **Asymmetric missions** (Section 8) — secret, duo, saboteur variants
5. **Drawing canvas fix** — thicker pen, debounced touch, persistent strokes on real devices
6. **Emotive Fugly placeholder** — tiny reaction indicator matching temperature (illustrator TBD)
7. **AHQ OAuth endpoint** — needs page built on fulluproar.com side
8. **Vibe integration** — import AHQ vibes into room creation, set target temperature per vibe
9. **Mini-game trigger routing fix** — trigger-event returns "unknown" for mini_games (must call mini-game function directly right now)

### Known Bugs
- Mini-games triggered via `trigger-event` don't create DB records (must call mini-game function directly)
- Drawing canvas pen too thin and doesn't persist on real devices
- Rare verdict overlays missed if claim resolves while on different tab
- Token expiry possible on very long sessions despite refresh logic

---

## 11. The Brand Voice

Full Uproar Games. Mascot: Fugly. Primary orange #FF8200. Highlight yellow #FBDB65. Dark backgrounds.

**Voice rules:**
- Every UI moment needs theatrical animated energy — no silent state changes
- Every button should feel like lighting a fuse, not submitting a form
- Humor > professionalism (but never mean, never punching down)
- "Signals should feel like you just lit a fuse. Not a form submission."
- Never corporate, never apologetic. Fugly doesn't say sorry.
- Verdict messages should make people screenshot them

**Expressions that set the tone:**
- "GIGACHAD MOVE!" / "HOGWASH!" / "THE LIE DETECTOR DETERMINED..."
- "Your chaos profile is being compiled..."
- "Someone in your group has a weakness we'll exploit."
- "The streak is alive. Don't let it die."

---

## 12. The Success Metric

Not DAU. Not MAU. Not retention rate.

**The metric is: would someone's kid, at a cast party, open this app WITHOUT being asked, because their friends are already playing and they heard about it?**

Simulation showed the path there: streak pressure, social share awareness, season/episode framing, no overcooking. Build for that moment.
