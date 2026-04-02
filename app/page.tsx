import Link from "next/link";

const features = [
  "Create multiple organizations from one account",
  "Admin-managed contributor access",
  "Azure DevOps-inspired board layout",
  "Firebase Auth + Firestore data model",
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">My DevOps</span>
          <h1>Build your own DevOps board with Firebase-powered organizations.</h1>
          <p>
            This starter app gives you multi-organization support, admin-managed
            contributors, and a board UI inspired by the reference design you shared.
          </p>

          <div className="hero-actions">
            <Link href="/register" className="primary-button">
              Create account
            </Link>
            <Link href="/login" className="secondary-button">
              Sign in
            </Link>
          </div>

          <ul className="feature-list">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>

        <div className="preview-shell">
          <div className="preview-sidebar">
            <div className="preview-brand">My DevOps</div>
            <div className="preview-menu-item active">Boards</div>
            <div className="preview-menu-item">Work Items</div>
            <div className="preview-menu-item">Contributors</div>
            <div className="preview-menu-item">Releases</div>
          </div>

          <div className="preview-board">
            <div className="preview-header">
              <div>
                <p className="preview-breadcrumb">Contoso / Travel Team / Boards</p>
                <h2>Launch Board</h2>
              </div>
              <span className="mini-chip">4 contributors</span>
            </div>

            <div className="preview-columns">
              {["New", "Active", "Staging", "Deployed"].map((column) => (
                <div key={column} className="preview-column">
                  <div className="preview-column-title">{column}</div>
                  <div className="preview-card">
                    <strong>{column} task</strong>
                    <p>Assign contributors, push cards, and track work.</p>
                  </div>
                  <div className="preview-card muted">
                    <strong>Board item</strong>
                    <p>Inspired by the Azure DevOps board style.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
