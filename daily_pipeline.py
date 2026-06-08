import os
import json
import datetime
import feedparser
import anthropic
from pathlib import Path

OUTPUT_FILE = "public/data/articles.json"

RSS_FEEDS = {
    "economy": [
        "https://feeds.reuters.com/reuters/businessNews",
        "https://www.ft.com/rss/home/world",
        "https://feeds.bbci.co.uk/news/business/rss.xml",
        "https://www.scmp.com/rss/11/feed",
        "https://www.brookings.edu/topic/economy/feed/",
        "https://foreignaffairs.com/rss.xml",
    ],
    "military": [
        "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
        "https://feeds.reuters.com/Reuters/worldNews",
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
        "https://www.csis.org/rss.xml",
        "https://sipri.org/rss.xml",
        "https://thediplomat.com/feed/",
    ],
    "foreign_relations": [
        "https://feeds.reuters.com/Reuters/worldNews",
        "https://feeds.bbci.co.uk/news/world/rss.xml",
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
        "https://www.scmp.com/rss/2/feed",
        "https://www.brookings.edu/topic/china/feed/",
        "https://www.rfa.org/english/rss2.xml",
        "https://thediplomat.com/feed/",
        "https://foreignaffairs.com/rss.xml",
        "https://www.csis.org/rss.xml",
    ],
}

CHINA_KEYWORDS = [
    "china", "chinese", "beijing", "pla", "prc", "xi jinping",
    "ccp", "yuan", "renminbi", "taiwan", "south china sea",
    "belt and road", "pboc", "bri", "sino", "hong kong",
    "shanghai", "shenzhen", "politburo", "people's republic",
    "people's liberation", "uyghur", "xinjiang", "tibet",
    "macau", "huawei", "tiktok", "bytedance"
]

api_key = os.environ.get("ANTHROPIC_API_KEY", "NOT_FOUND")
print(f"  API key loaded: {api_key[:15]}..." if api_key != "NOT_FOUND" else "  ERROR: API key not found in environment")
ANTHROPIC_CLIENT = anthropic.Anthropic(api_key=api_key)


def is_china_relevant(title, summary):
    text = (title + " " + summary).lower()
    return any(kw in text for kw in CHINA_KEYWORDS)


def is_monday():
    return datetime.date.today().weekday() == 0


def load_existing_data():
    """Load the current articles.json to carry over the deep dive on non-Monday days
    and to check yesterday's headlines for duplicate filtering."""
    try:
        with open(OUTPUT_FILE, "r") as f:
            data = json.load(f)
        yesterday_headlines = set(
            a.get("headline", "").lower().strip()
            for a in data.get("articles", [])
        )
        existing_deep_dive = data.get("deep_dive", None)
        print(f"  Loaded {len(yesterday_headlines)} existing headlines for duplicate filtering.")
        return yesterday_headlines, existing_deep_dive
    except Exception:
        print("  No existing data found — starting fresh.")
        return set(), None


def fetch_articles(max_per_feed=15):
    raw = []
    feedparser.USER_AGENT = "Mozilla/5.0 (compatible; GreatWallDispatchBot/1.0)"
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
                            "summary":  summary[:800],
                            "link":     link,
                            "published": pub,
                        })
            except Exception as e:
                print(f"  [WARN] Failed to fetch {url}: {e}")

    # Remove duplicates by title
    seen = set()
    unique = []
    for a in raw:
        if a["title"] not in seen:
            seen.add(a["title"])
            unique.append(a)

    print(f"  Fetched {len(unique)} unique China-relevant articles.")
    return unique


