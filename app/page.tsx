import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Compass, Route, Database, Shield, ChevronRight, TreePine, Wind, Map } from "lucide-react";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section
          style={{
            minHeight: "calc(100vh - 64px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "80px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background gradient blobs */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse 70% 60% at 30% 20%, rgba(168,218,220,0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 70% 80%, rgba(82,183,136,0.18) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
            <div
              className="badge badge-green animate-fade-in"
              style={{ marginBottom: 20, display: "inline-flex" }}
            >
              <Compass size={13} />
              Discover the Unexplored
            </div>

            <h1
              style={{
                fontSize: "clamp(2.4rem, 6vw, 4rem)",
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                color: "var(--ink)",
                marginBottom: 24,
              }}
              className="animate-fade-up"
            >
              Where Will the Road{" "}
              <span style={{ color: "var(--green)" }}>Take You?</span>
            </h1>

            <p
              style={{
                fontSize: "1.15rem",
                color: "var(--ink-soft)",
                maxWidth: 520,
                margin: "0 auto 40px",
                lineHeight: 1.7,
              }}
              className="animate-fade-up stagger-1"
            >
              Carpe Terra generates hidden, low-footfall routes on roads less
              traveled — so you can explore places maps don&apos;t show you.
            </p>

            <div
              style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
              className="animate-fade-up stagger-2"
            >
              <Link href="/signup" className="btn-primary" style={{ fontSize: "1rem", padding: "14px 28px" }}>
                Start Exploring
                <ChevronRight size={18} />
              </Link>
              <Link href="/login" className="btn-secondary" style={{ fontSize: "1rem", padding: "13px 28px" }}>
                Sign in
              </Link>
            </div>
          </div>

          {/* Floating stat cards */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 80,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
            className="animate-fade-up stagger-3"
          >
            {[
              { icon: Route, label: "Hidden Routes", value: "∞" },
              { icon: TreePine, label: "Terrain Types", value: "12+" },
              { icon: Map, label: "Radius Options", value: "3" },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="card"
                style={{
                  padding: "20px 28px",
                  textAlign: "center",
                  minWidth: 140,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: "var(--green-mist)",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 10px",
                  }}
                >
                  <Icon size={22} color="var(--green)" />
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--ink)" }}>
                  {value}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: 2 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section
          style={{
            background: "var(--white)",
            padding: "100px 24px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <span className="badge badge-sky" style={{ marginBottom: 12, display: "inline-flex" }}>
                How it works
              </span>
              <h2
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                }}
              >
                Three steps to the unknown
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 24,
              }}
            >
              {[
                {
                  step: "01",
                  icon: Wind,
                  title: "Pick your radius",
                  desc: "Choose how far you want to venture — 20, 50, or 100 km from a region's center.",
                },
                {
                  step: "02",
                  icon: Route,
                  title: "We find the path",
                  desc: "Our server queries OpenStreetMap to locate minor roads away from highways with minimal nearby activity.",
                },
                {
                  step: "03",
                  icon: Database,
                  title: "Log your journey",
                  desc: "Save discovered locations with notes and images. Build your personal exploration archive.",
                },
              ].map(({ step, icon: Icon, title, desc }) => (
                <div
                  key={step}
                  className="card card-hover"
                  style={{ padding: "32px 28px" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        background: "var(--green-mist)",
                        borderRadius: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={24} color="var(--green)" />
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "var(--ink-muted)",
                        letterSpacing: "1px",
                      }}
                    >
                      STEP {step}
                    </span>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>{title}</h3>
                  <p style={{ color: "var(--ink-soft)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security badge */}
        <section style={{ padding: "80px 24px", textAlign: "center" }}>
          <div
            className="card"
            style={{
              maxWidth: 560,
              margin: "0 auto",
              padding: "40px 32px",
              border: "1px solid var(--green-mist)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                background: "var(--green-mist)",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Shield size={28} color="var(--green)" />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: 8 }}>
              Privacy-first by design
            </h3>
            <p style={{ color: "var(--ink-soft)", lineHeight: 1.65 }}>
              No API keys in your browser. All map queries run server-side through our
              secure proxy. Your data stays yours.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            borderTop: "1px solid var(--border)",
            padding: "32px 24px",
            textAlign: "center",
            color: "var(--ink-muted)",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <Compass size={16} color="var(--green)" />
            <strong style={{ color: "var(--ink)" }}>Carpe Terra</strong>
          </div>
          Seize the Earth. © {new Date().getFullYear()}
        </footer>
      </main>
    </>
  );
}
