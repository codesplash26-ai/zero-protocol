import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Play,
  ArrowRight,
  ArrowDown,
  Clock,
  EyeOff,
  TrendingUp,
  RefreshCw,
  Cpu,
  GitBranch,
  ShieldCheck,
  FileCheck,
  Zap,
  History,
  Sparkles,
  Target,
  Search,
  Scale,
} from 'lucide-react';
import { storeGuideOpen } from '../lib/demoGuide';

const container: React.CSSProperties = { maxWidth: '1120px', margin: '0 auto', padding: '0 1.5rem' };
const sectionTitle: React.CSSProperties = {
  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
  fontWeight: 700,
  color: 'var(--color-text-main)',
  letterSpacing: '-0.02em',
  margin: 0,
};
const eyebrow: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--color-governor-teal)',
  marginBottom: '0.5rem',
};
const card: React.CSSProperties = {
  backgroundColor: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.25rem',
  boxShadow: 'var(--shadow-sm)',
};

const PROBLEMS = [
  {
    icon: <Clock size={20} />,
    title: 'Resource waste',
    text: 'An attractive experiment quietly consumes engineering hours promised to a critical customer.',
  },
  {
    icon: <EyeOff size={20} />,
    title: 'Hidden opportunity cost',
    text: 'A plan looks affordable in isolation while delaying higher-value work or exhausting scarce traffic.',
  },
  {
    icon: <TrendingUp size={20} />,
    title: 'Premature scaling',
    text: 'A costly build gets approved before a cheaper experiment resolves its key assumption.',
  },
  {
    icon: <RefreshCw size={20} />,
    title: 'Stale plans',
    text: 'A good recommendation becomes wrong after an outcome, a capacity change or an external event.',
  },
];

const CHAIN = [
  'Resource consumption',
  'Opportunity cost',
  'Information gained',
  'Future decision',
  'Conditional sequence',
  'Event-driven replanning',
];

const FEATURES = [
  {
    icon: <Cpu size={20} />,
    title: 'Constraint-aware recommendations',
    text: 'Google OR-Tools CP-SAT enforces budget, engineering hours, traffic and protected commitments.',
  },
  {
    icon: <GitBranch size={20} />,
    title: 'Information-aware sequencing',
    text: 'A cheap test goes first when its result decides whether a bigger investment is worth it.',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Founder approval gate',
    text: 'Anything above the spending threshold waits for an explicit founder decision.',
  },
  {
    icon: <FileCheck size={20} />,
    title: 'Controlled actions with receipts',
    text: 'Approved work reserves resources as a reversible state change and records a receipt.',
  },
  {
    icon: <Zap size={20} />,
    title: 'Event-driven replanning',
    text: 'Outcomes and capacity changes are checked for materiality; the plan changes only when it matters.',
  },
  {
    icon: <History size={20} />,
    title: 'Full audit trail',
    text: 'Every recommendation, approval, action and event is versioned and traceable.',
  },
];

const STAGES = [
  { icon: <Target size={18} />, title: 'Understand', text: 'Interpret the goal, read current state and constraints.', color: 'var(--color-accent-blue)' },
  { icon: <Search size={18} />, title: 'Build evidence', text: 'Plan what must be known and gather evidence with provenance.', color: '#7C3AED' },
  { icon: <Scale size={18} />, title: 'Decide', text: 'Generate strategies, check feasibility and consequences, run CP-SAT.', color: 'var(--color-governor-teal)' },
  { icon: <ShieldCheck size={18} />, title: 'Govern', text: 'Recommend a sequence and apply the approval policy.', color: 'var(--color-success)' },
  { icon: <RefreshCw size={18} />, title: 'Act & learn', text: 'Execute controlled actions, observe events, replan when material.', color: 'var(--color-warning)' },
];

const EXPERIMENTS = [
  { id: 'A', name: 'Pricing willingness test', cost: '$600', hours: '6h', role: 'Is a 15% price uplift credible?' },
  { id: 'B', name: 'Annual-plan checkout', cost: '$2,500', hours: '24h', role: 'Worth building only if A succeeds' },
  { id: 'C', name: 'Referral prototype', cost: '$1,800', hours: '16h', role: 'Independent growth path' },
];

