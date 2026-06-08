import Head from "next/head";
import React, { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";

const CATEGORY_META = {
  economy:           { label: "Economy",           color: "#185FA5" },
  military:          { label: "Military",           color: "#A32D2D" },
  foreign_relations: { label: "Foreign Relations",  color: "#3B6D11" },
};

const SEV_COLOR = { high: "#A32D2D", medium: "#854F0B", low: "#185FA5" };

export default function Archive() {
  const [dark, setDark] = useState(false);
  const [archive, setArchive] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("gwd-theme");
    if (saved === "dark") {
      setDark(true);
      document.body.classList.add("dark");
    }
    fetch("/data/archive.json")
      .then(r => r.json())
      .then(data => {
        setArchive(data.entries || []);
        if (data.entries && data.entries.length > 0) {
          setSelectedDate(data.entries[0].date);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  const selectedEntry = archive.find(e => e.date === selectedDate);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  };

  return (
    <>
      <Head>
        <title>Archive — Great Wall Dispatch</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>

      <div className={`${styles.root} ${dark ? styles.rootDark : ""}`}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <a href="/" style={{ textDecoration: "none" }}>
              <img
                src={dark ? "/logo-dark.svg" : "/logo.svg"}
                alt="Great Wall Dispatch"
                style={{ height: "90px", width: "auto" }}
              />
            </a>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.themeToggle} onClick={toggleDark}>
              {dark ? "☀ Light" : "☾ Dark"}
            </button>
          </div>
        </header>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid #e0ddd8",
        }}>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: "600", margin: 0 }}>
              Article Archive
            </h1>
            <p style={{
              fontFamily: "'Courier New', monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#888",
              margin: "4px 0 0",
            }}>
              {archive.length} days archived · up to 90 days history
            </p>
          </div>
          <a href="/" style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "0.65rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#A32D2D",
            textDecoration: "none",
          }}>
            ← Back to today
          </a>
        </div>

        {loading && (
          <p style={{ color: "#888", fontFamily: "'Courier New', monospace", fontSize: "0.8rem" }}>
            Loading archive...
          </p>
        )}

        {!loading && archive.length === 0 && (
          <p style={{ color: "#888", fontFamily: "'Courier New', monospace", fontSize: "0.8rem" }}>
            No archived articles yet. The archive builds automatically starting tomorrow.
          </p>
        )}

        {!loading && archive.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "24px", alignItems: "start" }}>

            {/* Date selector */}
            <div style={{
              background: dark ? "#1a1a1a" : "#f5f2ed",
              borderRadius: "10px",
              padding: "1rem",
              position: "sticky",
              top: "1rem",
            }}>
              <div style={{
                fontFamily: "'Courier New', monospace",
                fontSize: "0.6rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#888",
                marginBottom: "10px",
              }}>
                Select Date
              </div>
              {archive.map((entry) => (
                <button
                  key={entry.date}
                  onClick={() => setSelectedDate(entry.date)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: selectedDate === entry.date ? "#A32D2D" : "transparent",
                    color: selectedDate === entry.date ? "#fff" : "inherit",
                    border: "none",
                    borderRadius: "6px",
                    padding: "7px 10px",
                    fontFamily: "'Courier New', monospace",
                    fontSize: "0.65rem",
                    cursor: "pointer",
                    marginBottom: "3px",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ fontWeight: selectedDate === entry.date ? "600" : "400" }}>
                    {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div style={{ opacity: 0.7, fontSize: "0.58rem" }}>
                    {entry.articles.length} articles
                  </div>
                </button>
              ))}
            </div>

            {/* Articles for selected date */}
            <div>
              {selectedEntry && (
                <>
                  <div style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: "0.65rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#888",
                    marginBottom: "1rem",
                  }}>
                    {formatDate(selectedEntry.date)} · {selectedEntry.articles.length} articles
                  </div>
                  {selectedEntry.articles.map((article, i) => (
                    <ArchiveArticleCard key={i} article={article} />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        <footer className={styles.footer} style={{ marginTop: "2rem" }}>
          <span>All summaries AI-generated &amp; cross-referenced. Not a substitute for primary-source analysis.</span>
          <span>Great Wall Dispatch · {new Date().getFullYear()}</span>
        </footer>
      </div>
    </>
  );
}

function ArchiveArticleCard({ article }) {
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
