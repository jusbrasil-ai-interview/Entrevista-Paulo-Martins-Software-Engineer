import { notFound } from "next/navigation";
import { getStats } from "@/lib/clicks";
import { getLink } from "@/lib/store";
import styles from "./analytics.module.css";

const DIRECT_UNKNOWN = "Direct / Unknown";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const link = getLink(code);

  if (!link) {
    notFound();
  }

  const stats = getStats(code);
  const maxDayCount = Math.max(1, ...stats.clicksByDay.map((d) => d.count));
  const maxReferrerCount = Math.max(1, ...stats.topReferrers.map((r) => r.count));
  const todayIndex = stats.clicksByDay.length - 1;

  return (
    <main className={styles.page}>
      <article className={styles.sheet}>
        <p className={styles.eyebrow}>Short Link Manifest</p>
        <div className={styles.header}>
          <span className={styles.codeTag}>/{link.shortCode}</span>
          <span className={styles.shortUrl}>
            {new URL(`/${link.shortCode}`, `http://localhost`).pathname}
          </span>
        </div>
        <p className={styles.destination}>
          routes to <a href={link.originalUrl}>{link.originalUrl}</a>
        </p>

        <div className={styles.statRow}>
          <span className={styles.statNumber}>{stats.totalClicks}</span>
          <span className={styles.statLabel}>
            total click{stats.totalClicks === 1 ? "" : "s"}
          </span>
        </div>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Last 30 days</p>
          {stats.totalClicks === 0 ? (
            <p className={styles.empty}>No visits recorded yet.</p>
          ) : (
            <>
              <div className={styles.strip}>
                {stats.clicksByDay.map((day, i) => (
                  <div key={day.date} className={styles.barTrack} title={`${day.date}: ${day.count}`}>
                    <div
                      className={`${styles.bar} ${i === todayIndex ? styles.barToday : ""}`}
                      style={{ height: `${Math.max(2, (day.count / maxDayCount) * 84)}px` }}
                    />
                  </div>
                ))}
              </div>
              <div className={styles.stripLabels}>
                <span>{stats.clicksByDay[0].date}</span>
                <span>{stats.clicksByDay[todayIndex].date}</span>
              </div>
            </>
          )}
        </section>

        <section className={styles.section}>
          <p className={styles.sectionTitle}>Top referrers</p>
          {stats.topReferrers.length === 0 ? (
            <p className={styles.empty}>No referrers recorded yet.</p>
          ) : (
            <table className={styles.table}>
              <tbody>
                {stats.topReferrers.map((r) => (
                  <tr key={r.referrer}>
                    <td className={styles.referrerCell}>
                      <span className={r.referrer === DIRECT_UNKNOWN ? styles.referrerUnknown : undefined}>
                        {r.referrer}
                      </span>
                    </td>
                    <td className={styles.countCell}>
                      <div className={styles.miniBarTrack}>
                        <div
                          className={styles.miniBar}
                          style={{ width: `${(r.count / maxReferrerCount) * 80}px` }}
                        />
                        <span>{r.count}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </article>
    </main>
  );
}