def ai_rank_articles(articles):
    if len(articles) <= 25:
        return articles

    titles_list = "\n".join([f"{i+1}. {a['title']}" for i, a in enumerate(articles)])

    prompt = f"""You are a senior intelligence analyst. Below is a list of news article headlines about China.
Select the 25 most geopolitically significant articles — prioritizing:
- Military movements, conflicts, or escalations
- Major diplomatic developments or breakdowns
- Significant economic policy shifts or crises
- Taiwan Strait, South China Sea, or nuclear developments
- High-level leadership decisions or power shifts
- Sanctions, trade wars, or technology restrictions

Deprioritize: celebrity news, sports, minor local stories, routine business earnings.
Avoid selecting multiple articles about the exact same story — prefer diversity of topics.

Articles:
{titles_list}

Respond ONLY with valid JSON, no extra text, no markdown:
{{
  "top_indices": [1, 4, 7, 12]
}}

Return exactly 25 index numbers (1-based), ordered from most to least important."""

    try:
        message = ANTHROPIC_CLIENT.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text.strip())
        indices = parsed.get("top_indices", [])
        selected = []
        for idx in indices:
            i = int(idx) - 1
            if 0 <= i < len(articles):
                selected.append(articles[i])
        if len(selected) < 25:
            for a in articles:
                if a not in selected:
                    selected.append(a)
                if len(selected) == 25:
                    break
        print(f"  AI ranked and selected top 25 from {len(articles)} articles.")
        return selected[:25]
    except Exception as e:
        print(f"  [WARN] Ranking failed, falling back to first 25: {e}")
        return articles[:25]


def remove_duplicate_articles(processed, yesterday_headlines):
    """Remove articles whose headlines are too similar to yesterday's."""
    fresh = []
    skipped = 0
    for article in processed:
        headline = article.get("headline", "").lower().strip()
        # Check if any word overlap is too high with yesterday's headlines
        is_duplicate = False
        headline_words = set(headline.split())
        for old in yesterday_headlines:
            old_words = set(old.split())
            if len(headline_words) > 3 and len(old_words) > 3:
                overlap = len(headline_words & old_words) / max(len(headline_words), len(old_words))
                if overlap > 0.6:
                    is_duplicate = True
                    break
        if not is_duplicate:
            fresh.append(article)
        else:
            skipped += 1
    print(f"  Removed {skipped} duplicate articles. {len(fresh)} fresh articles remain.")
    return fresh


def ai_summarize(article):
    prompt = f"""You are an intelligence analyst. Summarize the following news article
about China in 2-3 sentences for a professional intelligence briefing website.
Be factual and neutral. Focus on the most significant implication.

Category hint: {article['category'].replace('_', ' ')}
Source: {article['source']}
Title: {article['title']}
Text: {article['summary']}

Respond ONLY with valid JSON in this exact format, no extra text, no markdown:
{{
  "headline": "A clear factual headline under 12 words",
  "brief": "2-3 sentence neutral summary of key facts and significance",
  "category": "economy",
  "severity": "medium",
  "sources_used": ["{article['source']}"]
}}

For category use only one of: economy, military, foreign_relations
For severity use only one of: high, medium, low"""

    try:
        message = ANTHROPIC_CLIENT.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text.strip())
        parsed["original_link"] = article["link"]
        parsed["published"]     = article["published"]
        parsed["raw_source"]    = article["source"]
        return parsed
    except Exception as e:
        print(f"  [WARN] AI failed for '{article['title'][:50]}': {e}")
        return None


def generate_deep_dive(articles):
    """Generate a full analytical deep dive on the most important article of the week."""
    if not articles:
        return None

    article = articles[0]

    prompt = f"""You are a senior China intelligence analyst writing a weekly deep dive briefing.
Analyze the following article in depth for a professional intelligence audience.

Source: {article['source']}
Title: {article['title']}
Text: {article['summary']}

Respond ONLY with valid JSON, no extra text, no markdown:
{{
  "headline": "Deep dive headline under 12 words",
  "category": "foreign_relations",
  "overview": "2-3 sentence overview of the situation and why it matters this week.",
  "background": "2-3 sentences of essential historical or political context.",
  "key_players": "1-2 sentences identifying the main actors and their interests.",
  "implications": "2-3 sentences analyzing short and long term geopolitical implications.",
  "risk_assessment": "1-2 sentences rating the risk level and what to watch for next.",
  "source": "{article['source']}",
  "week_of": "{datetime.date.today().isoformat()}"
}}

For category use only one of: economy, military, foreign_relations"""

    try:
        message = ANTHROPIC_CLIENT.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text.strip())
        parsed["original_link"] = article.get("link", "")
        print(f"  Generated weekly deep dive: {parsed['headline'][:60]}")
        return parsed
    except Exception as e:
        print(f"  [WARN] Deep dive generation failed: {e}")
        return None


