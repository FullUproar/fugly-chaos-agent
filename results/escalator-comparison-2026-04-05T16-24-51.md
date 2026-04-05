# A/B Comparison Report: The Escalator

Compared 3 variations at 2026-04-05T16:24:51.709Z

## Variations Tested

- **A**: Linear ramp: flash interval starts at 20min, compresses to 3min by minute 120. Aggressive intervalRampFactor 0.3 means early events are 3x slower than baseline.
- **B**: Sudden spike: gentle pacing for 80 minutes, then EVERYTHING fires for the final 40. Neutral ramp factor — the spike is a hard cutover, not a gradient.
- **C**: Waves: 20min gentle, 10min intense, repeat. Breathing room between bursts. Wave pattern creates oscillating intensity without ever letting you settle.

## Session Metrics Comparison

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Overall Fun | 5.2/10 | 4.8/10 | 4.8/10 | **A** |
| Disruption Score | 3.1/10 | 2.4/10 | 3.1/10 | **B** |
| Engagement Rate | 68% | 78% | 67% | **B** |
| Event Density | 1.5/10min | 0.6/10min | 1.2/10min | - |
| Avg Energy End | 9.1/10 | 9.4/10 | 9.6/10 | **C** |
| Peak Fun Minute | min 3 | min 5 | min 3 | - |
| Peak Annoyance Minute | min 8 | min 5 | min 9 | - |

## Evaluation Factors Comparison

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Flash Frequency | 8.3/10 `########..` | 0/10 `..........` | 8.9/10 `#########.` | **C** |
| Flash Duration | 8.3/10 `########..` | 5/10 `#####.....` | 8.3/10 `########..` | **A** |
| Humor Quality | 5.2/10 `#####.....` | 4/10 `####......` | 4.5/10 `#####.....` | **A** |
| Game Disruption (inv) | 9.7/10 `##########` | 10/10 `##########` | 9.8/10 `##########` | **B** |
| Standing Engagement | 5.8/10 `######....` | 4.2/10 `####......` | 5.4/10 `#####.....` | **A** |
| Timing Correctness | 10/10 `##########` | 10/10 `##########` | 10/10 `##########` | **A** |
| Enhancement vs Destruction | 6.7/10 `#######...` | 6.3/10 `######....` | 5.8/10 `######....` | **A** |
| Mini-Game Fun | 0/10 `..........` | 4.3/10 `####......` | 0/10 `..........` | **B** |
| Overall Flow | 6.7/10 `#######...` | 6.5/10 `#######...` | 6.2/10 `######....` | **A** |
| Would Play Again | 8.3/10 `########..` | 8.3/10 `########..` | 6.7/10 `#######...` | **A** |
| Would Recommend | 8.3/10 `########..` | 8.3/10 `########..` | 6.7/10 `#######...` | **A** |
| Would Pay for AI | 3.3/10 `###.......` | 5/10 `#####.....` | 3.3/10 `###.......` | **B** |
| OVERALL | 6.3/10 `######....` | 6.3/10 `######....` | 6/10 `######....` | **A** |

## Virality Comparison

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Screenshot Moments | 6.7/10 | 5/10 | 3.3/10 | **A** |
| Social Media Mention | 5/10 | 5/10 | 3.3/10 | **A** |
| Next-Day Story | 10/10 | 10/10 | 10/10 | **A** |
| Group Bonding | 8.3/10 | 8.3/10 | 6.7/10 | **A** |
| Memeable Moments | 8.3/10 | 10/10 | 8.3/10 | **B** |

## Per-Agent Comparison

### Marcus

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 1.5/10 | 3.3/10 | 3.9/10 | **C** |
| Avg Annoyance | 7.4/10 | 6.3/10 | 4.6/10 | **C** |
| Engagement Rate | 9% | 100% | 67% | **B** |
| Final Energy | 5.3/10 | 8.7/10 | 9.7/10 | **C** |
| Final Score | 0 pts | 25 pts | 0 pts | **B** |
| Would Play Again | No | No | No | **A** |
| Would Pay for AI | No | No | No | **A** |

### Jade

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 6.2/10 | 5.3/10 | 5.3/10 | **A** |
| Avg Annoyance | 0.7/10 | 0.7/10 | 1.0/10 | **B** |
| Engagement Rate | 73% | 67% | 67% | **A** |
| Final Energy | 9.8/10 | 9.6/10 | 9.7/10 | **A** |
| Final Score | 40 pts | 0 pts | 45 pts | **C** |
| Would Play Again | Yes | Yes | Yes | **A** |
| Would Pay for AI | Yes | Yes | Yes | **A** |

### Tyler

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 4.4/10 | 1.7/10 | 5.2/10 | **C** |
| Avg Annoyance | 2.5/10 | 1.0/10 | 1.7/10 | **B** |
| Engagement Rate | 73% | 33% | 78% | **C** |
| Final Energy | 9.8/10 | 9.6/10 | 9.7/10 | **A** |
| Final Score | 3 pts | 0 pts | 0 pts | **A** |
| Would Play Again | Yes | Yes | Yes | **A** |
| Would Pay for AI | No | No | No | **A** |

### Pat

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 6.6/10 | 5.7/10 | 2.8/10 | **A** |
| Avg Annoyance | 3.6/10 | 2.3/10 | 7.6/10 | **B** |
| Engagement Rate | 82% | 100% | 33% | **B** |
| Final Energy | 9.8/10 | 9.6/10 | 9.1/10 | **A** |
| Final Score | 28 pts | 10 pts | 45 pts | **C** |
| Would Play Again | Yes | Yes | No | **A** |
| Would Pay for AI | No | Yes | No | **B** |

### River

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 6.2/10 | 7.0/10 | 6.4/10 | **B** |
| Avg Annoyance | 3.4/10 | 2.3/10 | 3.7/10 | **B** |
| Engagement Rate | 91% | 100% | 89% | **B** |
| Final Energy | 9.8/10 | 9.6/10 | 9.7/10 | **A** |
| Final Score | 13 pts | 10 pts | 10 pts | **A** |
| Would Play Again | Yes | Yes | Yes | **A** |
| Would Pay for AI | No | No | No | **A** |

### Alex

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 6.7/10 | 5.7/10 | 6.0/10 | **A** |
| Avg Annoyance | 1.2/10 | 0.7/10 | 1.3/10 | **B** |
| Engagement Rate | 82% | 67% | 78% | **A** |
| Final Energy | 9.8/10 | 9.6/10 | 9.7/10 | **A** |
| Final Score | 13 pts | 0 pts | 30 pts | **C** |
| Would Play Again | Yes | Yes | Yes | **A** |
| Would Pay for AI | Yes | Yes | Yes | **A** |

## Recommendation

**Variation A is optimal** (Linear ramp: flash interval starts at 20min, compresses to 3min by minute 120. Aggressive intervalRampFactor 0.3 means early events are 3x slower than baseline.).

Composite scoring (weighted: fun 3x, play-again 2x, flow 2x, low-disruption 1x, engagement 1x):

- **A**: 62.1 composite score <<<< WINNER
- **B**: 61.7 composite score
- **C**: 56.8 composite score (weakest)

---
*Generated at 2026-04-05T16:24:51.709Z by Chaos Agent Simulator -- A/B Comparison Engine*