import type { MetadataRoute } from "next";
import { db, sources } from "@repo/database";
import { isNull, eq, and } from "drizzle-orm";

const BASE_URL = "https://isthatslop.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/browse`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/browse/recently-added`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/browse/most-controversial`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/browse/disputed`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/hall-of-fame`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/hall-of-shame`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  let approvedSources: { id: string; slug: string; updatedAt: Date }[] = [];

  try {
    approvedSources = await db
      .select({
        id: sources.id,
        slug: sources.slug,
        updatedAt: sources.updatedAt,
      })
      .from(sources)
      .where(
        and(isNull(sources.deletedAt), eq(sources.approvalStatus, "approved")),
      );
  } catch {
    // If database is unavailable, return static pages only
  }

  const sourcePages: MetadataRoute.Sitemap = approvedSources.map((source) => ({
    url: `${BASE_URL}/sources/${source.id}/${source.slug}`,
    lastModified: source.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...sourcePages];
}
