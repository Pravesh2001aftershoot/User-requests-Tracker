import { BUCKETS, PRIORITIES, type Bucket, type Priority } from "./types"

export const BUCKET_META: Record<Bucket, { label: string; dot: string; bar: string }> = {
  gallery: { label: "Gallery", dot: "bg-bucket-gallery", bar: "bg-bucket-gallery" },
  brandkit: { label: "Brandkit", dot: "bg-bucket-brandkit", bar: "bg-bucket-brandkit" },
  collection: { label: "Collection", dot: "bg-bucket-collection", bar: "bg-bucket-collection" },
  store: { label: "Store", dot: "bg-bucket-store", bar: "bg-bucket-store" },
  marketing: { label: "Marketing", dot: "bg-bucket-marketing", bar: "bg-bucket-marketing" },
}

/**
 * Tailwind classes are spelled out in full so the compiler can see them.
 * `on` fills a selected priority toggle; `tint` washes a grid cell.
 */
export const PRIORITY_META: Record<
  Priority,
  { label: string; short: string; dot: string; on: string; tint: string; text: string }
> = {
  quickwin: {
    label: "Quick Win",
    short: "QW",
    dot: "bg-priority-quickwin",
    on: "data-[state=on]:bg-priority-quickwin data-[state=on]:text-priority-quickwin-foreground data-[state=on]:border-priority-quickwin",
    tint: "bg-priority-quickwin/15 hover:bg-priority-quickwin/25",
    text: "text-priority-quickwin",
  },
  p1: {
    label: "P1",
    short: "P1",
    dot: "bg-priority-p1",
    on: "data-[state=on]:bg-priority-p1 data-[state=on]:text-priority-p1-foreground data-[state=on]:border-priority-p1",
    tint: "bg-priority-p1/15 hover:bg-priority-p1/25",
    text: "text-priority-p1",
  },
  p2: {
    label: "P2",
    short: "P2",
    dot: "bg-priority-p2",
    on: "data-[state=on]:bg-priority-p2 data-[state=on]:text-priority-p2-foreground data-[state=on]:border-priority-p2",
    tint: "bg-priority-p2/15 hover:bg-priority-p2/25",
    text: "text-priority-p2",
  },
  p3: {
    label: "P3",
    short: "P3",
    dot: "bg-priority-p3",
    on: "data-[state=on]:bg-priority-p3 data-[state=on]:text-priority-p3-foreground data-[state=on]:border-priority-p3",
    tint: "bg-priority-p3/15 hover:bg-priority-p3/25",
    text: "text-priority-p3",
  },
  later: {
    label: "Later",
    short: "Later",
    dot: "bg-priority-later",
    on: "data-[state=on]:bg-priority-later data-[state=on]:text-priority-later-foreground data-[state=on]:border-priority-later",
    tint: "bg-priority-later/15 hover:bg-priority-later/25",
    text: "text-priority-later",
  },
}

export const isBucket = (v: unknown): v is Bucket =>
  typeof v === "string" && (BUCKETS as readonly string[]).includes(v)

export const isPriority = (v: unknown): v is Priority =>
  typeof v === "string" && (PRIORITIES as readonly string[]).includes(v)

/** Sheet category → starting bucket. Anything unlisted lands in Gallery. */
const CATEGORY_BUCKET: Record<string, Bucket> = {
  "store, pricing & payments": "store",
  "print labs & products": "store",
  "integrations, crm & website": "marketing",
  "gallery design & branding": "brandkit",
  "organization (sets/folders/collections)": "collection",
  "proofing, favorites & comments": "gallery",
  "downloads & watermarks": "gallery",
  "notifications, emails & analytics": "gallery",
  "privacy, access & security": "gallery",
  "settings & presets": "gallery",
  "slideshow & video": "gallery",
  "localization": "gallery",
  "mobile": "gallery",
}

/**
 * Keyword rules, checked in order; the first match wins. They mirror the
 * manual corrections applied to the seed data, so new requests from the
 * morning digests land in the same place a person would put them.
 */
const KEYWORD_RULES: Array<[Bucket, RegExp]> = [
  // Time-based sales, link previews, promo banners
  ["marketing", /\b(time[- ]based|scheduled) sales?\b|\blink previews?\b|\bpromo(tional)? (banner|nudge)|\bblack friday\b|\bbanner\b.*\b(promo|campaign)/i],
  // Paid download caps, selling unwatermarked files
  ["store", /\b(limit|cap)\w*\b.*\b(free |digital )?downloads?\b.*\b(pay|purchas|buy|bundle)|\b(sell|selling|paid|purchase|pay)\b.*\b(un-?watermark|without watermark|watermark-free)|\b(un-?watermarked|watermark-free)\b.*\b(sale|sell|purchase|pric|pay|discount)/i],
  // Watermarks and delivery-email styling
  ["brandkit", /\bwatermark|\b(delivery|share|sharing|client) emails?\b.*\b(logo|colou?r|font|button|style|brand|cta)|\b(logo|colou?r|font|button|style|brand)\b.*\b(delivery|share|sharing) emails?\b/i],
  // Per-collection branding, collections view
  ["collection", /\bper[- ]collection\b|\bcollections? (view|page|grid)\b|\bbranding\b.*\bcollections?\b/i],
  // Layouts, image viewing, imports, API, Lightroom, webhooks
  ["gallery", /\blayouts?\b|\bimage corners?\b|\bdark mode\b|\benlarge\b|\bhamburger\b|\bnew tab\b|\bimage view|\bphoto[- ]viewing|\bzoom\b|\bimport|\bgoogle drive\b|\bdropbox\b|\bapi\b|\blightroom\b|\blrc\b|\bwebhooks?\b|\btether/i],
]

/** Suggest a bucket for a request that arrived without a valid one. */
export function suggestBucket(text: string, category = ""): Bucket {
  for (const [bucket, re] of KEYWORD_RULES) if (re.test(text)) return bucket
  const fromCategory = CATEGORY_BUCKET[category.trim().toLowerCase()]
  if (fromCategory) return fromCategory
  // Category missing, "Other" or new: fall back to a few broad keyword hints.
  if (/\b(store|checkout|pric|payment|coupon|discount|currency|print lab|invoice)/i.test(text)) return "store"
  if (/\b(crm|website|seo|embed|booking|landing page|contact form)\b/i.test(text)) return "marketing"
  if (/\b(brand ?kit|cover|banner|font|theme|footer)\b/i.test(text)) return "brandkit"
  if (/\b(collection|folder|sub-?folder|album|set)s?\b/i.test(text)) return "collection"
  return "gallery"
}

export const BUCKET_OPTIONS = BUCKETS.map((b) => ({ value: b, ...BUCKET_META[b] }))
export const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({ value: p, ...PRIORITY_META[p] }))
