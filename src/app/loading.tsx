import styles from "@/components/route-loading/loading.module.scss";

export default function Loading() {
  return (
    <div aria-live="polite" className={styles.overlay} role="status">
      <div className={styles.indicator}>
        <span aria-hidden="true" className={styles.spinner} />
        <span>Cargando sección...</span>
      </div>
    </div>
  );
}
