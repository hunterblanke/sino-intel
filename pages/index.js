import Head from "next/head";
import articlesData from "../public/data/articles.json";
import styles from "../styles/Home.module.css";

const CATEGORY_META = {
  economy:          { label: "Economy",          color: "#185FA5" },
  military:         { label: "Military",          color: "#A32D2D" },
  foreign_relations:{ label: "Foreign Relations", color: "#3B6D11" },
  cross_reference:  { label: "Cross-Reference",   color: "#854F0B" },
};

const SEV_COLOR = { high: "#A32D2D", medium: "#854F0B", low: "#185FA5" };

export default function Home() {
  const { date, metrics, articles } = articlesData;
  const [active, setActive] = React.useState("all");

  const filtered = active === "all"
    ? articles
    : articles.filter((a) => a.category === active);

  const dateLabel = new Date(date).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <>
      <Head>
        <title>Sino Intelligence — Daily China Briefing</title>
        <meta name="description" content="AI-curated daily intelligence on China's economy, military, and foreign relations." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.root}>
        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.logo}>Sino Intelligence</h1>
            <p className={styles.logoSub}>AI-curated · Updated daily · Cross-referenced sources</p>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.liveDot} aria-label="Live" />
            <span className={styles.dateLabel}>{dateLabel}</span>
          </div>
        </header>

        {/* ── Metrics bar ── */}
        <div className={styles.metricsBar}>
          <MetricCard label="Articles Today"    value={metrics.articles_total} />
          <MetricCard label="High Priority"     value={metrics.high_priority}  accent="#A32D2D" />
          <MetricCard label="Sources Scanned"   value={metrics.sources_scanned} />
          <MetricCard label="Last Updated"      value={new Date(metrics.updated_at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})} />
        </div>

        {/* ── Tabs ── */}
        <nav className={styles.tabs} aria-label="Category filter">
          {[["all","All"],["economy","Economy"],["military","Military"],["foreign_relations","Diplomacy"],["cross_reference","Cross-Reference"]].map(([key,label]) => (
            <button
              key={key}
              className={`${styles.tab} ${active === key ? styles.tabActive : ""}`}
              onClick={() => setActive(key)}
            >{label}</button>
          ))}
        </nav>

        {/* ── Main content ── */}
        <main className={styles.main}>
          <div className={styles.feed}>
            {filtered.map((article, i) => (
              <ArticleCard key={i} article={article} />
            ))}
            {filtered.length === 0 && (
              <p className={styles.empty}>No articles in this category today.</p>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className={styles.sidebar}>
            <SidebarSection title="Priority Alerts">
              {articles.filter(a => a.severity === "high").slice(0,4).map((a, i) => (
                <AlertItem key={i} article={a} />
              ))}
            </SidebarSection>

            <SidebarSection title="Sources Consulted">
              <div className={styles.sourceGrid}>
                {[...new Set(articles.flatMap(a => a.sources_used))].slice(0,16).map((s,i) => (
                  <span key={i} className={styles.sourcePill}>{s}</span>
                ))}
              </div>
            </SidebarSection>
          </aside>
        </main>

        <footer className={styles.footer}>
          <span>All summaries AI-generated &amp; cross-referenced across ≥2 sources. Not a substitute for primary-source analysis.</span>
          <span>Sino Intelligence · {new Date().getFullYear()}</span>
        </footer>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, accent }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} style={accent ? {color: accent} : {}}>{value}</div>
    </div>
  );
}

function ArticleCard({ article }) {
  const meta = CATEGORY_META[article.category] || CATEGORY_META.cross_reference;
  return (
    <article className={styles.articleCard}>
      <div className={styles.cardTag} style={{ color: meta.color }}>
        <span className={styles.tagDot} style={{ background: meta.color }} />
        {meta.label}
        <span className={styles.severityBadge} style={{ color: SEV_COLOR[article.severity] }}>
          {article.severity}
        </span>
      </div>
      <h2 className={styles.cardTitle}>{article.headline}</h2>
      <p className={styles.cardBody}>{article.brief}</p>
      <div className={styles.cardFooter}>
        <div className={styles.sourceList}>
          {article.sources_used.map((s, i) => (
            <span key={i} className={styles.sourcePill}>{s}</span>
          ))}
        </div>
        <span className={styles.aiBadge}>AI SUMMARY</span>
      </div>
    </article>
  );
}

function AlertItem({ article }) {
  return (
    <div className={styles.alertItem}>
      <div className={styles.alertBar} style={{ background: SEV_COLOR[article.severity] }} />
      <div>
        <p className={styles.alertText}>{article.headline}</p>
        <p className={styles.alertMeta}>{article.sources_used.join(" · ")}</p>
      </div>
    </div>
  );
}

function SidebarSection({ title, children }) {
  return (
    <div className={styles.sidebarSection}>
      <h3 className={styles.sidebarTitle}>{title}</h3>
      {children}
    </div>
  );
}

// Pull in React (Next.js exposes it globally but explicit import is cleaner)
import React, { useState } from "react";
