/* Blog content — real themes drawn from the project's actual
   engineering, design and research decisions. No filler posts. */

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readingTime: string;
  featured?: boolean;
  accent: string;
  cover: string;
  sections: { heading: string; paragraphs: string[]; list?: string[] }[];
  related: string[];
}

export const categories = [
  "All",
  "Focus",
  "Engineering",
  "Design",
  "Privacy",
  "Research",
];

export const posts: BlogPost[] = [
  {
    slug: "designed-for-watching-not-endless-scrolling",
    title: "Designed for watching. Not endless scrolling.",
    excerpt:
      "YouTube is the greatest learning resource ever assembled — wrapped in the most effective distraction machine ever shipped. Both facts are true at once, and that's exactly why blocking tools exist.",
    category: "Focus",
    date: "September 10, 2026",
    readingTime: "6 min",
    featured: true,
    accent: "var(--ring-deflected)",
    cover: "/product/overlay-site-block.webp",
    related: ["the-psychology-of-watch-intent", "rings-designing-a-habit-system"],
    sections: [
      {
        heading: "The slot machine problem",
        paragraphs: [
          "YouTube's recommendation feed is not evil, and it isn't even badly designed — by its own metric, it's one of the best-designed systems in software history. That metric just isn't your attention span. It's watch time. Every element of the default experience, from the autoplay countdown to the Shorts shelf inserted between you and your subscriptions, is an optimization against a number that grows when you keep watching and shrinks when you stop.",
          "This is what people mean when they call YouTube \"a slot machine.\" Variable rewards — you never know if the next video is the good one — are the same mechanism that makes slot machines profitable. The feed is infinite, the next item is pre-loaded, and the cost of continuing is one unconscious flick of the wrist. None of this requires you to decide anything. That's the design working as intended.",
        ],
      },
      {
        heading: "The tool is still worth using",
        paragraphs: [
          "Here's the part most digital-wellbeing takes skip: the same platform hosts university lectures, repair manuals, documentary archives, language teachers, and the single best explanation of whatever you're stuck on at 11pm. Leaving YouTube entirely is a real strategy, and for some people it's the right one. But it trades a solvable problem for a genuine loss.",
          "The honest framing is this: YouTube the library is extraordinary. YouTube the feed is hostile. The feed is not the price of the library — it's a default setting. Defaults can be changed.",
        ],
      },
      {
        heading: "Remove the machinery, keep the library",
        paragraphs: [
          "FocusTube's approach is subtractive first. Before any blocking, scoring, or ring-drawing happens, the extension simply removes the machinery of compulsion from the interface: Shorts are eradicated, autoplay is terminated, recommendations and the endless homepage can disappear, comments and end-screen cards go dark. What remains is close to the YouTube of 2009 — a page with a video on it.",
          "Subtraction works because it requires no ongoing willpower. A block you configure once at breakfast defends you at midnight, when the version of you that set it up is not around to be tempted. Environment design beats self-control precisely because it doesn't have to be re-decided.",
        ],
      },
      {
        heading: "Then make the remainder deliberate",
        paragraphs: [
          "Removing the machinery is half the design. The other half is what fills the space: intention. Watch Intent asks one question before a video starts — what are you here for, and for how long? The daily briefing reshows you yesterday before today can drift. The Focus Rings turn deflected urges and saved minutes into something you can see closing.",
          "None of these features scold. They inform. A calm interstitial with a countdown is not a punishment; it's a pause long enough for the prefrontal cortex to catch up with the thumb. That pause — a few seconds of friction at exactly the right moment — is where every voluntary decision you'll make today actually lives.",
        ],
      },
      {
        heading: "Calm technology, not technophobia",
        paragraphs: [
          "The goal was never \"spend less time on YouTube.\" It's \"spend YouTube's time on purpose.\" Some days that's two hours of a lecture series; some days it's nothing. Both are wins if they were chosen. FocusTube is built on the bet that people prefer chosen experiences to drifted ones — and that the right response to an attention economy is not guilt, but good design.",
        ],
      },
    ],
  },
  {
    slug: "rings-designing-a-habit-system",
    title: "Focus Rings: designing a habit system for attention",
    excerpt:
      "Apple Fitness solved something subtle: it made invisible effort visible without shaming the invisible days. We spent a year adapting that idea from steps and calories to deflections and saved minutes.",
    category: "Design",
    date: "September 4, 2026",
    readingTime: "8 min",
    accent: "var(--ring-focused)",
    cover: "/product/dashboard-overview.webp",
    related: ["designed-for-watching-not-endless-scrolling", "anti-gaming-focus-score"],
    sections: [
      {
        heading: "Why rings, of all things",
        paragraphs: [
          "Activity rings work because they resolve a paradox: a habit tracker must be visible enough to motivate, but forgiving enough not to punish the days motivation fails. Rings do this with two properties. They're closed, not filled — a partial day looks like a circle waiting to complete, not a bar that failed to reach the top. And they reset daily, which means every morning is a fresh start rather than a continuation of yesterday's debt.",
          "When we designed Focus Rings, the question was what the attention equivalents of \"move\" and \"exercise\" even are. Steps don't translate. Minutes-watched certainly don't — that's YouTube's metric. The answer came from watching what protection actually produces.",
        ],
      },
      {
        heading: "Deflected, Focused, Saved",
        paragraphs: [
          "The triple ring maps to the three things a protection tool makes possible. Deflected counts ads, Shorts and urges skipped — the temptations that never became sessions. Focused counts Pomodoro minutes — time you deliberately spent. Saved counts the minutes blockers returned to you — time that would statistically have been lost.",
          "The elegant property of this triple is that every ring measures a positive act. There is no \"time wasted\" ring, because FocusTube refuses to grade your leisure. The rings only ever celebrate protection and intention — the system stays on your side even when the day goes sideways.",
        ],
      },
      {
        heading: "Goals you set, goals you keep",
        paragraphs: [
          "Research on goal-setting is blunt: self-set goals outperform assigned ones. So ring goals are editable in Settings, and v1.17's Adaptive Goals makes the system a advisor rather than a boss — Monday's briefing compares your 4-week trend against each goal and suggests one calibration step up or down. You apply it or keep yours. The software never moves the target without permission.",
          "That last part matters more than it sounds. Plenty of habit apps quietly raise goals to manufacture engagement — the streak becomes a leash. If a habit system works, its user should be able to point at the goal and say \"I chose that.\"",
        ],
      },
      {
        heading: "Streaks that can be rained on",
        paragraphs: [
          "Classic streaks are fragile and slightly dishonest: miss one day and the counter zeroes, as if three good weeks never happened. FocusTube's Streak Insurance treats streaks like real routines. Close all rings on four or more days in a week and the next week banks a freeze — one missed day, absorbed, marked with a shield. Miss without a freeze and the chain can still be repaired by doubling your Focused goal the next day.",
          "Crucially, the whole ledger is derived from your history rather than stored as a mutable counter. It can't drift, and it can't be forged — which matters once rings become something you might actually be proud of.",
        ],
      },
      {
        heading: "Celebration without confetti spam",
        paragraphs: [
          "Closing all three rings triggers a celebration — sparks, a glow, the little award. It plays exactly once per day, it's earned by 3/3 rather than by opening the app, and it is fully disabled under prefers-reduced-motion. Celebration in a calm tool should feel like a pat on the back, not a casino payout. The restraint is the point: the reward for closing rings is the closed rings, and everything else is just applause.",
        ],
      },
    ],
  },
  {
    slug: "inside-mv3-architecture",
    title: "Engineering against the infinite scroll: inside FocusTube's MV3 architecture",
    excerpt:
      "One service worker, thirty content scripts, a single storage layer, and a platform that redesigns itself every few weeks. What building a Manifest V3 extension that survives YouTube actually takes.",
    category: "Engineering",
    date: "August 26, 2026",
    readingTime: "9 min",
    accent: "var(--ft-blue)",
    cover: "/product/dashboard-analytics.webp",
    related: ["privacy-first-analytics", "sixteen-kilobytes-of-anime"],
    sections: [
      {
        heading: "The battlefield is the DOM",
        paragraphs: [
          "YouTube is a single-page application that mutates its own DOM continuously, serves different markup to different cohorts, and redesigns its selectors without announcement. A content script that hides Shorts today can silently rot next month. This is the central engineering reality of the whole project: the code doesn't just have to work, it has to fail soft and be cheap to repair.",
          "The architecture answer is layers. core/ holds a storage wrapper, logger, DOM helpers and the sanitizer. blocking/ holds one module per threat — site, ads, shorts, keyword, channel, URL, CSS. youtube/ holds the behavioral controllers like autoplay and quality. controllers/ and ui/ wire the pages together. Each module is small, individually reloadable, and registered in manifest.json in dependency order.",
        ],
      },
      {
        heading: "One source of truth",
        paragraphs: [
          "Everything — settings, blocks, ring data, 120 days of history — lives in chrome.storage.local. The popup writes it, the background reads it, content scripts subscribe to it. When you block a site, the popup writes to blockedSites, the background updates declarativeNetRequest rules, and every tab's site blocker hears the change and re-evaluates. No state lives in more than one place, because state that lives in two places lives in neither.",
          "MV3's service worker adds a twist: it sleeps. Aggressively. Timers get clamped — Chrome enforces a 30-second minimum on alarms (a full minute before Chrome 120) — which is how v1.7.0's time-tracking undercount by 30–60× happened. The fix, letting each tick accumulate real elapsed time rather than assuming one second, now rehydrates the active tab whenever the worker wakes.",
        ],
      },
      {
        heading: "Performance is a feature",
        paragraphs: [
          "An extension that watches YouTube's DOM can easily become the distraction. Early versions ran a whole-document MutationObserver, a 10-second maintenance interval, and ad-skip polling at 100ms — enough to show up in YouTube's own profiler. v1.0.1 replaced the observer with YouTube's own yt-navigate-finish event, killed the maintenance timer, and settled ad-skip polling at 250ms. The rule that fell out of that release: never poll what the platform gives you an event for.",
        ],
      },
      {
        heading: "Failing soft",
        paragraphs: [
          "Every DOM write in the codebase is wrapped, every chrome.runtime.lastError is checked, and every message payload is validated before a handler touches it. Storage changes arrive with guards for cleared keys. When the dashboard can't load data, it shows an error state with a Retry button instead of a silently dead page — a pattern learned from v1.8.0, where two writes to elements that didn't exist could crash rendering before tabs ever bound.",
          "None of this is glamorous. It's the difference between an extension that works for a year and one that works for a week.",
        ],
      },
      {
        heading: "The maintenance cost, stated honestly",
        paragraphs: [
          "Selector drift is the project's largest ongoing cost, and the README says so in plain words. That honesty shapes contribution guidelines too: modules stay small, docs live beside code, and every new behavior gets the same try/catch-and-validate treatment as the last one. Fighting an infinite scroll is a marathon, not a hackathon.",
        ],
      },
    ],
  },
  {
    slug: "privacy-first-analytics",
    title: "Privacy-first analytics: what we track when we say “100% local”",
    excerpt:
      "FocusTube measures your attention without a server in sight. Here's exactly where data lives, what syncs, what never leaves, and why the architecture makes lying impossible.",
    category: "Privacy",
    date: "August 18, 2026",
    readingTime: "7 min",
    accent: "var(--ring-saved)",
    cover: "/product/dashboard-month.webp",
    related: ["inside-mv3-architecture", "the-psychology-of-watch-intent"],
    sections: [
      {
        heading: "Local is an architecture, not a promise",
        paragraphs: [
          "“Your data never leaves your device” is easy to say and easy to fake. The only version that means anything is architectural: there is no endpoint to send data to. FocusTube has no backend, no analytics endpoint, no crash reporter, no update ping. The extension's network surface — visible to any inspector in the manifest — is YouTube's public pages and, if you enable summaries, your chosen AI provider. That's the entire list.",
          "Blocking, scoring, ring math, streak ledgers, heatmaps: all computed on-device, from history stored in chrome.storage.local. Unplug the network after install and every feature except AI summaries and folder sync keeps working identically.",
        ],
      },
      {
        heading: "What sync means when there's no cloud",
        paragraphs: [
          "People reasonably assume sync requires a server. FocusTube's cross-browser sync instead uses the File System Access API: you pick a folder — a local directory, a Dropbox mount, a USB drive, anything — and the extension keeps one small JSON file per month in it, union-merging changes across every browser pointed at the same folder. The \"cloud\" is a folder you administer.",
          "The files are deliberately boring: plain, readable JSON keyed by local dates. A monthly file is a portable archive that never grows unbounded, and picking the folder into a fresh install imports everything already there. v1.8.4 extended this to a local-first model — activity records even when no file is connected, marked \"Saved locally,\" merged on reconnection.",
        ],
      },
      {
        heading: "The exclusion list",
        paragraphs: [
          "v1.8.4's privacy note is worth quoting in spirit: API keys, passwords, emails, browser and session state, file handles and runtime timer state are explicitly excluded from the portable file. Sync payloads carry usage statistics and safe preferences — never credentials. The accountability pairing feature goes further: only ring counts leave the device at all, in a checksummed, tamper-evident card you paste to a partner by hand.",
          "There's a design principle underneath the list: data minimization isn't a checkbox, it's a habit. Every new feature must argue its way into the payload, and most lose the argument.",
        ],
      },
      {
        heading: "Permissions, explained one by one",
        paragraphs: [
          "The manifest requests storage, tabs, scripting, activeTab, tabGroups, notifications, declarativeNetRequest, idle and alarms. Each exists for a named feature — the security page lists them with reasons. The one people ask about is host access to all URLs: that's the universal site blocker and the floating companion working on any page you choose to protect. It is not a license to read your banking; the content scripts' actual behavior is in the repo, readable line by line.",
          "That's the final privacy feature, and the strongest one: you don't have to trust the description, because the product ships as inspectable source.",
        ],
      },
    ],
  },
  {
    slug: "sixteen-kilobytes-of-anime",
    title: "16 KB of anime: building Mika & Haru without a single model download",
    excerpt:
      "The companion almost didn't ship. A search for a redistributable open-source 3D anime pair with a full emotion set came back empty — so the duo was hand-authored as parametric SVG instead.",
    category: "Engineering",
    date: "August 12, 2026",
    readingTime: "6 min",
    accent: "var(--iris)",
    cover: "/product/companion-duo.webp",
    related: ["rings-designing-a-habit-system", "inside-mv3-architecture"],
    sections: [
      {
        heading: "The constraint that made the feature",
        paragraphs: [
          "The research for a companion character was thorough and discouraging: the 3D options were either licensed, enormous, or both. Shipping a multi-megabyte model into a 16 KB-budget extension was never serious — and a focus tool that downloads a fuzzy blob on every page install would have failed its own thesis.",
          "The pivot was to hand-authored parametric SVG. Mika and Haru are built from vectors in about 16 KB total, crisp at every DPI, with zero network requests. What started as a constraint compromise turned into the feature's best property: the companions weigh less than a single emoji font glyph.",
        ],
      },
      {
        heading: "Emotion as a parameter, not a sprite sheet",
        paragraphs: [
          "Each character has 8 emotion faces — joyful, happy, neutral, worried, sad, surprised, sleepy, proud — crossed with 4 poses: idle, wave, guide, cheer. Parametric means these aren't 64 hand-drawn permutations; faces and poses are separate parameter sets that compose, so a surprised face can ride a guide pose without a new drawing existing.",
          "The mood engine drives it live: the floating buddy's face reflects the current site's score — happy on deep work, worried on feeds, sad in rabbit holes, joyful when your rings close. The emotion isn't cosmetic; it's legible feedback about where you are and what the protection thinks of it.",
        ],
      },
      {
        heading: "Encapsulation, the strict way",
        paragraphs: [
          "The companion injects into pages FocusTube doesn't own, which makes hygiene non-negotiable. It renders inside a closed ShadowRoot — page CSS can't leak in, the companion's styles can't leak out, and the page's own scripts can't reach its DOM. It drags anywhere, hides per site, and every animation respects prefers-reduced-motion, consistent with the rest of the design system.",
          "One deliberate absence: the companions never appear in the popup or the dashboard sidebar. They greet full screens — dashboard, block page, morning briefing — and float on sites, but the control center stays quiet. Charm has a place; the settings panel isn't it.",
        ],
      },
      {
        heading: "Why a focus tool has characters at all",
        paragraphs: [
          "Fair question, asked internally more than once. The answer came from watching onboarding completion: setup steps with the buddy beside them — pointing at the control, reacting with a wave, cheering the final step — read as guidance, not interrogation. A calm tool can still be a warm one. Mika says \"future you says thanks\" on the block page; the block itself was already doing the work. The companion just makes the work feel less like punishment.",
        ],
      },
    ],
  },
  {
    slug: "the-psychology-of-watch-intent",
    title: "“What are you here for?”: the 1999 psychology trick behind Watch Intent",
    excerpt:
      "Implementation intentions — specifying when, where and why before an action — doubled goal follow-through in Gollwitzer's original studies. FocusTube borrows the mechanism for video.",
    category: "Research",
    date: "August 5, 2026",
    readingTime: "7 min",
    accent: "var(--ring-deflected)",
    cover: "/product/watch-intent.webp",
    related: ["designed-for-watching-not-endless-scrolling", "anti-gaming-focus-score"],
    sections: [
      {
        heading: "The gap between wanting and doing",
        paragraphs: [
          "In 1999, Peter Gollwitzer formalized a deceptively simple finding: people who commit to a specific plan — \"I will do X at time Y in place Z\" — follow through at dramatically higher rates than people with equally strong but vague goals. The effect, named implementation intention, works because a concrete if-then plan delegates the initiation of action from deliberation to the environment. The cue arrives; the plan fires.",
          "Autoplay is an implementation intention designed by someone else. \"When this video ends, the next one begins\" is an if-then plan YouTube wrote for you. Watch Intent exists to put a competing plan in front of it, authored by you, seconds before the contest begins.",
        ],
      },
      {
        heading: "One prompt, twice a decision",
        paragraphs: [
          "On a YouTube watch page, FocusTube asks once: what are you here for — learning something, music, following a tutorial, planned entertainment, or just browsing? And for how many minutes? The question takes four seconds. Its power isn't in the answer but in the asking: the moment of stating a purpose is the moment watching stops being ambient.",
          "\"Just browsing\" is treated with respect rather than scolding. It starts an honest mindful countdown, and when it expires, the prompt returns — the re-ask is the feature. Infinite sessions survive by never being re-decided; Watch Intent schedules the re-decision.",
        ],
      },
      {
        heading: "Measuring honesty: Intent Match",
        paragraphs: [
          "Stated intentions would be worthless if they vanished after the prompt. Every session is checked against its declaration, and the dashboard surfaces the share that ended on-purpose as the Intent Match rate. The number is deliberately gentle — a trend line, not a grade — because the goal is a rising ratio over weeks, not a perfect score today.",
          "There's a second-order effect the research predicted and the product confirmed in internal use: the act of planning a session changes its shape. Sessions with stated minutes end near the stated minutes. The countdown is less a timer than a mirror.",
        ],
      },
      {
        heading: "Where intent goes next",
        paragraphs: [
          "The roadmap's top item is wiring Intent Match into the Focus Score as a quality signal — rings currently count behavior, and intent would grade it, making the score sensitive to the difference between a planned lecture and a drifted binge of the same length. That's the direction of the whole project: fewer dumb meters, more mirrors. The question \"what are you here for?\" is FocusTube in one line; everything else is engineering in service of it.",
        ],
      },
    ],
  },
  {
    slug: "anti-gaming-focus-score",
    title: "Anti-gaming by design: the Focus Score's honest math",
    excerpt:
      "Any metric becomes a target, and any target gets gamed — Goodhart's law is a design constraint. How a focus score survives its users' cleverness with diminishing returns, caps and diversity weighting.",
    category: "Design",
    date: "July 28, 2026",
    readingTime: "7 min",
    accent: "var(--ring-focused)",
    cover: "/product/dashboard-analytics.webp",
    related: ["rings-designing-a-habit-system", "the-psychology-of-watch-intent"],
    sections: [
      {
        heading: "Goodhart's law meets the habit tracker",
        paragraphs: [
          "When a measure becomes a target, it ceases to be a good measure. Habit trackers meet this law faster than most software because the user is also the auditor: the moment a score matters to someone, that person starts discovering its exploits. A naive focus score — points per blocked site — is defeated by its own user in one bored afternoon of toggling blocks.",
          "FocusTube's dashboard needed a number that survives this. Not because users are cheaters, but because a score that can be gamed will be gamed unconsciously — optimized into meaninglessness without a single bad intention. Designing against that is a mathematical problem before it's a moral one.",
        ],
      },
      {
        heading: "Diminishing returns, daily caps, diversity",
        paragraphs: [
          "The Focus Score applies three guards. Diminishing returns: the tenth deflected ad counts less than the first, so repeated identical actions flatten toward zero marginal gain. Daily caps: no category of action can single-handedly max the score, so \"Block 30 minutes\" pressed a hundred times cannot buy a 100. Diversity weighting: a day mixing deflections, focus minutes and saved minutes outscores a day of one trick, which matches the intuitive shape of a genuinely focused day.",
          "Together they encode a philosophy: the score estimates the quality of protected attention, not the volume of interactions with the extension. The best possible day is one where varied protections each did their job — not one where a button was abused.",
        ],
      },
      {
        heading: "Why the rings don't guard themselves",
        paragraphs: [
          "A subtle split: the rings display raw behavior while the score underneath grades it. The rings are honest counters — you did twelve deflections today, and twelve is twelve. Anti-gaming lives only in the score, where comparisons across days and people actually happen. Separating display from grading lets the rings stay satisfying and truthful while the headline number stays resistant to manipulation.",
          "It also localizes failure. If an exploit surfaces — and on a DOM-touching platform, something always surfaces — the fix patches the scoring function, not the event record. The history stays clean; only the interpretation improves.",
        ],
      },
      {
        heading: "The next signal is quality, not quantity",
        paragraphs: [
          "The roadmap's top research item is wiring Watch Intent's match rate into the score as its first quality signal — the difference between sixty planned minutes and sixty drifted ones, finally visible in the headline number. It's the logical end of the anti-gaming arc: the hardest thing to fake has always been knowing why you're here, and a score that captures even a fraction of that is a score worth closing rings for.",
        ],
      },
    ],
  },
];
