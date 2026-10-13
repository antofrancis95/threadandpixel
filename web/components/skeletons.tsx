import { SparkleIcon } from "./icons";

export function ChatSkeleton() {
  return (
    <div className="chat-skeleton-stream">
      {/* Model Welcome Skeleton */}
      <div className="chat-skeleton-row model">
        <div className="chat-skeleton-bubble model">
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
            <span style={{ color: "var(--gold)" }}><SparkleIcon size={12} /></span>
            <div className="skeleton-bar" style={{ width: "110px", height: "10px" }} />
          </div>
          <div className="skeleton-bar" style={{ width: "95%", height: "13px", marginBottom: "6px" }} />
          <div className="skeleton-bar" style={{ width: "80%", height: "13px", marginBottom: "12px" }} />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <div className="skeleton-pill" style={{ width: "140px", height: "26px" }} />
            <div className="skeleton-pill" style={{ width: "130px", height: "26px" }} />
          </div>
        </div>
      </div>

      {/* User Request Skeleton */}
      <div className="chat-skeleton-row user">
        <div className="chat-skeleton-bubble user">
          <div className="skeleton-bar light" style={{ width: "100%", height: "13px", marginBottom: "6px" }} />
          <div className="skeleton-bar light" style={{ width: "70%", height: "13px" }} />
        </div>
      </div>

      {/* Model Response Skeleton */}
      <div className="chat-skeleton-row model">
        <div className="chat-skeleton-bubble model">
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
            <span style={{ color: "var(--gold)" }}><SparkleIcon size={12} /></span>
            <div className="skeleton-bar" style={{ width: "110px", height: "10px" }} />
          </div>
          <div className="skeleton-bar" style={{ width: "98%", height: "13px", marginBottom: "6px" }} />
          <div className="skeleton-bar" style={{ width: "90%", height: "13px", marginBottom: "6px" }} />
          <div className="skeleton-bar" style={{ width: "65%", height: "13px", marginBottom: "12px" }} />
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <div className="skeleton-pill" style={{ width: "150px", height: "28px" }} />
            <div className="skeleton-pill" style={{ width: "140px", height: "28px" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShowcaseSkeleton() {
  return (
    <div className="showcase-skeleton-container">
      {/* High-Resolution Frame Skeleton */}
      <div className="canvas-skeleton-box">
        <div className="skeleton-mannequin-aura">
          <SparkleIcon size={28} />
        </div>
        <div className="skeleton-bar" style={{ width: "160px", height: "14px", marginTop: "1rem" }} />
        <div className="skeleton-bar" style={{ width: "220px", height: "10px", marginTop: "0.4rem", opacity: 0.6 }} />
      </div>

      {/* Spec Ribbon Skeleton */}
      <div className="spec-ribbon-skeleton">
        <div className="skeleton-pill" style={{ width: "70px", height: "26px" }} />
        <div className="skeleton-pill" style={{ width: "85px", height: "26px" }} />
        <div className="skeleton-pill" style={{ width: "65px", height: "26px" }} />
        <div className="skeleton-pill" style={{ width: "110px", height: "26px" }} />
        <div className="skeleton-pill" style={{ width: "90px", height: "26px" }} />
      </div>

      {/* Action Buttons Skeleton */}
      <div className="actions-skeleton-grid">
        <div className="skeleton-card" style={{ height: "42px" }} />
        <div className="skeleton-card" style={{ height: "42px" }} />
        <div className="skeleton-card" style={{ height: "42px" }} />
        <div className="skeleton-card" style={{ height: "42px" }} />
        <div className="skeleton-card" style={{ height: "42px" }} />
      </div>
    </div>
  );
}

export function AssetLoadingSkeleton({ label = "Rendering Couture Asset…" }: { label?: string }) {
  return (
    <div className="asset-loading-skeleton">
      <div className="shimmer-aura">
        <SparkleIcon size={24} style={{ color: "var(--gold)" }} />
      </div>
      <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", margin: "0.5rem 0 0.2rem", color: "var(--ink)" }}>
        {label}
      </h4>
      <span style={{ fontSize: "0.8rem", color: "var(--gold-dark)" }}>
        Fetching high-resolution atelier drape…
      </span>
    </div>
  );
}

