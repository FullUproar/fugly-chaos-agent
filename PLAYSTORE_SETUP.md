# Google Play Store — Internal Testing Setup

## Prerequisites
- Google Play Developer account ($25, verified)
- EAS CLI installed (`npm install -g eas-cli`)
- Expo token: set `EXPO_TOKEN` env var or run `eas login`

## 1. Create App on Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. **All apps** → **Create app**
3. App name: **Fugly's Chaos Agent**
4. Default language: **English (US)**
5. App or Game: **Game**
6. Free or Paid: **Free**
7. Accept all declarations → **Create app**

## 2. Set Up Internal Testing Track

1. In your app dashboard → **Testing** → **Internal testing**
2. Click **Create new release**
3. Google will ask about Play App Signing — **accept the defaults** (let Google manage signing)
4. Don't upload the AAB yet — build it first (step 4 below)
5. Go to the **Testers** tab → **Create email list**
6. Name it "Alpha Testers"
7. Add Gmail addresses of your testers

## 3. Build the Production AAB

From the project root on any machine:

```bash
cd apps/mobile
export EXPO_TOKEN=eD5PvwFh_ARsnIeqp93qesx7Cuu0fNZ9LIaJyS5F
eas build --platform android --profile production --non-interactive
```

This builds an AAB (Android App Bundle) in the cloud via EAS. Takes ~10-15 minutes.

When done, download the AAB from the Expo dashboard:
- Go to [expo.dev/accounts/fulluproar/projects/chaos-agent](https://expo.dev/accounts/fulluproar/projects/chaos-agent)
- Click the latest **production** build
- Click **Download build** to get the `.aab` file

## 4. Upload AAB to Play Console

1. Go back to **Testing** → **Internal testing** → **Create new release** (or edit draft)
2. Upload the `.aab` file you downloaded
3. Release name: `0.1.0-alpha`
4. Release notes:
```
Fugly's Chaos Agent — Alpha Build

Welcome to the chaos. This is an early test build — expect rough edges.

What's in this build:
- Create or join rooms with a code
- Standing missions (free-for-all rules that run all night)
- Flash missions (surprise timed challenges)
- Claim & vote: LEGIT or BULLSHIT with dramatic reveals
- Mini-games: Drawing Contest, Caption This, Hot Takes, Lie Detector
- Table Talk chat (room-wide + secret DMs)
- Polls, signals, and a nudge button for slow voters
- Photo challenges
- Plan a Night with teaser drip system
- Leaderboard + end-of-game recap

Known issues:
- Some screens may feel cramped on smaller phones
- Sound effects are placeholder
- AI-personalized missions not yet enabled
- Intermission flow untested

Report bugs to Shawn. Or don't. Chaos doesn't follow rules.
```
5. Click **Review release** → **Start rollout to Internal testing**

## 5. Share With Testers

1. Go to **Internal testing** → **Testers** tab
2. Copy the **invite link** (looks like `https://play.google.com/apps/internaltest/...`)
3. Send that link to your testers
4. They tap the link → accept the invite → install from Play Store
5. App appears as "Fugly's Chaos Agent" in their Play Store

## 6. Updating the App

When you want to push a new build:

```bash
cd apps/mobile
eas build --platform android --profile production --non-interactive
```

Then download the new AAB and upload it as a new release on the internal testing track. Testers get auto-updated.

## Quick Reference

| Item | Value |
|------|-------|
| Package name | `com.fugly.chaosagent` |
| Expo project | `fulluproar/chaos-agent` |
| Expo project ID | `9551d205-7f4f-4b36-b20c-2d982ca2662a` |
| Supabase project | `fyiyhzwkbmgggtpxxnjq` |
| EAS build profiles | `development`, `preview` (APK), `production` (AAB) |
| Supabase dashboard | [supabase.com/dashboard/project/fyiyhzwkbmgggtpxxnjq](https://supabase.com/dashboard/project/fyiyhzwkbmgggtpxxnjq) |
| Expo dashboard | [expo.dev/accounts/fulluproar/projects/chaos-agent](https://expo.dev/accounts/fulluproar/projects/chaos-agent) |
| GitHub repo | [github.com/FullUproar/fugly-chaos-agent](https://github.com/FullUproar/fugly-chaos-agent) |

## Troubleshooting

**Build fails with "Unknown error":**
- Run `npx expo export --platform android` locally to find the JS bundling error
- Usually a missing dependency — install it and rebuild

**"Owner mismatch" error on EAS:**
- Make sure `app.json` has `"owner": "fulluproar"` (not `full-uproar-games`)

**Testers can't find the app:**
- They must use the exact Gmail address you added to the tester list
- They must accept the invite link BEFORE searching Play Store
- Internal testing can take up to a few hours to propagate (usually minutes)

**Need to test without Play Store:**
- Use the `preview` profile: `eas build --platform android --profile preview`
- Share the Expo build link directly — testers install APK manually (requires "Install from unknown sources")
