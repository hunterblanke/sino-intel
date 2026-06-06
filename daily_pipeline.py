"""
Sino Intelligence — Daily AI Pipeline
Runs every morning via GitHub Actions.
Fetches articles from trusted sources, summarizes them with Claude,
and saves structured JSON for the website to display.
"""

import os
import json
import datetime
import feedparser
import anthropic
import requests
from pathlib import Path

# ── Configuration ──────────────────────────────────────────────────────────────

OUTPUT_FILE = "public/data/articles.json"

# Trusted RSS feeds organized by category
RSS_FEEDS = {
    "economy": [
        "https://feeds.reuters.com/reuters/businessNews",
        "https://www.imf.org/en/News/rss?language=eng",
        "https://feeds.ft.com/rss/home/world",
    ],
    "military": [
        "https://news.usni.org/feed",
        "https://www.rand.org/pubs/rss.xml",
        "https://www.csis.org/rss.xml",
    ],
    "foreign_relations": [
        "https://www.brookings.edu/feed/",
        "https://feeds.reuters.com/Reuters/worldNews",
        "https://rss.scmp.com/rss/3",           # South China Morning Post
    ],
}

# Keywords that make an article relevant to China
CHINA_KEYWORDS = [
    "china", "chinese", "beijing", "pla", "prc", "xi jinping",
    "ccp", "yuan", "renminbi", "taiwan strait", "south china sea",
    "belt and road", "pboc", "bri", "sino-"
]

ANTHROPIC_CLIENT = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# ── Helpers ────────────────────────────────────────────────────────────────────

def is_china_relevant(title: str, summary: str) -> bool:
    """Return True if the article is about China."""
    text = (title + " " + summary).lower()
    return any(kw in text for kw in CHINA_KEYWORDS)


def fetch_articles(max_per_feed: int = 10) -> list[dict]:
    """Pull raw articles from all RSS feeds."""
    raw = []
    for category, feeds in RSS_FEEDS.items():
        for url in feeds:
            try:
                parsed = feedparser.parse(url)
                source_name = parsed.feed.get("title", url)
                for entry in parsed.entries[:max_per_feed]:
                    title   = entry.get("title", "")
                    summary = entry.get("summary", entry.get("description", ""))
                    link    = entry.get("link", "")
                    pub     = entry.get("published", "")
                    if is_china_relevant(title, summary):
                        raw.append({
                            "category": category,
                            "source":   source_name,
                            "title":    title,
                            "summary":  summary[:800],   # cap input size
                            "link":     link,
                            "published": pub,
                        })
            except Exception as e:
                print(f"  [WARN] Failed to fetch {url}: {e}")
    print(f"  Fetched {len(raw)} China-relevant articles from RSS feeds.")
    return raw


def ai_summarize(article: dict) -> dict | None:
    """
    Send one article to Claude for summarization and categorization.
    Returns an enriched dict or None on failure.
    """
    prompt = f"""You are an intelligence analyst. Summarize the following news article 
about China in 2-3 sentences for a professional intelligence briefing website.
Be factual and neutral. Focus on the most significant implication.

Category hint: {article['category'].replace('_', ' ')}
Source: {article['source']}
Title: {article['title']}
Text: {article['summary']}

Respond ONLY with valid JSON in this exact format — no extra text:
{{
  "headline": "A clear, factual headline (max 12 words)",
  "brief": "2-3 sentence neutral summary of the key facts and significance",
  "category": "economy | military | foreign_relations | cross_reference",
  "severity": "high | medium | low",
  "sources_used": ["source1", "source2"]
}}"""

    try:
        message = ANTHROPIC_CLIENT.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text.strip()
        # Strip markdown fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text)
        parsed["original_link"] = article["link"]
        parsed["published"]     = article["published"]
        parsed["raw_source"]    = article["source"]
        return parsed
    except Exception as e:
        print(f"  [WARN] AI summarization failed for '{article['title'][:50]}': {e}")
        return None


def generate_metrics(articles: list[dict]) -> dict:
    """
    Derive daily summary metrics from the article batch.
    In production you could pull live economic data from World Bank API here.
    """
    high_count = sum(1 for a in articles if a.get("severity") == "high")
    cats = {}
    for a in articles:
        cats[a.get("category", "other")] = cats.get(a.get("category", "other"), 0) + 1

    return {
        "sources_scanned":  len(set(a["raw_source"] for a in articles)),
        "articles_total":   len(articles),
        "high_priority":    high_count,
        "by_category":      cats,
        "updated_at":       datetime.datetime.utcnow().isoformat() + "Z",
    }


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    today = datetime.date.today().isoformat()
    print(f"\n=== Sino Intelligence Pipeline · {today} ===\n")

    print("Step 1: Fetching RSS feeds...")
    raw_articles = fetch_articles(max_per_feed=8)

    print("\nStep 2: AI summarization (this may take a minute)...")
    processed = []
    for i, article in enumerate(raw_articles[:40]):   # cap at 40/day to manage API cost
        print(f"  [{i+1}/{min(len(raw_articles),40)}] {article['title'][:60]}...")
        result = ai_summarize(article)
        if result:
            processed.append(result)

    print(f"\n  Processed {len(processed)} articles successfully.")

    print("\nStep 3: Building output JSON...")
    metrics = generate_metrics(processed)

    # Sort: high severity first, then by category
    sev_order = {"high": 0, "medium": 1, "low": 2}
    processed.sort(key=lambda x: sev_order.get(x.get("severity", "low"), 2))

    output = {
        "date":     today,
        "metrics":  metrics,
        "articles": processed,
    }

    Path(OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n✓ Saved {len(processed)} articles to {OUTPUT_FILE}")
    print(f"  Metrics: {metrics['high_priority']} high-priority · "
          f"{metrics['sources_scanned']} sources · "
          f"{metrics['articles_total']} total items\n")


if __name__ == "__main__":
    main()
