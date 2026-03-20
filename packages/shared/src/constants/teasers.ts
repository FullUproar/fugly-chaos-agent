// Slow Burn teaser pool — Fugly's voice: paranoid, playful, building anticipation

export interface TeaserTemplate {
  message: string;
  category: 'personal' | 'group' | 'mysterious' | 'threat' | 'countdown';
}

export const TEASER_POOL: TeaserTemplate[] = [
  // Personal
  { message: "We know what you did last game night.", category: 'personal' },
  { message: "Your chaos profile is being compiled...", category: 'personal' },
  { message: "Someone in your group has a secret weakness... we'll exploit it.", category: 'personal' },
  { message: "We've been studying your play style. Interesting choices.", category: 'personal' },
  { message: "Your confidence will be tested. Enjoy it while it lasts.", category: 'personal' },
  { message: "You think you're ready. You're not.", category: 'personal' },
  { message: "We've seen your setup answers. Bold moves.", category: 'personal' },
  { message: "One of you picked 'maximum chaos.' We noticed.", category: 'personal' },
  { message: "Your wildcard answer was... revealing.", category: 'personal' },
  { message: "We remember your last score. Do better.", category: 'personal' },

  // Group
  { message: "Your crew's dynamics have been... analyzed.", category: 'group' },
  { message: "We've been watching your group chat. Thursday will be interesting.", category: 'group' },
  { message: "One of you will betray the others. You know who you are.", category: 'group' },
  { message: "Your group has an obvious weak link. They don't know it yet.", category: 'group' },
  { message: "Someone in your group is already plotting. Smart.", category: 'group' },
  { message: "The alliance that forms first will crumble hardest.", category: 'group' },
  { message: "We polled your group. The results were... unanimous.", category: 'group' },
  { message: "Your friend group has trust issues. We'll make them worse.", category: 'group' },
  { message: "Two of you gave the same wildcard answer. Suspicious.", category: 'group' },
  { message: "The quiet one in your group? They're the threat.", category: 'group' },

  // Mysterious
  { message: "Something is different this time.", category: 'mysterious' },
  { message: "The missions are ready. You are not.", category: 'mysterious' },
  { message: "We added something new. You'll know when you see it.", category: 'mysterious' },
  { message: "Not all missions are created equal. Some are traps.", category: 'mysterious' },
  { message: "There's a mission in the deck that will change everything.", category: 'mysterious' },
  { message: "The algorithm has spoken. It chose chaos.", category: 'mysterious' },
  { message: "Something unexpected is scheduled. That's all we'll say.", category: 'mysterious' },
  { message: "We've hidden a surprise in the mission pool. Good luck.", category: 'mysterious' },

  // Threats (playful)
  { message: "Your reputation is on the line. No pressure.", category: 'threat' },
  { message: "We will expose liars. We always do.", category: 'threat' },
  { message: "The BULLSHIT button exists for a reason. You'll need it.", category: 'threat' },
  { message: "Someone is going to lose badly. Statistically, it might be you.", category: 'threat' },
  { message: "Friendships will be tested. Some won't survive.", category: 'threat' },
  { message: "Last warning: bring your A-game or get humiliated.", category: 'threat' },
  { message: "We've calibrated the difficulty. It's personal.", category: 'threat' },
  { message: "The chaos comfort levels in your group are... incompatible.", category: 'threat' },

  // Countdown
  { message: "The countdown has begun. There's no backing out now.", category: 'countdown' },
  { message: "Chaos doesn't wait. Neither should you.", category: 'countdown' },
  { message: "Final preparations are underway. Brace yourself.", category: 'countdown' },
  { message: "Tomorrow, someone's ego dies. Today, they still have hope.", category: 'countdown' },
  { message: "The calm before the storm. Enjoy it.", category: 'countdown' },
  { message: "Clock's ticking. Your fate is already written.", category: 'countdown' },
];