const STORY = [
  'The Governor recommends the cheap pricing test A first — it decides whether B is worth funding.',
  'A succeeds, then an SSO vendor delay frees 18 engineering hours.',
  'The change is material, so the Governor replans: B is now feasible.',
  'B costs $2,500, above the $2,000 threshold — the founder approves, and every step is audited.',
];

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  const startDemo = () => {
    storeGuideOpen(true);
    navigate('/overview');
  };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}>
      {/* HERO */}
      <header
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #13233F 55%, #0F3B3A 100%)',
          color: '#F8FAFC',
          paddingBottom: '4rem',
        }}
      >
        <div style={{ ...container, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 118, 110, 0.3)',
                border: '1px solid rgba(45, 212, 191, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-governor-teal-accent)',
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Experiment Governor</div>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-governor-teal-accent)' }}>
                ZERO PROTOCOL
              </div>
            </div>
          </div>
          <button type="button" onClick={startDemo} className="eg-landing-link">
            Open the app <ArrowRight size={14} />
          </button>
        </div>

        <div
          style={{
            ...container,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2.5rem',
            alignItems: 'center',
            paddingTop: '2.5rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(45, 212, 191, 0.12)',
                border: '1px solid rgba(45, 212, 191, 0.3)',
                color: 'var(--color-governor-teal-accent)',
                fontSize: '0.75rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
              }}
            >
              <Sparkles size={13} /> CodeSplash'26 · Theme 2: AI Startup Co-Founder
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.1rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', margin: 0 }}>
              Decide which experiment to run next —{' '}
              <span style={{ color: 'var(--color-governor-teal-accent)' }}>without breaking your commitments.</span>
            </h1>
            <p style={{ fontSize: '1.0625rem', lineHeight: 1.6, color: '#CBD5E1', margin: '1.25rem 0 2rem', maxWidth: '560px' }}>
              An agentic AI co-founder that weighs budget, engineering capacity, customer traffic and the information an
              experiment can give — then asks for your approval on the big bets and replans when things change.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={startDemo} className="eg-landing-primary">
                <Play size={16} /> Try the live demo
              </button>
              <button type="button" onClick={() => scrollTo('how-it-works')} className="eg-landing-secondary">
                How it works <ArrowDown size={16} />
              </button>
            </div>
          </div>

          {/* Decision preview */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '1rem' }}>
              A GOVERNOR RECOMMENDATION
            </div>
            {[
              { tag: 'NOW', title: 'Run A — pricing test', meta: '$600 · 6h · no approval needed', color: 'var(--color-governor-teal-accent)' },
              { tag: 'IF A SUCCEEDS', title: 'Then B — annual-plan checkout', meta: '$2,500 · founder approval required', color: '#FBBF24' },
              { tag: 'DEFER', title: 'C — referral prototype', meta: 'Lower information value right now', color: '#94A3B8' },
            ].map((row, index) => (
              <React.Fragment key={row.tag}>
                {index > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', color: '#64748B', margin: '0.25rem 0' }}>
                    <ArrowDown size={16} />
                  </div>
                )}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(15, 23, 42, 0.55)',
                    borderLeft: `4px solid ${row.color}`,
                  }}
                >
                  <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', color: row.color }}>{row.tag}</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, marginTop: '0.125rem' }}>{row.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.125rem' }}>{row.meta}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      {/* PROBLEM */}
      <section style={{ ...container, padding: '4rem 1.5rem 1rem' }}>
        <div style={eyebrow}>The problem</div>
        <h2 style={sectionTitle}>More possible experiments than runway, people and traffic</h2>
        <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: '720px', margin: '0.75rem 0 2rem' }}>
          Selecting one experiment changes what the others can do. A static priority score hides those interactions.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {PROBLEMS.map((item) => (
            <div key={item.title} style={card}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                {item.icon}
              </div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{item.title}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DIFFERENTIATION */}
      <section style={{ ...container, padding: '3.5rem 1.5rem 1rem' }}>
        <div style={eyebrow}>What makes it different</div>
        <h2 style={sectionTitle}>Experiments are information-producing actions</h2>
        <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: '720px', margin: '0.75rem 0 1.75rem' }}>
          The Governor does not just rank ideas. It follows what each experiment consumes and what it lets you decide next.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {CHAIN.map((step, index) => (
            <React.Fragment key={step}>
              {index > 0 && <ArrowRight size={16} style={{ color: 'var(--color-text-muted)' }} />}
              <span
                style={{
                  padding: '0.5rem 0.875rem',
                  borderRadius: '999px',
                  backgroundColor: index === CHAIN.length - 1 ? 'var(--color-governor-teal)' : 'var(--color-governor-teal-light)',
                  color: index === CHAIN.length - 1 ? '#FFFFFF' : 'var(--color-governor-teal)',
                  border: '1px solid #99F6E4',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                {step}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div
          style={{
            ...card,
            borderLeft: '5px solid var(--color-accent-blue)',
            backgroundColor: 'var(--color-accent-blue-light)',
            display: 'flex',
            gap: '0.875rem',
            alignItems: 'flex-start',
          }}
        >
          <Cpu size={22} style={{ color: 'var(--color-accent-blue)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>
            <strong>Not an LLM wrapper.</strong> The AI interprets goals and explains trade-offs. Deterministic engines and
            Google OR-Tools CP-SAT decide feasibility, numbers and hard constraints — and big spending always waits for the
            founder.
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ ...container, padding: '3.5rem 1.5rem 1rem' }}>
        <div style={eyebrow}>Features</div>
        <h2 style={{ ...sectionTitle, marginBottom: '1.75rem' }}>Everything a founder needs to decide, act and adapt</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {FEATURES.map((item) => (
            <div key={item.title} style={card}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-governor-teal-light)',
                  color: 'var(--color-governor-teal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                {item.icon}
              </div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{item.title}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item.text}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            ...card,
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
            background: 'linear-gradient(90deg, var(--color-governor-teal-light), #FFFFFF)',
          }}
        >
          <Sparkles size={22} style={{ color: 'var(--color-governor-teal)', flexShrink: 0 }} />
          <div style={{ fontSize: '0.9375rem', lineHeight: 1.5 }}>
            <strong>Always runs.</strong> Groq first, Gemini as fallback, then a rule-based engine that uses only verified
            facts — so the full demo works even without API keys.
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ ...container, padding: '3.5rem 1.5rem 1rem', scrollMarginTop: '1rem' }}>
        <div style={eyebrow}>How it works</div>
        <h2 style={{ ...sectionTitle, marginBottom: '1.75rem' }}>From founder intent to controlled learning</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
          {STAGES.map((stage, index) => (
            <div key={stage.title} style={{ ...card, borderTop: `4px solid ${stage.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: stage.color, marginBottom: '0.5rem' }}>
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: stage.color,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </span>
                {stage.icon}
              </div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{stage.title}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{stage.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO SCENARIO */}
      <section style={{ ...container, padding: '3.5rem 1.5rem 4rem' }}>
        <div style={{ ...card, padding: '2rem', border: '1px solid #99F6E4' }}>
          <div style={eyebrow}>The demo scenario</div>
          <h2 style={{ ...sectionTitle, marginBottom: '0.5rem' }}>PulseBoard: a four-week growth decision</h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
            $4,000 budget · 60 engineering hours (36h protected for Enterprise SSO, so 24h available) · 10,000 sessions ·
            founder approval above $2,000.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--color-text-secondary)', fontSize: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>Experiment</th>
                  <th style={{ padding: '0.5rem' }}>Cost</th>
                  <th style={{ padding: '0.5rem' }}>Hours</th>
                  <th style={{ padding: '0.5rem 0 0.5rem 0.5rem' }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {EXPERIMENTS.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.625rem 0.5rem 0.625rem 0', fontWeight: 600 }}>
                      {item.id} — {item.name}
                    </td>
                    <td style={{ padding: '0.625rem 0.5rem' }}>{item.cost}</td>
                    <td style={{ padding: '0.625rem 0.5rem' }}>{item.hours}</td>
                    <td style={{ padding: '0.625rem 0 0.625rem 0.5rem', color: 'var(--color-text-secondary)' }}>{item.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.9375rem', lineHeight: 1.5 }}>
              {STORY.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div style={{ marginTop: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={startDemo} className="eg-landing-primary">
              <Play size={16} /> Start the guided demo
            </button>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              A step-by-step guide opens in the app; <strong>Reset demo</strong> restores this starting point any time.
            </span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: '#0F172A', color: '#94A3B8', padding: '1.5rem 0' }}>
        <div style={{ ...container, display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
          <span>
            <strong style={{ color: '#F8FAFC' }}>Team Zero Protocol</strong> · University of Peradeniya · Arnikan U.,
            Ananthasagaran N., Sanjeevan U.
          </span>
          <span>CodeSplash'26 Agentic AI Phase · Theme 2: AI Startup Co-Founder</span>
        </div>
      </footer>

      <style>{`
        .eg-landing-primary, .eg-landing-secondary, .eg-landing-link {
          display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer;
          font-family: inherit; font-weight: 600; border-radius: var(--radius-md); transition: all 0.15s ease;
        }
        .eg-landing-primary {
          padding: 0.8rem 1.4rem; font-size: 0.9375rem; color: #FFFFFF;
          background-color: var(--color-governor-teal); border: 1px solid var(--color-governor-teal);
          box-shadow: 0 6px 18px -6px rgba(45, 212, 191, 0.6);
        }
        .eg-landing-primary:hover { background-color: var(--color-governor-teal-hover); transform: translateY(-1px); }
        .eg-landing-secondary {
          padding: 0.8rem 1.4rem; font-size: 0.9375rem; color: #E2E8F0;
          background-color: transparent; border: 1px solid rgba(148, 163, 184, 0.5);
        }
        .eg-landing-secondary:hover { background-color: rgba(255, 255, 255, 0.08); }
        .eg-landing-link {
          padding: 0.5rem 0.9rem; font-size: 0.8125rem; color: var(--color-governor-teal-accent);
          background-color: rgba(45, 212, 191, 0.08); border: 1px solid rgba(45, 212, 191, 0.3);
        }
        .eg-landing-link:hover { background-color: rgba(45, 212, 191, 0.16); }
      `}</style>
    </div>
  );
};

export default Landing;
