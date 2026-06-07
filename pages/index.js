import Head from "next/head";
import React, { useState, useEffect } from "react";
import articlesData from "../public/data/articles.json";
import styles from "../styles/Home.module.css";

const CATEGORY_META = {
  economy:           { label: "Economy",           color: "#185FA5" },
  military:          { label: "Military",           color: "#A32D2D" },
  foreign_relations: { label: "Foreign Relations",  color: "#3B6D11" },
};

const SEV_COLOR    = { high: "#A32D2D", medium: "#854F0B", low: "#185FA5" };
const STATUS_COLOR = { Cooperative: "#3B6D11", Neutral: "#185FA5", Tense: "#854F0B", Hostile: "#A32D2D" };

export default function Home() {
  const { date, metrics, articles, relations, deep_dive } = articlesData;
  const [active, setActive] = useState("all");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("gwd-theme");
    if (saved === "dark") {
      setDark(true);
      document.body.classList.add("dark");
    }
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("gwd-theme", next ? "dark" : "light");
    if (next) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  };

  const filtered = active === "all"
    ? articles
    : articles.filter((a) => a.category === active);

  const dateLabel = new Date(date).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <>
      <Head>
        <title>Great Wall Dispatch — Daily China Briefing</title>
        <meta name="description" content="AI-curated daily intelligence on China's economy, military, and foreign relations." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={`${styles.root} ${dark ? styles.rootDark : ""}`}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <img
              src={dark ? "/logo-dark.svg" : "/logo.svg"}
              alt="Great Wall Dispatch"
              style={{ height: "90px", width: "auto" }}
            />
          </div>
          <div className={styles.headerRight}>
            <button className={styles.themeToggle} onClick={toggleDark}>
              {dark ? "☀ Light" : "☾ Dark"}
            </button>
            <span className={styles.liveDot} />
            <span className={styles.dateLabel}>{dateLabel}</span>
          </div>
        </header>

        <div className={styles.metricsBar}>
          <MetricCard label="Articles Today"  value={metrics.articles_total} />
          <MetricCard label="High Priority"   value={metrics.high_priority}  accent="#A32D2D" />
          <MetricCard label="Sources Scanned" value={metrics.sources_scanned} />
          <MetricCard label="Last Updated"    value={new Date(metrics.updated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} />
        </div>

        {deep_dive && <DeepDive dive={deep_dive} />}

        <nav className={styles.tabs}>
          {[["all","All"],["economy","Economy"],["military","Military"],["foreign_relations","Diplomacy"]].map(([key, label]) => (
            <button
              key={key}
              className={`${styles.tab} ${active === key ? styles.tabActive : ""}`}
              onClick={() => setActive(key)}
            >{label}</button>
          ))}
        </nav>

        <main className={styles.main}>
          <div className={styles.feed}>
            {filtered.map((article, i) => (
              <ArticleCard key={i} article={article} />
            ))}
            {filtered.length === 0 && (
              <p className={styles.empty}>No articles in this category today.</p>
            )}
          </div>

          <aside className={styles.sidebar}>
            <SidebarSection title="Priority Alerts">
              {(articles || []).filter(a => a.severity === "high").slice(0, 4).map((a, i) => (
                <AlertItem key={i} article={a} />
              ))}
              {(articles || []).filter(a => a.severity === "high").length === 0 && (
                <p className={styles.empty} style={{ fontSize: "0.75rem" }}>No high-priority alerts today.</p>
              )}
            </SidebarSection>

            <SidebarSection title="Bilateral Relations Status">
              {(relations || []).map((rel, i) => (
                <RelationItem key={i} relation={rel} />
              ))}
              {(!relations || relations.length === 0) && (
                <p className={styles.empty} style={{ fontSize: "0.75rem" }}>Updated on next pipeline run.</p>
              )}
            </SidebarSection>

            <SidebarSection title="Sources Consulted">
              <div className={styles.sourceGrid}>
                {[...new Set((articles || []).flatMap(a => a.sources_used))].slice(0, 16).map((s, i) => (
                  <span key={i} className={styles.sourcePill}>{s}</span>
                ))}
              </div>
            </SidebarSection>
          </aside>
        </main>

        <footer className={styles.footer}>
          <span>All summaries AI-generated &amp; cross-referenced. Not a substitute for primary-source analysis.</span>
          <span>Great Wall Dispatch · {new Date().getFullYear()}</span>
        </footer>
      </div>
    </>
  );
}

function DeepDive({ dive }) {
  const meta = CATEGORY_META[dive.category] || CATEGORY_META.foreign_relations;
  return (
    <div style={{
      border: `1.5px solid ${meta.color}`,
      borderRadius: "12px",
      padding: "1.5rem 1.75rem",
      marginBottom: "1.5rem",
      background: "transparent",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "12px",
      }}>
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "0.6rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          background: meta.color,
          color: "#fff",
          padding: "3px 10px",
          borderRadius: "4px",
        }}>
          ★ Daily Deep Dive
        </span>
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "0.6rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: meta.color,
        }}>
          {meta.label}
        </span>
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "0.6rem",
          color: "#888",
          marginLeft: "auto",
        }}>
          {dive.source} · AI ANALYSIS
        </span>
      </div>

      <h2 style={{
        fontSize: "1.2rem",
        fontWeight: "700",
        marginBottom: "1.25rem",
        lineHeight: "1.4",
        color: "inherit",
      }}>
        {dive.headline}
      </h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1rem",
      }}>
        <DeepDiveBlock label="Overview"     text={dive.overview}     color={meta.color} />
        <DeepDiveBlock label="Background"   text={dive.background}   color={meta.color} />
        <DeepDiveBlock label="Key Players"  text={dive.key_players}  color={meta.color} />
        <DeepDiveBlock label="Implications" text={dive.implications} color={meta.color} />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <DeepDiveBlock label="⚠ Risk Assessment" text={dive.risk_assessment} color="#A32D2D" wide />
      </div>
    </div>
  );
}

function DeepDiveBlock({ label, text, color, wide }) {
  return (
    <div style={{
      borderLeft: `3px solid ${color}`,
      paddingLeft: "12px",
      gridColumn: wide ? "span 2" : "span 1",
    }}>
      <div style={{
        fontFamily: "'Courier New', monospace",
        fontSize: "0.58rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: color,
        marginBottom: "5px",
      }}>
        {label}
      </div>
      <p style={{
        fontSize: "0.85rem",
        lineHeight: "1.6",
        color: "inherit",
        margin: 0,
        opacity: 0.85,
      }}>
        {text}
      </p>
    </div>
  );
}

function MetricCard({ label, value, accent }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} style={accent ? { color: accent } : {}}>{value}</div>
    </div>
  );
}

function ArticleCard({ article }) {
  const meta = CATEGORY_META[article.category] || CATEGORY_META.economy;
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
          {(article.sources_used || []).map((s, i) => (
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
        <p className={styles.alertMeta}>{(article.sources_used || []).join(" · ")}</p>
      </div>
    </div>
  );
}

function RelationItem({ relation }) {
  const color = STATUS_COLOR[relation.status] || "#888";
  return (
    <div className={styles.alertItem}>
      <div className={styles.alertBar} style={{ background: color }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className={styles.alertText} style={{ fontWeight: 600 }}>China — {relation.country}</p>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.65rem", color: color, fontWeight: 600 }}>{relation.status}</span>
        </div>
        <p className={styles.alertMeta} style={{ marginTop: 2 }}>{relation.summary}</p>
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
