import type { SiteAdapter } from "./types";
import { redditAdapter } from "./reddit";
import { youtubeAdapter } from "./youtube";

// Ordered adapter array consumed by content script
// Adapters are checked in order — put more specific/common adapters first
export const registry: SiteAdapter[] = [redditAdapter, youtubeAdapter];
