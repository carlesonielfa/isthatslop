import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { Pool } from "pg";
import { calculateSourceScore } from "@repo/scoring";
import * as schema from "./schema.js";

// Load .env from monorepo root
config({ path: resolve(import.meta.dirname, "../../../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

const scryptAsync = promisify(scrypt);

// Hash password using scrypt (same as better-auth)
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

// Default password for all seed users
const SEED_PASSWORD = "password123";

// =============================================================================
// SEED DATA
// =============================================================================

async function seed() {
  console.log("Seeding database...");

  // Clean existing data (in reverse order of dependencies)
  console.log("Cleaning existing data...");
  await db.delete(schema.moderationLogs);
  await db.delete(schema.flags);
  await db.delete(schema.claimVotes);
  await db.delete(schema.claimEvidence);
  await db.delete(schema.claimComments);
  await db.delete(schema.claims);
  await db.delete(schema.sourceScoreCache);
  await db.delete(schema.sources);
  await db.delete(schema.session);
  await db.delete(schema.account);
  await db.delete(schema.verification);
  await db.delete(schema.user);

  // ---------------------------------------------------------------------------
  // USERS
  // ---------------------------------------------------------------------------
  console.log("Creating users...");

  const users = await db
    .insert(schema.user)
    .values([
      {
        id: "user_admin",
        name: "Admin User",
        email: "admin@isthatslop.com",
        emailVerified: true,
        username: "admin",
        displayUsername: "admin",
        reputation: 1000,
        role: "admin",
      },
      {
        id: "user_mod",
        name: "Moderator Jane",
        email: "mod@isthatslop.com",
        emailVerified: true,
        username: "modjane",
        displayUsername: "modJane",
        reputation: 500,
        role: "moderator",
      },
      {
        id: "user_trusted",
        name: "Trusted Tim",
        email: "tim@example.com",
        emailVerified: true,
        username: "trustedtim",
        displayUsername: "trustedTim",
        reputation: 250,
        role: "member",
      },
      {
        id: "user_alice",
        name: "Alice Johnson",
        email: "alice@example.com",
        emailVerified: true,
        username: "alicej",
        displayUsername: "aliceJ",
        reputation: 75,
        role: "member",
      },
      {
        id: "user_bob",
        name: "Bob Smith",
        email: "bob@example.com",
        emailVerified: true,
        username: "bobs",
        displayUsername: "bobS",
        reputation: 42,
        role: "member",
      },
      {
        id: "user_carol",
        name: "Carol Williams",
        email: "carol@example.com",
        emailVerified: true,
        username: "carolw",
        displayUsername: "carolW",
        reputation: 18,
        role: "member",
      },
    ])
    .returning();

  console.log(`Created ${users.length} users`);

  // ---------------------------------------------------------------------------
  // ACCOUNTS (for email/password login)
  // ---------------------------------------------------------------------------
  console.log("Creating accounts with passwords...");

  const hashedPassword = await hashPassword(SEED_PASSWORD);

  const accounts = await db
    .insert(schema.account)
    .values(
      users.map((user) => ({
        id: `account_${user.id}`,
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      })),
    )
    .returning();

  console.log(
    `Created ${accounts.length} accounts (password: ${SEED_PASSWORD})`,
  );

  // ---------------------------------------------------------------------------
  // SOURCES - Hierarchical Structure
  // ---------------------------------------------------------------------------
  console.log("Creating sources...");

  // Generate UUIDs for sources (we need to know them ahead of time for paths)
  const sourceIds = {
    // Platforms (depth 0)
    reddit: crypto.randomUUID(),
    medium: crypto.randomUUID(),
    youtube: crypto.randomUUID(),

    // Reddit subreddits (depth 1)
    rArt: crypto.randomUUID(),
    rWritingPrompts: crypto.randomUUID(),
    rChatGPT: crypto.randomUUID(),

    // Reddit users (depth 2)
    rArtUser1: crypto.randomUUID(),
    rArtUser2: crypto.randomUUID(),

    // Medium publications (depth 1)
    betterMarketing: crypto.randomUUID(),
    towardsDataScience: crypto.randomUUID(),

    // Medium authors (depth 2)
    mediumAuthor1: crypto.randomUUID(),

    // YouTube channels (depth 1)
    techChannel: crypto.randomUUID(),
    artChannel: crypto.randomUUID(),

    // Standalone websites (depth 0)
    buzzfeed: crypto.randomUUID(),
    cnet: crypto.randomUUID(),

    // Instagram (depth 0)
    instagram: crypto.randomUUID(),

    // Instagram users (depth 1)
    instaPhotographer: crypto.randomUUID(),
    instaInfluencer: crypto.randomUUID(),
    instaAIArtist: crypto.randomUUID(),
  };

  const sourcesData = [
    // ==========================================================================
    // PLATFORMS (depth 0)
    // ==========================================================================
    {
      id: sourceIds.reddit,
      slug: "reddit",
      name: "Reddit",
      type: "platform",
      description:
        "Reddit is a social news aggregation and discussion website. Content is user-generated and moderated by volunteer community members.",
      url: "https://reddit.com",
      parentId: null,
      path: sourceIds.reddit,
      depth: 0,
      createdByUserId: "user_admin",
    },
    {
      id: sourceIds.medium,
      slug: "medium",
      name: "Medium",
      type: "platform",
      description:
        "Medium is an online publishing platform with a mix of amateur and professional writers and publications.",
      url: "https://medium.com",
      parentId: null,
      path: sourceIds.medium,
      depth: 0,
      createdByUserId: "user_admin",
    },
    {
      id: sourceIds.youtube,
      slug: "youtube",
      name: "YouTube",
      type: "platform",
      description:
        "YouTube is a video sharing platform owned by Google. Content ranges from user-generated videos to professional productions.",
      url: "https://youtube.com",
      parentId: null,
      path: sourceIds.youtube,
      depth: 0,
      createdByUserId: "user_admin",
    },
    {
      id: sourceIds.buzzfeed,
      slug: "buzzfeed",
      name: "BuzzFeed",
      type: "website",
      description:
        "BuzzFeed is an American Internet media, news and entertainment company. Known for quizzes, listicles, and viral content.",
      url: "https://buzzfeed.com",
      parentId: null,
      path: sourceIds.buzzfeed,
      depth: 0,
      createdByUserId: "user_mod",
    },
    {
      id: sourceIds.cnet,
      slug: "cnet",
      name: "CNET",
      type: "website",
      description:
        "CNET is an American media website that publishes reviews, news, articles, blogs, podcasts, and videos on technology.",
      url: "https://cnet.com",
      parentId: null,
      path: sourceIds.cnet,
      depth: 0,
      createdByUserId: "user_mod",
    },

    // ==========================================================================
    // REDDIT SUBREDDITS (depth 1)
    // ==========================================================================
    {
      id: sourceIds.rArt,
      slug: "r-art",
      name: "r/Art",
      type: "subreddit",
      description:
        "A community for sharing and discussing visual art of all types and mediums.",
      url: "https://reddit.com/r/Art",
      parentId: sourceIds.reddit,
      path: `${sourceIds.reddit}.${sourceIds.rArt}`,
      depth: 1,
      createdByUserId: "user_trusted",
    },
    {
      id: sourceIds.rWritingPrompts,
      slug: "r-writingprompts",
      name: "r/WritingPrompts",
      type: "subreddit",
      description:
        "A subreddit dedicated to inspiring people to write through creative prompts and story starters.",
      url: "https://reddit.com/r/WritingPrompts",
      parentId: sourceIds.reddit,
      path: `${sourceIds.reddit}.${sourceIds.rWritingPrompts}`,
      depth: 1,
      createdByUserId: "user_trusted",
    },
    {
      id: sourceIds.rChatGPT,
      slug: "r-chatgpt",
      name: "r/ChatGPT",
      type: "subreddit",
      description:
        "Community for discussing ChatGPT, sharing prompts, and AI-generated content.",
      url: "https://reddit.com/r/ChatGPT",
      parentId: sourceIds.reddit,
      path: `${sourceIds.reddit}.${sourceIds.rChatGPT}`,
      depth: 1,
      createdByUserId: "user_alice",
    },

    // ==========================================================================
    // REDDIT USERS (depth 2)
    // ==========================================================================
    {
      id: sourceIds.rArtUser1,
      slug: "u-digitalartist42",
      name: "u/DigitalArtist42",
      type: "reddit-user",
      description:
        "Digital artist sharing original artwork. Uses traditional techniques with digital tools.",
      url: "https://reddit.com/u/DigitalArtist42",
      parentId: sourceIds.rArt,
      path: `${sourceIds.reddit}.${sourceIds.rArt}.${sourceIds.rArtUser1}`,
      depth: 2,
      createdByUserId: "user_bob",
    },
    {
      id: sourceIds.rArtUser2,
      slug: "u-aiartexplorer",
      name: "u/AIArtExplorer",
      type: "reddit-user",
      description:
        "User who primarily posts AI-generated artwork, experimenting with various models.",
      url: "https://reddit.com/u/AIArtExplorer",
      parentId: sourceIds.rArt,
      path: `${sourceIds.reddit}.${sourceIds.rArt}.${sourceIds.rArtUser2}`,
      depth: 2,
      createdByUserId: "user_bob",
    },

    // ==========================================================================
    // MEDIUM PUBLICATIONS (depth 1)
    // ==========================================================================
    {
      id: sourceIds.betterMarketing,
      slug: "better-marketing",
      name: "Better Marketing",
      type: "publication",
      description:
        "Medium publication focused on marketing advice, strategies, and industry insights.",
      url: "https://medium.com/better-marketing",
      parentId: sourceIds.medium,
      path: `${sourceIds.medium}.${sourceIds.betterMarketing}`,
      depth: 1,
      createdByUserId: "user_trusted",
    },
    {
      id: sourceIds.towardsDataScience,
      slug: "towards-data-science",
      name: "Towards Data Science",
      type: "publication",
      description:
        "A Medium publication sharing concepts, ideas, and codes related to data science.",
      url: "https://medium.com/towards-data-science",
      parentId: sourceIds.medium,
      path: `${sourceIds.medium}.${sourceIds.towardsDataScience}`,
      depth: 1,
      createdByUserId: "user_alice",
    },

    // ==========================================================================
    // MEDIUM AUTHORS (depth 2)
    // ==========================================================================
    {
      id: sourceIds.mediumAuthor1,
      slug: "john-writer",
      name: "John Writer",
      type: "author",
      description:
        "Marketing professional writing about content strategy and brand building.",
      url: "https://medium.com/@johnwriter",
      parentId: sourceIds.betterMarketing,
      path: `${sourceIds.medium}.${sourceIds.betterMarketing}.${sourceIds.mediumAuthor1}`,
      depth: 2,
      createdByUserId: "user_carol",
    },

    // ==========================================================================
    // YOUTUBE CHANNELS (depth 1)
    // ==========================================================================
    {
      id: sourceIds.techChannel,
      slug: "tech-explained",
      name: "Tech Explained",
      type: "youtube-channel",
      description:
        "Technology review channel covering gadgets, software, and tech news.",
      url: "https://youtube.com/@techexplained",
      parentId: sourceIds.youtube,
      path: `${sourceIds.youtube}.${sourceIds.techChannel}`,
      depth: 1,
      createdByUserId: "user_bob",
    },
    {
      id: sourceIds.artChannel,
      slug: "digital-art-tutorials",
      name: "Digital Art Tutorials",
      type: "youtube-channel",
      description:
        "Channel dedicated to digital art tutorials and painting techniques.",
      url: "https://youtube.com/@digitalartutorials",
      parentId: sourceIds.youtube,
      path: `${sourceIds.youtube}.${sourceIds.artChannel}`,
      depth: 1,
      createdByUserId: "user_carol",
    },

    // ==========================================================================
    // INSTAGRAM (depth 0)
    // ==========================================================================
    {
      id: sourceIds.instagram,
      slug: "instagram",
      name: "Instagram",
      type: "platform",
      description:
        "Instagram is a photo and video sharing social networking service owned by Meta. Content ranges from personal photos to professional photography and increasingly AI-generated images.",
      url: "https://instagram.com",
      parentId: null,
      path: sourceIds.instagram,
      depth: 0,
      createdByUserId: "user_admin",
    },

    // ==========================================================================
    // INSTAGRAM USERS (depth 1)
    // ==========================================================================
    {
      id: sourceIds.instaPhotographer,
      slug: "naturelens_photo",
      name: "@naturelens_photo",
      type: "instagram-user",
      description:
        "Professional wildlife and nature photographer sharing authentic field photography from around the world.",
      url: "https://instagram.com/naturelens_photo",
      parentId: sourceIds.instagram,
      path: `${sourceIds.instagram}.${sourceIds.instaPhotographer}`,
      depth: 1,
      createdByUserId: "user_trusted",
    },
    {
      id: sourceIds.instaInfluencer,
      slug: "lifestyle_luxe",
      name: "@lifestyle_luxe",
      type: "instagram-user",
      description:
        "Lifestyle influencer posting about travel, fashion, and wellness. Known for heavily filtered and edited content.",
      url: "https://instagram.com/lifestyle_luxe",
      parentId: sourceIds.instagram,
      path: `${sourceIds.instagram}.${sourceIds.instaInfluencer}`,
      depth: 1,
      createdByUserId: "user_alice",
    },
    {
      id: sourceIds.instaAIArtist,
      slug: "dreamscape_ai",
      name: "@dreamscape_ai",
      type: "instagram-user",
      description:
        "Account dedicated to sharing AI-generated surrealist artwork created with Midjourney and Stable Diffusion.",
      url: "https://instagram.com/dreamscape_ai",
      parentId: sourceIds.instagram,
      path: `${sourceIds.instagram}.${sourceIds.instaAIArtist}`,
      depth: 1,
      createdByUserId: "user_bob",
    },
  ];

  const sources = await db
    .insert(schema.sources)
    .values(sourcesData)
    .returning();

  console.log(`Created ${sources.length} sources`);

  // ---------------------------------------------------------------------------
  // CLAIMS
  // ---------------------------------------------------------------------------
  console.log("Creating claims...");

  const mapTierToClaimAttributes = (tier: number) => {
    switch (tier) {
      case 0:
        return { impact: 1, confidence: 2 };
      case 1:
        return { impact: 1, confidence: 3 };
      case 2:
        return { impact: 2, confidence: 3 };
      case 3:
        return { impact: 3, confidence: 3 };
      case 4:
        return { impact: 4, confidence: 4 };
      case 5:
        return { impact: 5, confidence: 4 };
      case 6:
        return { impact: 5, confidence: 5 };
      default:
        return { impact: 3, confidence: 3 };
    }
  };

  const rawClaims = [
    // Reddit platform claims
    {
      sourceId: sourceIds.reddit,
      userId: "user_trusted",
      tier: 3,
      content:
        "Reddit has a mix of content. Many subreddits have strict rules against AI content, but enforcement varies. Some communities openly embrace AI art and writing, while others ban it entirely. The platform as a whole sits somewhere in the middle - co-created content where humans and AI collaborate seems to be the emerging norm in many tech-focused communities.",
    },
    {
      sourceId: sourceIds.reddit,
      userId: "user_alice",
      tier: 4,
      content:
        "I've noticed a significant uptick in AI-generated content across Reddit, especially in art and writing subreddits. Many users are using AI tools to generate ideas and then curating or lightly editing the results. The human guidance is definitely there, but the core content is often AI-generated. Would rate this as AI-generated with human guidance.",
    },
    {
      sourceId: sourceIds.reddit,
      userId: "user_bob",
      tier: 3,
      content:
        "It really depends on the subreddit. Gaming communities tend to be mostly human-created memes and discussions. Art communities are more mixed. Overall I'd say it's pretty balanced co-creation at the platform level.",
    },

    // r/Art claims
    {
      sourceId: sourceIds.rArt,
      userId: "user_alice",
      tier: 2,
      content:
        "r/Art has strong rules against AI-generated content and enforces them actively. Most posts are traditional or digital art created by humans. Some artists may use AI for initial sketches or color palette suggestions, but the final work is human-polished. The moderators are vigilant about removing pure AI slop.",
    },
    {
      sourceId: sourceIds.rArt,
      userId: "user_trusted",
      tier: 1,
      content:
        "This subreddit is one of the bastions of human creativity on Reddit. Moderators actively remove AI art and the community self-polices effectively. Occasionally AI might inspire a human artist's concept, but the execution is purely human. Love seeing genuine artisanship here.",
    },
    {
      sourceId: sourceIds.rArt,
      userId: "user_carol",
      tier: 2,
      content:
        "Mostly human art with occasional AI assistance for things like background elements or initial composition ideas. The community values traditional skills and you can tell the difference between AI slop and genuine art. Good moderation keeps it clean.",
    },

    // r/ChatGPT claims
    {
      sourceId: sourceIds.rChatGPT,
      userId: "user_bob",
      tier: 5,
      content:
        "By the very nature of this subreddit, most content shared here is AI-generated. Users post conversations with ChatGPT, AI-written stories, generated images, etc. There's minimal human editing beyond basic cleanup. This is about as close to pure AI content as you can get while still having human curation.",
    },
    {
      sourceId: sourceIds.rChatGPT,
      userId: "user_carol",
      tier: 6,
      content:
        "Pure AI slop territory. The entire point of this subreddit is to share AI-generated content. Most posts are direct outputs from ChatGPT or other AI tools with no human modification whatsoever. The humans are just there to hit 'generate' and 'post'.",
    },
    {
      sourceId: sourceIds.rChatGPT,
      userId: "user_trusted",
      tier: 5,
      content:
        "Obviously heavy on AI content since that's the whole point. However, there are thoughtful discussions about AI capabilities and limitations that are human-written. The meta-discussions are human, but the subject matter (shared AI outputs) is pure AI. Splitting the difference here.",
    },

    // BuzzFeed claims
    {
      sourceId: sourceIds.buzzfeed,
      userId: "user_alice",
      tier: 4,
      content:
        "BuzzFeed has publicly admitted to using AI for content generation, especially for quizzes and listicles. They claim human editors review everything, but the volume suggests heavy AI involvement. Articles often have that telltale AI structure - comprehensive but generic. Human guidance exists, but AI does the heavy lifting.",
    },
    {
      sourceId: sourceIds.buzzfeed,
      userId: "user_bob",
      tier: 5,
      content:
        "Their AI-generated articles are pretty obvious - formulaic structure, surface-level analysis, and that distinctive ChatGPT voice. Human oversight seems minimal based on the occasional factual errors that slip through. Light editing at best on a lot of their content now.",
    },
    {
      sourceId: sourceIds.buzzfeed,
      userId: "user_trusted",
      tier: 4,
      content:
        "Mixed bag. Their investigative journalism still seems human-written and quality. But the click-bait listicles and quizzes? Definitely AI-generated with human curation. The editorial pieces are human-guided AI at this point. Overall leans toward AI-generated with human guidance.",
    },

    // CNET claims
    {
      sourceId: sourceIds.cnet,
      userId: "user_mod",
      tier: 3,
      content:
        "CNET had a controversy about AI-written articles but has since improved transparency. Product reviews still appear to be largely human-written by experienced tech journalists. Some how-to articles show signs of AI assistance. It's genuine collaboration - humans and AI working together, neither dominating.",
    },
    {
      sourceId: sourceIds.cnet,
      userId: "user_trusted",
      tier: 2,
      content:
        "After the scandal, CNET has been more careful. Their flagship reviews are clearly human-written with expertise and personality. Some supporting content may use AI for research and drafting, but humans polish it significantly. They've found a good balance.",
    },

    // u/DigitalArtist42 claims
    {
      sourceId: sourceIds.rArtUser1,
      userId: "user_alice",
      tier: 0,
      content:
        "This artist posts genuine digital paintings with visible brushwork and personal style. They've shared work-in-progress shots showing the creative process from sketch to final piece. No AI involvement that I can detect - pure artisanal digital art created with traditional digital painting techniques.",
    },
    {
      sourceId: sourceIds.rArtUser1,
      userId: "user_carol",
      tier: 1,
      content:
        "Mostly original work. I noticed they mentioned using AI to generate reference poses in one post, but all the actual artwork is clearly hand-painted. That slight AI inspiration drops it from pure artisanal, but the execution is entirely human. Beautiful work.",
    },

    // u/AIArtExplorer claims
    {
      sourceId: sourceIds.rArtUser2,
      userId: "user_bob",
      tier: 6,
      content:
        "This user exclusively posts Midjourney and DALL-E outputs. No pretense about it being anything else - they openly share their prompts. Zero human artistic input beyond typing prompts. Pure AI slop, though at least they're honest about it.",
    },
    {
      sourceId: sourceIds.rArtUser2,
      userId: "user_trusted",
      tier: 5,
      content:
        "Primarily AI-generated art. To be fair, some posts show they iterate on prompts extensively and do minor post-processing in Photoshop. But the core creative work is all AI. Light editing at best. At least they disclose it, unlike many others.",
    },

    // Medium platform claims
    {
      sourceId: sourceIds.medium,
      userId: "user_trusted",
      tier: 3,
      content:
        "Medium is increasingly flooded with AI-generated content, but also has many genuine writers. Quality publications maintain editorial standards. The Partner Program incentives have unfortunately encouraged AI content farms. It's a true co-creation platform - some articles are pure human, some pure AI, averaging to collaboration.",
    },
    {
      sourceId: sourceIds.medium,
      userId: "user_mod",
      tier: 4,
      content:
        "The decline in content quality on Medium is noticeable. Many articles now have that ChatGPT structure - comprehensive but shallow, hitting all keywords but lacking genuine insight. Human curation exists through the publications, but the core content is often AI-generated. Heading toward AI-generated with human guidance.",
    },

    // Towards Data Science claims
    {
      sourceId: sourceIds.towardsDataScience,
      userId: "user_alice",
      tier: 2,
      content:
        "TDS maintains higher standards than general Medium. Technical articles require genuine expertise to write and review. Some authors may use AI for code examples or explanations, but the analysis and insights are human-driven. Editorial oversight is strong. Human-created with AI polish.",
    },

    // YouTube platform claims
    {
      sourceId: sourceIds.youtube,
      userId: "user_bob",
      tier: 3,
      content:
        "YouTube is incredibly varied. You have everything from traditional human creators to AI-generated voice-over channels with stock footage. Gaming content is mostly human, educational content is mixed, and 'faceless' channels are increasingly AI-driven. Platform-wide, it's genuine co-creation territory.",
    },

    // Tech Explained channel claims
    {
      sourceId: sourceIds.techChannel,
      userId: "user_carol",
      tier: 2,
      content:
        "This channel features a real person doing genuine reviews. You can tell from the hands-on testing and personal opinions. They might use AI for script outlines or research, but the content delivery and insights are clearly human. Polish is AI-assisted, creation is human.",
    },

    // Instagram platform claims
    {
      sourceId: sourceIds.instagram,
      userId: "user_trusted",
      tier: 3,
      content:
        "Instagram is a mixed bag these days. Traditional photographers and artists still post genuine work, but there's been an explosion of AI-generated content, especially in the art and fashion spaces. The platform doesn't require AI disclosure, making it hard to tell what's real. Overall it's genuine co-creation territory.",
    },
    {
      sourceId: sourceIds.instagram,
      userId: "user_alice",
      tier: 4,
      content:
        "I've noticed a huge increase in AI-generated images on Instagram. Many 'photographers' are now posting AI art without disclosure. The influencer space is particularly bad - AI-enhanced photos, AI-written captions, AI-generated lifestyle content. Human curation exists but AI does the heavy lifting now.",
    },
    {
      sourceId: sourceIds.instagram,
      userId: "user_bob",
      tier: 3,
      content:
        "Depends heavily on who you follow. Food bloggers and travel photographers tend to be authentic. Art accounts are increasingly AI. The algorithm seems to favor AI content because it's optimized for engagement. Platform-wide, I'd say it's balanced co-creation.",
    },

    // @naturelens_photo claims
    {
      sourceId: sourceIds.instaPhotographer,
      userId: "user_alice",
      tier: 0,
      content:
        "This is a legitimate wildlife photographer. You can see the EXIF data in their posts, they share behind-the-scenes of their shoots, and the images have that authentic quality you only get from real field photography. Pure artisanal human work.",
    },
    {
      sourceId: sourceIds.instaPhotographer,
      userId: "user_carol",
      tier: 1,
      content:
        "Genuine photography work. They do use Lightroom for post-processing and occasionally AI-powered noise reduction, but the core images are real photographs taken in the field. Minimal AI involvement - just standard photo editing tools.",
    },
    {
      sourceId: sourceIds.instaPhotographer,
      userId: "user_trusted",
      tier: 0,
      content:
        "One of the few authentic accounts left. Real camera work, real locations, real wildlife encounters. They've posted videos of their shoots proving the authenticity. No AI generation here, just skilled photography.",
    },

    // @lifestyle_luxe claims
    {
      sourceId: sourceIds.instaInfluencer,
      userId: "user_bob",
      tier: 4,
      content:
        "Classic influencer account with heavy AI involvement. Captions are clearly ChatGPT-written, photos are heavily processed with AI enhancement tools, and some 'travel' photos look suspiciously like AI composites. Human guidance, but AI-generated content.",
    },
    {
      sourceId: sourceIds.instaInfluencer,
      userId: "user_trusted",
      tier: 3,
      content:
        "Mixed content. The person is real and does travel, but the photos are heavily edited with AI tools. Captions show signs of AI writing but with personal touches. It's collaborative - human experiences processed through AI enhancement.",
    },
    {
      sourceId: sourceIds.instaInfluencer,
      userId: "user_carol",
      tier: 4,
      content:
        "Heavy AI polish on everything. Face tuning, background enhancement, AI-written captions with that characteristic ChatGPT style. The human is there providing direction and appearing in photos, but AI does most of the actual content creation.",
    },

    // @dreamscape_ai claims
    {
      sourceId: sourceIds.instaAIArtist,
      userId: "user_alice",
      tier: 6,
      content:
        "Pure AI slop. They're upfront about it at least - all Midjourney and Stable Diffusion outputs. The human involvement is just typing prompts and selecting which outputs to post. No artistic skill required beyond prompt engineering.",
    },
    {
      sourceId: sourceIds.instaAIArtist,
      userId: "user_bob",
      tier: 6,
      content:
        "Entirely AI-generated artwork. They do share their prompts which is nice for transparency, but there's zero human artistic input. Just AI image generation posted directly to Instagram. Textbook AI slop.",
    },
    {
      sourceId: sourceIds.instaAIArtist,
      userId: "user_mod",
      tier: 5,
      content:
        "Mostly AI-generated, but I'll give some credit - they do iterate on prompts extensively and occasionally do minor touch-ups in Photoshop. Still, the creative work is 95% AI. At least they're honest about the source, unlike many others.",
    },
  ];

  const claimsData = rawClaims.map(({ tier, ...claim }) => ({
    ...claim,
    ...mapTierToClaimAttributes(tier),
  }));

  const claims = await db.insert(schema.claims).values(claimsData).returning({
    id: schema.claims.id,
    userId: schema.claims.userId,
    sourceId: schema.claims.sourceId,
    impact: schema.claims.impact,
    confidence: schema.claims.confidence,
  });

  console.log(`Created ${claims.length} claims`);

  // ---------------------------------------------------------------------------
  // CLAIM VOTES
  // ---------------------------------------------------------------------------
  console.log("Creating claim votes...");

  const votesData: {
    claimId: string;
    userId: string;
    isHelpful: boolean;
  }[] = [];

  // Add some realistic voting patterns
  claims.forEach((claim, index) => {
    // Each claim gets 1-4 votes
    const voterPool = [
      "user_admin",
      "user_mod",
      "user_trusted",
      "user_alice",
      "user_bob",
      "user_carol",
    ].filter((id) => id !== claim.userId);

    const numVotes = Math.min(voterPool.length, ((index % 4) + 1) as number);
    const selectedVoters = voterPool.slice(0, numVotes);

    selectedVoters.forEach((voterId, vIndex) => {
      votesData.push({
        claimId: claim.id,
        userId: voterId,
        isHelpful: vIndex % 3 !== 0, // ~66% helpful votes
      });
    });
  });

  if (votesData.length > 0) {
    await db.insert(schema.claimVotes).values(votesData);
  }

  console.log(`Created ${votesData.length} claim votes`);

  // ---------------------------------------------------------------------------
  // UPDATE HELPFUL VOTE COUNTS
  // ---------------------------------------------------------------------------
  console.log("Updating helpful vote counts...");

  await db.execute(sql`
    UPDATE claims c
    SET
      helpful_votes = (
        SELECT COUNT(*) FROM claim_votes cv
        WHERE cv.claim_id = c.id AND cv.is_helpful = true
      ),
      not_helpful_votes = (
        SELECT COUNT(*) FROM claim_votes cv
        WHERE cv.claim_id = c.id AND cv.is_helpful = false
      )
  `);

  // ---------------------------------------------------------------------------
  // SOURCE SCORE CACHE
  // ---------------------------------------------------------------------------
  console.log("Creating source score cache...");

  const voteCounts = new Map<string, { helpful: number; notHelpful: number }>();
  votesData.forEach((vote) => {
    const current = voteCounts.get(vote.claimId) ?? {
      helpful: 0,
      notHelpful: 0,
    };
    if (vote.isHelpful) current.helpful += 1;
    else current.notHelpful += 1;
    voteCounts.set(vote.claimId, current);
  });

  const scoreCacheData: {
    sourceId: string;
    tier: number;
    rawScore: string;
    normalizedScore: string;
    claimCount: number;
  }[] = [];

  for (const source of sources) {
    const sourceClaims = claims
      .filter((claim) => claim.sourceId === source.id)
      .map((claim) => ({
        impact: claim.impact,
        confidence: claim.confidence,
        helpfulVotes: voteCounts.get(claim.id)?.helpful ?? 0,
      }));

    if (sourceClaims.length === 0) continue;

    const score = calculateSourceScore(sourceClaims);

    scoreCacheData.push({
      sourceId: source.id,
      tier: score.tier,
      rawScore: score.rawScore.toFixed(2),
      normalizedScore: score.normalizedScore.toFixed(2),
      claimCount: score.claimCount,
    });
  }

  if (scoreCacheData.length > 0) {
    await db.insert(schema.sourceScoreCache).values(
      scoreCacheData.map((s) => ({
        ...s,
        lastCalculatedAt: new Date(),
      })),
    );
  }

  console.log(`Created ${scoreCacheData.length} source score cache entries`);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n========================================");
  console.log("Seed completed successfully!");
  console.log("========================================");
  console.log(`Users: ${users.length}`);
  console.log(`Sources: ${sources.length}`);
  console.log(`Claims: ${claims.length}`);
  console.log(`Claim Votes: ${votesData.length}`);
  console.log(`Score Cache Entries: ${scoreCacheData.length}`);
  console.log("========================================\n");

  await pool.end();
  process.exit(0);
}

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await pool.end();
  process.exit(1);
});
