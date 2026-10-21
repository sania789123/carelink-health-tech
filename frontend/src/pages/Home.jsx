import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import './home-hero.css'; // new styles for this page (put home-hero.css in the same folder as Home.jsx)

export default function Home() {
  const { t, speak } = useLanguage();

  const features = [
    {
      icon: '💊',
      title: 'Medicines',
      text: 'Track every medicine with reminders that work.'
    },
    {
      icon: '📄',
      title: 'Reports',
      text: 'Upload prescriptions and lab reports — even handwritten ones.'
    },
    {
      icon: '📊',
      title: 'Old vs New',
      text: 'See how your values changed between two reports.'
    },
    {
      icon: '🔗',
      title: 'Share with Doctor',
      text: 'One QR code, secure, time-limited, revocable.'
    },
    {
      icon: '👨‍👩‍👧',
      title: 'Family Caregivers',
      text: 'Invite loved ones to help manage care safely.'
    },
    {
      icon: '🩺',
      title: 'Suggested Specialists',
      text: 'Get gentle hints on which doctor to see next.'
    }
  ];

  const steps = [
    { n: '1', icon: '📤', title: 'Upload', text: 'Reports and prescriptions in PDF, JPG, or PNG.' },
    { n: '2', icon: '🔍', title: 'Understand', text: 'Review extracted values and correct them.' },
    { n: '3', icon: '🔗', title: 'Share', text: 'With your doctor via a secure QR code.' },
    { n: '4', icon: '💪', title: 'Follow Care Plan', text: 'Daily tasks and check-ins approved by your doctor.' }
  ];

  const highlights = [
    { icon: '📤', title: 'PDF, JPG, PNG', text: 'Upload any report' },
    { icon: '🔒', title: 'Secure QR sharing', text: 'Time-limited and revocable' },
    { icon: '👨‍👩‍👧', title: 'Family access', text: 'Caregivers stay in the loop' },
    { icon: '🔊', title: 'Easy to use', text: 'Voice help and large text mode' }
  ];

  return (
    <div className="home-page">
      {/* ================= NAV ================= */}
      <header className="home-nav">
        <div className="home-brand">
          <span style={{ fontSize: '1.6em' }}>❤️</span>
          <div>
            <div style={{ fontWeight: 800 }}>CareLink</div>
            <div style={{ fontSize: '0.75em', color: '#5b6478' }}>Health Tech</div>
          </div>
        </div>
        <div className="home-nav-actions">
          <Link to="/login" className="btn-outline">Log In</Link>
          <Link to="/register" className="btn-primary">Get Started</Link>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="hero-wrap">
        <div className="hero">
          <div className="hero-text">
            <div className="hero-tag">🩺 Trusted healthcare, simply delivered</div>
            <h1 className="hero-title">
              Better Care,<br />
              <span className="hero-accent">Together.</span>
            </h1>
            <p className="hero-sub">
              Keep medical reports organized, follow doctor-approved care plans, and help your loved ones manage their health with confidence.
            </p>
            <div className="hero-buttons">
              <Link to="/register" className="btn-primary btn-lg">Get Started</Link>
              <a href="#how" className="btn-outline btn-lg">Explore How It Works</a>
            </div>
            <div className="hero-trust">
              <span>✅ No ads</span>
              <span>✅ Your data stays yours</span>
              <span>✅ Works on any phone</span>
            </div>
            <button
              className="btn-outline"
              onClick={() => speak('CareLink helps you keep medical reports organized, follow doctor approved care plans, and help loved ones manage their health with confidence.')}
              style={{ marginTop: 16 }}
            >
              🔊 Listen to this
            </button>
          </div>

          <div className="hero-visual">
            <div className="hero-card">
              <div className="hero-card-row">
                <div className="hero-icon">🩺</div>
                <div>
                  <div style={{ fontWeight: 700 }}>Dr. Anita Sharma</div>
                  <div style={{ fontSize: '0.85em', color: '#5b6478' }}>Internal Medicine</div>
                </div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #eef2f7' }} />
              <div style={{ fontSize: '0.9em', color: '#5b6478' }}>Today's plan</div>
              <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                <li>✅ Take Metformin 500 mg (8 AM)</li>
                <li>🩸 Blood sugar check</li>
                <li>💧 Drink 8 glasses of water</li>
                <li>🚶 20-minute walk</li>
              </ul>
              <div style={{
                marginTop: 12,
                padding: 10,
                background: '#eef4ff',
                borderRadius: 8,
                fontSize: '0.85em'
              }}>
                <strong>💊 Reminder in 2 hours</strong>
                <div style={{ color: '#5b6478' }}>Atorvastatin 10 mg</div>
              </div>
            </div>

            <div className="hero-card-float">
              <div>
                <div style={{ fontSize: '0.85em', color: '#5b6478' }}>Reports compared</div>
                <div style={{ fontWeight: 700 }}>Hemoglobin</div>
                <div style={{ color: '#198754', fontWeight: 700 }}>↑ 1.3 g/dL</div>
              </div>
            </div>

            <div className="hero-chip">🔗 Shared securely with your doctor</div>
          </div>
        </div>
      </section>

      {/* ================= HIGHLIGHTS STRIP ================= */}
      <div className="stats-strip">
        {highlights.map((h, i) => (
          <div key={i} className="stat-item">
            <div className="stat-icon" aria-hidden="true">{h.icon}</div>
            <div>
              <div className="stat-title">{h.title}</div>
              <div className="stat-desc">{h.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ================= FEATURES ================= */}
      <section className="section">
        <h2 className="section-title">Everything in one place</h2>
        <p className="section-sub">Simple tools for you and your family</p>
        <div className="feature-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon" aria-hidden="true">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-text">{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="section" id="how" style={{ background: '#f8fafd' }}>
        <h2 className="section-title">How it works</h2>
        <p className="section-sub">Four simple steps</p>
        <div className="steps-grid">
          {steps.map((s, i) => (
            <div key={i} className="step-card">
              <div className="step-num">{s.n}</div>
              <div className="step-icon" aria-hidden="true">{s.icon}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-text">{s.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="section cta-section">
        <h2 className="cta-title">Ready to take control of your health?</h2>
        <p className="cta-sub">Start with the free demo. No credit card. No installation.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          <Link to="/register" className="btn-primary btn-lg">Get Started Free</Link>
          <Link to="/login" className="btn-outline btn-lg">Try Demo Accounts</Link>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="home-footer">
        <div>© CareLink Health Tech — Connected Care, Beyond the Consultation</div>
        <div style={{ marginTop: 6, fontSize: '0.85em', color: '#5b6478' }}>
          Not a substitute for professional medical advice.
        </div>
      </footer>
    </div>
  );
}