def generate_bilateral_relations():
    prompt = """You are a China foreign policy analyst. For each country listed, assess China's current bilateral relationship status in one sentence. Be factual and current.

Countries: United States, Russia, European Union, Taiwan, Japan, India, Saudi Arabia, Philippines, Brazil, Australia

Respond ONLY with valid JSON, no extra text, no markdown:
{
  "relations": [
    {
      "country": "United States",
      "status": "Tense",
      "summary": "One sentence description of current relationship state."
    }
  ]
}

For status use only one of: Cooperative, Neutral, Tense, Hostile"""

    try:
        message = ANTHROPIC_CLIENT.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text.strip())
        print(f"  Generated relations for {len(parsed['relations'])} countries.")
        return parsed["relations"]
    except Exception as e:
        print(f"  [WARN] Bilateral relations generation failed: {e}")
        return []


def generate_metrics(articles):
    high_count = sum(1 for a in articles if a.get("severity") == "high")
    cats = {}
    for a in articles:
        cat = a.get("category", "other")
        cats[cat] = cats.get(cat, 0) + 1
    return {
        "sources_scanned":  len(set(a["raw_source"] for a in articles)),
        "articles_total":   len(articles),
        "high_priority":    high_count,
        "by_category":      cats,
        "updated_at":       datetime.datetime.utcnow().isoformat() + "Z",
    }


def main():
    today = datetime.date.today().isoformat()
    monday = is_monday()
    print(f"\n=== Great Wall Dispatch Pipeline · {today} ===")
    print(f"  Deep dive update: {'YES (Monday)' if monday else 'NO (carrying over from last week)'}\n")

    # Load existing data for duplicate filtering and deep dive carry-over
    yesterday_headlines, existing_deep_dive = load_existing_data()

    print("Step 1: Fetching RSS feeds...")
    raw_articles = fetch_articles(max_per_feed=15)

    if not raw_articles:
        print("  No articles found. Writing empty output.")
        output = {
            "date":      today,
            "metrics":   generate_metrics([]),
            "articles":  [],
            "deep_dive": existing_deep_dive,
            "relations": [],
        }
        Path(OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_FILE, "w") as f:
            json.dump(output, f, indent=2)
        return

    print(f"\nStep 2: AI ranking top 25 most important articles...")
    top_articles = ai_rank_articles(raw_articles)

    print(f"\nStep 3: AI summarization (up to 25 articles)...")
    processed = []
    for i, article in enumerate(top_articles):
        print(f"  [{i+1}/{len(top_articles)}] {article['title'][:60]}...")
        result = ai_summarize(article)
        if result:
            processed.append(result)

    print(f"\n  Processed {len(processed)} articles successfully.")

    print("\nStep 4: Removing duplicate articles from yesterday...")
    processed = remove_duplicate_articles(processed, yesterday_headlines)

    print("\nStep 5: Building output JSON...")
    metrics = generate_metrics(processed)
    sev_order = {"high": 0, "medium": 1, "low": 2}
    processed.sort(key=lambda x: sev_order.get(x.get("severity", "low"), 2))

    # Only regenerate deep dive on Mondays — carry over existing the rest of the week
    if monday or existing_deep_dive is None:
        print("\nStep 6: Generating weekly deep dive (Monday refresh)...")
        deep_dive = generate_deep_dive(top_articles)
    else:
        print("\nStep 6: Carrying over existing deep dive (not Monday)...")
        deep_dive = existing_deep_dive

    print("\nStep 7: Generating bilateral relations status...")
    relations = generate_bilateral_relations()

    output = {
        "date":      today,
        "metrics":   metrics,
        "articles":  processed,
        "deep_dive": deep_dive,
        "relations": relations,
    }

    Path(OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n✓ Saved {len(processed)} articles to {OUTPUT_FILE}")
    print(f"  {metrics['high_priority']} high-priority · "
          f"{metrics['sources_scanned']} sources · "
          f"{metrics['articles_total']} total\n")


if __name__ == "__main__":
    main()
