import styles from "./analytics.module.css";

export default function AnalyticsNotFound() {
  return (
    <main className={styles.page}>
      <article className={`${styles.sheet} ${styles.notFoundSheet}`}>
        <span className={styles.stamp}>Not Found</span>
        <p className={styles.notFoundMessage}>
          No record of this short link in the manifest — check the code and try again.
        </p>
      </article>
    </main>
  );
}
