# A/B Comparison Report: The 10-Player Stress Test

Compared 3 variations at 2026-04-05T16:29:59.320Z

## Variations Tested

- **A**: Standard frequency at 10 players. Baseline stress test — does normal pacing create a traffic jam of events with this many agents?
- **B**: Half frequency: events every 2x normal interval. Hypothesis: more players means more organic chaos, so the system should back off.
- **C**: Split-room mode: alternate which half of players see each event. Simulates two parallel experiences sharing one session.

## Session Metrics Comparison

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Overall Fun | 4.6/10 | 5.1/10 | 3.1/10 | **B** |
| Disruption Score | 2.4/10 | 3.0/10 | 1.8/10 | **C** |
| Engagement Rate | 67% | 81% | 50% | **B** |
| Event Density | 1.2/10min | 0.5/10min | 0.6/10min | - |
| Avg Energy End | 10.0/10 | 9.7/10 | 6.1/10 | **A** |
| Peak Fun Minute | min 5 | min 4 | min 3 | - |
| Peak Annoyance Minute | min 56 | min 3 | min 3 | - |

## Evaluation Factors Comparison

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Flash Frequency | 8.1/10 `########..` | 0/10 `..........` | 0/10 `..........` | **A** |
| Flash Duration | 7.5/10 `########..` | 5/10 `#####.....` | 5/10 `#####.....` | **A** |
| Humor Quality | 4.5/10 `#####.....` | 5.3/10 `#####.....` | 2.7/10 `###.......` | **B** |
| Game Disruption (inv) | 9.8/10 `##########` | 10/10 `##########` | 10/10 `##########` | **B** |
| Standing Engagement | 5/10 `#####.....` | 4.4/10 `####......` | 4.5/10 `#####.....` | **A** |
| Timing Correctness | 10/10 `##########` | 10/10 `##########` | 10/10 `##########` | **A** |
| Enhancement vs Destruction | 6.3/10 `######....` | 5.5/10 `######....` | 4.8/10 `#####.....` | **A** |
| Mini-Game Fun | 0/10 `..........` | 6.5/10 `#######...` | 2/10 `##........` | **B** |
| Overall Flow | 6.4/10 `######....` | 5.9/10 `######....` | 5.3/10 `#####.....` | **A** |
| Would Play Again | 7.5/10 `########..` | 7.5/10 `########..` | 8.8/10 `#########.` | **C** |
| Would Recommend | 7.5/10 `########..` | 7.5/10 `########..` | 3.8/10 `####......` | **A** |
| Would Pay for AI | 3.8/10 `####......` | 2.5/10 `###.......` | 1.3/10 `#.........` | **A** |
| OVERALL | 6.1/10 `######....` | 6.3/10 `######....` | 5.1/10 `#####.....` | **B** |

## Virality Comparison

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Screenshot Moments | 3.8/10 | 5/10 | 2.5/10 | **B** |
| Social Media Mention | 3.8/10 | 3.8/10 | 1.3/10 | **A** |
| Next-Day Story | 10/10 | 8.8/10 | 6.3/10 | **A** |
| Group Bonding | 7.5/10 | 7.5/10 | 5/10 | **A** |
| Memeable Moments | 10/10 | 8.8/10 | 8.8/10 | **A** |

## Per-Agent Comparison

### Marcus

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 2.2/10 | 4.0/10 | 3.0/10 | **B** |
| Avg Annoyance | 5.5/10 | 7.0/10 | 3.0/10 | **C** |
| Engagement Rate | 33% | 100% | 67% | **B** |
| Final Energy | 10.0/10 | 9.7/10 | 5.4/10 | **A** |
| Final Score | 10 pts | 0 pts | 15 pts | **C** |
| Would Play Again | No | No | Yes | **C** |
| Would Pay for AI | No | No | No | **A** |

### Jade

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 5.0/10 | 8.5/10 | 5.0/10 | **B** |
| Avg Annoyance | 0.6/10 | 1.0/10 | 0.7/10 | **A** |
| Engagement Rate | 58% | 100% | 67% | **B** |
| Final Energy | 10.0/10 | 9.7/10 | 6.5/10 | **A** |
| Final Score | 0 pts | 15 pts | 10 pts | **B** |
| Would Play Again | Yes | Yes | Yes | **A** |
| Would Pay for AI | Yes | Yes | Yes | **A** |

