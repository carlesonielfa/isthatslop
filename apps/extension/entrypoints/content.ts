import { checkAndUpdateIcon } from "../src/lib/dispatch";
import { registry } from "../src/adapters/registry";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main(ctx) {
    const getTier = (url: string) =>
      chrome.runtime.sendMessage({ type: "GET_TIER", url }) as Promise<
        number | null
      >;
    const setIcon = (tier: number | null) =>
      chrome.runtime.sendMessage({ type: "SET_ICON", tier });

    await checkAndUpdateIcon(
      location.href,
      document,
      registry,
      getTier,
      setIcon,
    );

    ctx.addEventListener(window, "wxt:locationchange", async (e: Event) => {
      const newUrl = (e as CustomEvent<{ newUrl: string }>).detail.newUrl;
      await checkAndUpdateIcon(newUrl, document, registry, getTier, setIcon);
    });
  },
});