### Tyler

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 2.6/10 | 3.0/10 | 0.0/10 | **B** |
| Avg Annoyance | 1.7/10 | 1.0/10 | 0.0/10 | **C** |
| Engagement Rate | 50% | 50% | 0% | **A** |
| Final Energy | 10.0/10 | 9.7/10 | 6.5/10 | **A** |
| Final Score | 0 pts | 0 pts | 0 pts | **A** |
| Would Play Again | Yes | Yes | Yes | **A** |
| Would Pay for AI | No | No | No | **A** |

### Pat

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 6.1/10 | 4.5/10 | 3.0/10 | **A** |
| Avg Annoyance | 1.3/10 | 6.0/10 | 3.0/10 | **A** |
| Engagement Rate | 83% | 50% | 33% | **A** |
| Final Energy | 10.0/10 | 9.7/10 | 4.5/10 | **A** |
| Final Score | 75 pts | 0 pts | 10 pts | **A** |
| Would Play Again | Yes | Yes | Yes | **A** |
| Would Pay for AI | Yes | Yes | No | **A** |

### River

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 5.4/10 | 6.5/10 | 4.0/10 | **B** |
| Avg Annoyance | 1.8/10 | 1.5/10 | 1.7/10 | **B** |
| Engagement Rate | 83% | 100% | 67% | **B** |
| Final Energy | 10.0/10 | 9.7/10 | 6.5/10 | **A** |
| Final Score | 10 pts | 0 pts | 0 pts | **A** |
| Would Play Again | Yes | Yes | Yes | **A** |
| Would Pay for AI | No | No | No | **A** |

### Alex

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 5.2/10 | 4.0/10 | 2.7/10 | **A** |
| Avg Annoyance | 0.7/10 | 0.5/10 | 0.3/10 | **C** |
| Engagement Rate | 58% | 50% | 33% | **A** |
| Final Energy | 10.0/10 | 9.7/10 | 6.5/10 | **A** |
| Final Score | 0 pts | 0 pts | 0 pts | **A** |
| Would Play Again | Yes | Yes | Yes | **A** |
| Would Pay for AI | Yes | No | No | **A** |

### Diana

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 4.7/10 | 5.0/10 | 3.3/10 | **B** |
| Avg Annoyance | 5.3/10 | 3.0/10 | 2.0/10 | **C** |
| Engagement Rate | 83% | 100% | 67% | **B** |
| Final Energy | 10.0/10 | 9.7/10 | 6.5/10 | **A** |
| Final Score | 25 pts | 0 pts | 0 pts | **A** |
| Would Play Again | No | No | No | **A** |
| Would Pay for AI | No | No | No | **A** |

### Sam

| Metric | Variation A | Variation B | Variation C | Winner |
|---|---|---|---|---|
| Avg Fun | 4.5/10 | 5.5/10 | 3.7/10 | **B** |
| Avg Annoyance | 2.1/10 | 3.0/10 | 1.7/10 | **C** |
| Engagement Rate | 75% | 100% | 67% | **B** |
| Final Energy | 10.0/10 | 9.7/10 | 6.5/10 | **A** |
| Final Score | 0 pts | 0 pts | 0 pts | **A** |
| Would Play Again | Yes | Yes | Yes | **A** |
| Would Pay for AI | No | No | No | **A** |

## Recommendation

**Variation B is optimal** (Half frequency: events every 2x normal interval. Hypothesis: more players means more organic chaos, so the system should back off.).

Composite scoring (weighted: fun 3x, play-again 2x, flow 2x, low-disruption 1x, engagement 1x):

- **B**: 60.3 composite score <<<< WINNER
- **A**: 58.0 composite score
- **C**: 52.5 composite score (weakest)

---
*Generated at 2026-04-05T16:29:59.321Z by Chaos Agent Simulator -- A/B Comparison Engine*