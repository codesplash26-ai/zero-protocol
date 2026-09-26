import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  ArrowRight,
  ArrowDown,
  Quote,
  Sparkles,
  MousePointerClick,
  CheckCircle2,
  AlertTriangle,
  Info,
  Brain,
  Calculator,
  UserCheck,
  ShieldCheck,
  FlaskConical,
  Receipt,
  RefreshCw,
  History,
  WifiOff,
  Lightbulb,
} from 'lucide-react';
import { BrandMark } from '../components/ui/BrandMark';
import { storeGuideOpen } from '../lib/demoGuide';

/** Landing-page palette: vibrant accents on top of the app's design tokens. */
const C = {
  indigo: '#4F46E5',
  violet: '#7C3AED',
  teal: '#0D9488',
  mint: '#2DD4BF',
  amber: '#F59E0B',
  coral: '#F43F5E',
  sky: '#0EA5E9',
  ink: '#1E1B4B',
};

const QUOTES = [
  {
    quote: 'We spent a month building the annual plan — then found out customers wouldn’t pay more.',
    pain: 'Built big before testing small',
    color: C.coral,
  },
  {
    quote: 'Our best engineer got pulled into an experiment, and the enterprise deadline slipped.',
    pain: 'Broke a promise to a customer',
    color: C.amber,
  },
  {
    quote: 'The plan was perfect on Monday. By Wednesday, half of it was wrong.',
    pain: 'Plans that never adapt',
    color: C.violet,
  },
  {
    quote: 'Everyone had a favourite idea. Nobody could say what we’d give up for it.',
    pain: 'Hidden trade-offs',
    color: C.sky,
  },
];

type Pick = 'A' | 'B' | 'C';

const IDEAS: { id: Pick; name: string; cost: string; hours: string; note: string; color: string }[] = [
  { id: 'A', name: 'Pricing willingness test', cost: '$600', hours: '6h', note: 'Will customers pay 15% more?', color: C.teal },
  { id: 'B', name: 'Annual-plan checkout', cost: '$2,500', hours: '24h', note: 'A bigger build for upfront cash', color: C.amber },
  { id: 'C', name: 'Referral prototype', cost: '$1,800', hours: '16h', note: 'A separate growth idea', color: C.sky },
];

const VERDICTS: Record<Pick, { title: string; text: string; tone: string; icon: React.ReactNode }> = {
  A: {
    title: 'Great pick — that’s what the Governor chooses.',
    text: 'It costs just $600 and 6 hours, and its answer tells you whether the $2,500 checkout is worth building at all.',
    tone: C.teal,
    icon: <CheckCircle2 size={22} />,
  },
  B: {
    title: 'Tempting, but risky.',
    text: 'It eats all 24 free hours, needs founder sign-off at $2,500, and only pays off if customers accept higher prices — which nobody has tested yet.',
    tone: C.amber,
    icon: <AlertTriangle size={22} />,
  },
  C: {
    title: 'Good idea, wrong moment.',
    text: 'It’s affordable, but it teaches you nothing about the pricing decision in front of you right now.',
    tone: C.sky,
    icon: <Info size={22} />,
  },
};

const QUESTIONS = [
  { q: 'What does it cost?', a: 'Budget, engineering hours and customer traffic.', color: C.indigo },
  { q: 'What does it block?', a: 'Promises to customers and the other experiments.', color: C.violet },
  { q: 'What will we learn?', a: 'The uncertainty this experiment actually resolves.', color: C.coral },
  { q: 'What does that unlock?', a: 'The bigger decision that answer makes safe.', color: C.amber },
  { q: 'What’s the smartest order?', a: 'Cheap tests first when they decide a big bet.', color: C.teal },
  { q: 'What if things change?', a: 'Replan — but only when the change really matters.', color: C.sky },
];

const PILLARS = [
  { icon: <Brain size={22} />, title: 'AI for judgment', text: 'Reads your goal, weighs trade-offs and explains its reasoning.', color: C.violet },
  { icon: <Calculator size={22} />, title: 'Math for the numbers', text: 'Deterministic engines and Google OR-Tools CP-SAT check every limit.', color: C.teal },
  { icon: <UserCheck size={22} />, title: 'You for the big calls', text: 'Anything above your spending threshold waits for your yes.', color: C.coral },
];

const FEATURES = [
  { icon: <ShieldCheck size={22} />, title: 'Keeps your promises safe', text: 'Hours reserved for customers are never quietly spent on experiments.', color: C.indigo },
  { icon: <FlaskConical size={22} />, title: 'Tests small before you build big', text: 'Runs the cheap experiment first when its result decides a bigger bet.', color: C.teal },
  { icon: <UserCheck size={22} />, title: 'Asks before big spends', text: 'Anything above your threshold needs your explicit approval.', color: C.coral },
  { icon: <Receipt size={22} />, title: 'Acts — and keeps the receipt', text: 'Approved work reserves budget and hours, with a receipt for every action.', color: C.amber },
  { icon: <RefreshCw size={22} />, title: 'Replans when life happens', text: 'Results and surprises are checked; the plan changes only when it matters.', color: C.violet },
  { icon: <History size={22} />, title: 'Remembers every decision', text: 'A full audit trail from goal to action — ready for your team or investors.', color: C.sky },
];

const STORY = [
  { when: 'Day 1', text: 'The Governor says: test pricing first. It’s cheap, and it decides what comes next.', color: C.mint },
  { when: 'Week 1', text: 'The test works — customers accept the higher price.', color: C.amber },
  { when: 'Week 2', text: 'Surprise: the SSO vendor is late, freeing 18 engineering hours.', color: C.coral },
  { when: 'Same day', text: 'The Governor replans: build the annual checkout now. You approve the $2,500 — and every step is on record.', color: '#A78BFA' },
];

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [pick, setPick] = useState<Pick | null>(null);

  const startDemo = () => {
    storeGuideOpen(true);
    navigate('/overview');
  };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="lp">
      {/* ================= HERO ================= */}
      <header className="lp-hero">
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />
        <div className="lp-blob lp-blob-3" />

        <nav className="lp-container lp-nav">
          <div className="lp-brand">
            <span className="lp-brand-mark">
              <BrandMark size={20} />
            </span>
            <span>
              <strong>Experiment Governor</strong>
              <small>ZERO PROTOCOL</small>
            </span>
          </div>
          <div className="lp-nav-links">
            <button type="button" onClick={() => scrollTo('problem')}>The problem</button>
            <button type="button" onClick={() => scrollTo('game')}>Try it</button>
            <button type="button" onClick={() => scrollTo('how')}>How it thinks</button>
            <button type="button" className="lp-nav-cta" onClick={startDemo}>
              Open the app <ArrowRight size={14} />
            </button>
          </div>
        </nav>

        <div className="lp-container lp-hero-grid">
          <div className="lp-rise">
            <span className="lp-pill">
              <Sparkles size={14} /> Your AI startup co-founder
            </span>
            <h1 className="lp-h1">
              Too many experiment ideas.{' '}
              <span className="lp-gradient-text">Not enough time, money or engineers.</span>
            </h1>
            <p className="lp-lead">
              Experiment Governor tells you <strong>which experiment to run first</strong>, what it will cost you and what
              it will teach you — then keeps the plan honest when things change.
            </p>
            <div className="lp-cta-row">
              <button type="button" className="lp-btn-primary" onClick={startDemo}>
                <Play size={18} /> Watch it decide
              </button>
              <button type="button" className="lp-btn-ghost" onClick={() => scrollTo('game')}>
                Play the 30-second game <ArrowDown size={16} />
              </button>
            </div>
            <p className="lp-trust">AI reasoning + math you can check · you approve every big spend</p>
          </div>

          {/* Idea cards visual */}
          <div className="lp-cards" aria-hidden="true">
            <span className="lp-chip lp-chip-1">$4,000 budget</span>
            <span className="lp-chip lp-chip-2">24h free this month</span>
            <span className="lp-chip lp-chip-3">36h promised to Enterprise SSO</span>
            {IDEAS.map((idea, index) => (
              <div
                key={idea.id}
                className={`lp-idea lp-idea-${index + 1}${idea.id === 'A' ? ' lp-idea-winner' : ''}`}
                style={{ borderTopColor: idea.color }}
              >
                {idea.id === 'A' && (
                  <span className="lp-winner-badge">
                    <Sparkles size={12} /> Run this first
                  </span>
                )}
                {idea.id === 'B' && <span className="lp-wait-badge">Only if A works</span>}
                <div className="lp-idea-id" style={{ backgroundColor: idea.color }}>
                  {idea.id}
                </div>
                <div className="lp-idea-name">{idea.name}</div>
                <div className="lp-idea-meta">
                  {idea.cost} · {idea.hours}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ================= SOUND FAMILIAR ================= */}
      <section id="problem" className="lp-section">
        <div className="lp-container">
          <span className="lp-eyebrow" style={{ color: C.coral }}>Sound familiar?</span>
          <h2 className="lp-h2">Every founder has been here.</h2>
          <p className="lp-sub">
            Picking one experiment quietly changes what every other idea can do. A simple priority list hides that.
          </p>
          <div className="lp-quote-grid">
            {QUOTES.map((item) => (
              <figure key={item.pain} className="lp-quote" style={{ borderLeftColor: item.color }}>
                <Quote size={22} style={{ color: item.color }} />
                <blockquote>{item.quote}</blockquote>
                <figcaption style={{ color: item.color }}>{item.pain}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ================= GAME ================= */}
      <section id="game" className="lp-section lp-game">
        <div className="lp-container">
          <span className="lp-eyebrow" style={{ color: C.violet }}>
            <MousePointerClick size={14} /> Your turn
          </span>
          <h2 className="lp-h2">Which one would you run first?</h2>
          <p className="lp-sub">
            PulseBoard has <strong>$4,000</strong>, <strong>24 free engineering hours</strong> and a promise to ship
            Enterprise SSO. Pick one.
          </p>

          <div className="lp-game-grid">
            {IDEAS.map((idea) => {
              const selected = pick === idea.id;
              return (
                <button
                  key={idea.id}
                  type="button"
                  className={`lp-game-card${selected ? ' is-selected' : ''}${pick && !selected ? ' is-dimmed' : ''}`}
                  style={{ '--accent': idea.color } as React.CSSProperties}
                  onClick={() => setPick(idea.id)}
                  aria-pressed={selected}
                >
                  <span className="lp-game-id" style={{ backgroundColor: idea.color }}>
                    {idea.id}
                  </span>
                  <span className="lp-game-name">{idea.name}</span>
                  <span className="lp-game-note">{idea.note}</span>
                  <span className="lp-game-meta">
                    <span>{idea.cost}</span>
                    <span>{idea.hours}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="lp-verdict-slot" aria-live="polite">
            {pick ? (
              <div className="lp-verdict" style={{ borderColor: VERDICTS[pick].tone }}>
                <span style={{ color: VERDICTS[pick].tone, display: 'flex' }}>{VERDICTS[pick].icon}</span>
                <div>
                  <div className="lp-verdict-title" style={{ color: VERDICTS[pick].tone }}>
                    {VERDICTS[pick].title}
                  </div>
                  <p>{VERDICTS[pick].text}</p>
                  <p className="lp-verdict-hook">
                    That’s exactly how the Governor thinks — for every idea, every time something changes.
                  </p>
                  <button type="button" className="lp-btn-primary lp-btn-small" onClick={startDemo}>
                    See the Governor decide <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="lp-verdict-hint">Tap a card to see what the Governor would say.</p>
            )}
          </div>
        </div>
      </section>

      {/* ================= HOW IT THINKS ================= */}
      <section id="how" className="lp-section">
        <div className="lp-container">
          <span className="lp-eyebrow" style={{ color: C.teal }}>What makes it different</span>
          <h2 className="lp-h2">It asks the questions you don’t have time to.</h2>
          <p className="lp-sub">
            Experiments aren’t just tasks — they’re how you buy information. The Governor follows what each one costs
            and what it lets you decide next.
          </p>
          <div className="lp-question-grid">
            {QUESTIONS.map((item, index) => (
              <div key={item.q} className="lp-question" style={{ '--accent': item.color } as React.CSSProperties}>
                <span className="lp-question-num">{index + 1}</span>
                <div className="lp-question-q">{item.q}</div>
                <div className="lp-question-a">{item.a}</div>
              </div>
            ))}
          </div>

          <div className="lp-pillars">
            {PILLARS.map((item) => (
              <div key={item.title} className="lp-pillar">
                <span className="lp-icon" style={{ backgroundColor: item.color }}>
                  {item.icon}
                </span>
                <div>
                  <div className="lp-pillar-title">{item.title}</div>
                  <div className="lp-pillar-text">{item.text}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="lp-footnote">
            <Lightbulb size={14} /> Not an LLM wrapper: the AI never invents numbers or approves spending on its own.
          </p>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="lp-section lp-features-bg">
        <div className="lp-container">
          <span className="lp-eyebrow" style={{ color: C.indigo }}>What it does for you</span>
          <h2 className="lp-h2">A co-founder that never forgets the constraints.</h2>
          <div className="lp-feature-grid">
            {FEATURES.map((item) => (
              <div key={item.title} className="lp-feature" style={{ '--accent': item.color } as React.CSSProperties}>
                <span className="lp-icon" style={{ backgroundColor: item.color }}>
                  {item.icon}
                </span>
                <div className="lp-feature-title">{item.title}</div>
                <div className="lp-feature-text">{item.text}</div>
              </div>
            ))}
          </div>
          <div className="lp-offline">
            <WifiOff size={18} /> Works even without AI API keys — a rule-based engine takes over, so the demo always runs.
          </div>
        </div>
      </section>

      {/* ================= STORY ================= */}
      <section className="lp-section lp-story">
        <div className="lp-container">
          <span className="lp-eyebrow" style={{ color: C.mint }}>A story you can play yourself</span>
          <h2 className="lp-h2" style={{ color: '#FFFFFF' }}>
            Two minutes. Three experiments. One surprise.
          </h2>
          <ol className="lp-timeline">
            {STORY.map((step) => (
              <li key={step.when}>
                <span className="lp-dot" style={{ backgroundColor: step.color, boxShadow: `0 0 0 6px ${step.color}33` }} />
                <span className="lp-when" style={{ color: step.color }}>
                  {step.when}
                </span>
                <span className="lp-what">{step.text}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="lp-btn-primary" onClick={startDemo}>
            <Play size={18} /> Play the PulseBoard story
          </button>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="lp-final">
        <div className="lp-container lp-final-inner">
          <h2>Curious which experiment it would pick?</h2>
          <p>A guided demo walks you through it step by step. Reset any time and try a different path.</p>
          <button type="button" className="lp-btn-white" onClick={startDemo}>
            Start the guided demo <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <span>
            <strong>Team Zero Protocol</strong> · University of Peradeniya · Arnikan U., Ananthasagaran N., Sanjeevan U.
          </span>
          <span>CodeSplash'26 Agentic AI Phase · Theme 2: AI Startup Co-Founder</span>
        </div>
      </footer>

      <style>{LANDING_CSS}</style>
    </div>
  );
};

const LANDING_CSS = `
.lp { min-height: 100vh; background: #FFFFFF; color: #0F172A; overflow-x: hidden; }
.lp-container { max-width: 1140px; margin: 0 auto; padding: 0 1.5rem; }
.lp button { font-family: inherit; }

/* Hero */
.lp-hero { position: relative; overflow: hidden; color: #F8FAFC; padding-bottom: 5rem;
  /* Fill the first screen so the next section never peeks in as a white strip. */
  min-height: 100vh; min-height: 100svh; display: flex; flex-direction: column;
  background: linear-gradient(135deg, ${C.ink} 0%, #312E81 45%, #134E4A 100%); }
.lp-hero > .lp-container { width: 100%; }
.lp-blob { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.55; animation: lp-float 14s ease-in-out infinite; }
.lp-blob-1 { width: 380px; height: 380px; background: ${C.violet}; top: -120px; right: 8%; }
.lp-blob-2 { width: 320px; height: 320px; background: ${C.teal}; bottom: -140px; left: -60px; animation-delay: -4s; }
.lp-blob-3 { width: 240px; height: 240px; background: ${C.coral}; top: 40%; right: -80px; opacity: 0.35; animation-delay: -8s; }
@keyframes lp-float { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, -25px) scale(1.08); } }

.lp-nav { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: 1.25rem; padding-bottom: 1.25rem; }
.lp-brand { display: flex; align-items: center; gap: 0.75rem; }
.lp-brand strong { display: block; font-size: 1rem; }
.lp-brand small { display: block; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.1em; color: ${C.mint}; }
.lp-brand-mark { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  color: ${C.mint}; background: rgba(45, 212, 191, 0.15); border: 1px solid rgba(45, 212, 191, 0.4); }
.lp-nav-links { display: flex; align-items: center; gap: 0.25rem; }
.lp-nav-links button { background: none; border: none; color: #C7D2FE; font-size: 0.875rem; font-weight: 500; padding: 0.5rem 0.75rem; border-radius: 8px; cursor: pointer; }
.lp-nav-links button:hover { color: #FFFFFF; background: rgba(255, 255, 255, 0.08); }
.lp-nav-links .lp-nav-cta { display: inline-flex; align-items: center; gap: 0.375rem; color: ${C.ink}; background: ${C.mint}; font-weight: 700; margin-left: 0.5rem; }
.lp-nav-links .lp-nav-cta:hover { background: #5EEAD4; color: ${C.ink}; }

.lp-hero-grid { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 3rem; align-items: center; align-content: center; padding-top: 2.5rem; flex: 1; }
.lp-pill { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.9rem; border-radius: 999px; font-size: 0.8125rem; font-weight: 600;
  color: #FDE68A; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); margin-bottom: 1.25rem; }
.lp-h1 { font-size: clamp(2.1rem, 4.6vw, 3.4rem); font-weight: 800; line-height: 1.08; letter-spacing: -0.03em; margin: 0; }
.lp-gradient-text { background: linear-gradient(90deg, ${C.mint}, #A78BFA 50%, #FB7185); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lp-lead { font-size: 1.125rem; line-height: 1.65; color: #CBD5E1; margin: 1.25rem 0 2rem; max-width: 560px; }
.lp-lead strong { color: #FFFFFF; }
.lp-cta-row { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.lp-trust { margin-top: 1.25rem; font-size: 0.8125rem; color: #A5B4FC; }

.lp-btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.9rem 1.5rem; border: none; border-radius: 12px; cursor: pointer;
  font-size: 1rem; font-weight: 700; color: #FFFFFF; background: linear-gradient(90deg, ${C.amber}, ${C.coral});
  box-shadow: 0 10px 28px -8px rgba(244, 63, 94, 0.6); transition: transform 0.15s ease, box-shadow 0.15s ease; }
.lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 32px -8px rgba(244, 63, 94, 0.7); }
.lp-btn-small { padding: 0.65rem 1.1rem; font-size: 0.9rem; margin-top: 0.5rem; }
.lp-btn-ghost { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.9rem 1.4rem; border-radius: 12px; cursor: pointer;
  font-size: 1rem; font-weight: 600; color: #E0E7FF; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(199, 210, 254, 0.35); }
.lp-btn-ghost:hover { background: rgba(255, 255, 255, 0.12); }

/* Idea cards visual */
.lp-cards { position: relative; height: 380px; }
.lp-idea { position: absolute; width: 230px; padding: 1rem 1.1rem; border-radius: 16px; background: #FFFFFF; color: #0F172A;
  border-top: 6px solid; box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.45); }
.lp-idea-1 { top: 40px; left: 8%; transform: rotate(-4deg); z-index: 3; }
.lp-idea-2 { top: 150px; left: 42%; transform: rotate(3deg); z-index: 2; }
.lp-idea-3 { top: 250px; left: 14%; transform: rotate(-1.5deg); z-index: 1; opacity: 0.92; }
.lp-idea-winner { animation: lp-glow 2.6s ease-in-out infinite; }
@keyframes lp-glow { 0%, 100% { box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.45), 0 0 0 0 rgba(45, 212, 191, 0.55); }
  50% { box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.45), 0 0 0 10px rgba(45, 212, 191, 0); } }
.lp-idea-id { width: 30px; height: 30px; border-radius: 9px; color: #FFFFFF; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; }
.lp-idea-name { font-weight: 700; font-size: 0.95rem; }
.lp-idea-meta { font-size: 0.8125rem; color: #64748B; margin-top: 0.15rem; }
.lp-winner-badge, .lp-wait-badge { position: absolute; top: -14px; right: 12px; display: inline-flex; align-items: center; gap: 0.25rem;
  padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.6875rem; font-weight: 800; }
.lp-winner-badge { background: ${C.mint}; color: ${C.ink}; }
.lp-wait-badge { background: #FEF3C7; color: #B45309; }
.lp-chip { position: absolute; z-index: 4; padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600;
  background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(165, 180, 252, 0.4); color: #E0E7FF; backdrop-filter: blur(6px); white-space: nowrap; }
.lp-chip-1 { top: 0; left: 60%; }
.lp-chip-2 { top: 200px; left: 0; }
.lp-chip-3 { bottom: 10px; right: 0; }

/* Sections */
.lp-section { padding: 5rem 0; }
.lp-eyebrow { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.625rem; }
.lp-h2 { font-size: clamp(1.7rem, 3.4vw, 2.4rem); font-weight: 800; letter-spacing: -0.025em; line-height: 1.15; margin: 0; color: #0F172A; }
.lp-sub { font-size: 1.0625rem; line-height: 1.6; color: #475569; margin: 0.875rem 0 2.25rem; max-width: 720px; }

.lp-quote-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.25rem; }
.lp-quote { margin: 0; padding: 1.5rem; border-radius: 18px; background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 6px solid; transition: transform 0.2s ease; }
.lp-quote:hover { transform: translateY(-4px); }
.lp-quote blockquote { margin: 0.75rem 0 1rem; font-size: 1.0625rem; line-height: 1.5; font-weight: 600; color: #1E293B; }
.lp-quote figcaption { font-size: 0.8125rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }

/* Game */
.lp-game { background: linear-gradient(180deg, #F5F3FF 0%, #EEF2FF 100%); }
.lp-game-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1.25rem; }
.lp-game-card { position: relative; display: flex; flex-direction: column; gap: 0.35rem; text-align: left; padding: 1.5rem; border-radius: 20px; cursor: pointer;
  background: #FFFFFF; border: 2px solid #E0E7FF; box-shadow: 0 8px 24px -12px rgba(79, 70, 229, 0.35); transition: all 0.2s ease; }
.lp-game-card:hover { transform: translateY(-4px); border-color: var(--accent); }
.lp-game-card.is-selected { border-color: var(--accent); box-shadow: 0 16px 36px -12px var(--accent); transform: translateY(-4px) scale(1.02); }
.lp-game-card.is-dimmed { opacity: 0.55; }
.lp-game-id { width: 42px; height: 42px; border-radius: 12px; color: #FFFFFF; font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; }
.lp-game-name { font-size: 1.125rem; font-weight: 800; color: #0F172A; }
.lp-game-note { font-size: 0.9rem; color: #64748B; }
.lp-game-meta { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
.lp-game-meta span { padding: 0.25rem 0.65rem; border-radius: 999px; background: #F1F5F9; font-size: 0.8125rem; font-weight: 700; color: #334155; }
.lp-verdict-slot { margin-top: 1.75rem; min-height: 120px; }
.lp-verdict { display: flex; gap: 1rem; padding: 1.5rem; border-radius: 18px; background: #FFFFFF; border: 2px solid; animation: lp-pop 0.35s ease; }
.lp-verdict-title { font-size: 1.125rem; font-weight: 800; }
.lp-verdict p { margin: 0.35rem 0 0; color: #334155; line-height: 1.55; }
.lp-verdict .lp-verdict-hook { color: ${C.violet}; font-weight: 600; margin-bottom: 0.5rem; }
.lp-verdict-hint { text-align: center; color: ${C.violet}; font-weight: 600; margin: 2.5rem 0 0; }
@keyframes lp-pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }

/* How it thinks */
.lp-question-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
.lp-question { position: relative; padding: 1.25rem 1.25rem 1.25rem 4rem; border-radius: 16px; background: #FFFFFF; border: 1px solid #E2E8F0; transition: all 0.2s ease; }
.lp-question:hover { border-color: var(--accent); box-shadow: 0 10px 24px -14px var(--accent); }
.lp-question-num { position: absolute; left: 1.1rem; top: 1.15rem; width: 34px; height: 34px; border-radius: 50%; background: var(--accent); color: #FFFFFF;
  font-weight: 800; display: flex; align-items: center; justify-content: center; }
.lp-question-q { font-size: 1.0625rem; font-weight: 800; color: #0F172A; }
.lp-question-a { font-size: 0.9rem; color: #64748B; margin-top: 0.2rem; }
.lp-pillars { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 2rem; padding: 1.5rem; border-radius: 20px;
  background: linear-gradient(90deg, #EEF2FF, #F0FDFA, #FFF1F2); }
.lp-pillar { display: flex; gap: 0.875rem; align-items: flex-start; }
.lp-pillar-title { font-weight: 800; font-size: 1rem; }
.lp-pillar-text { font-size: 0.9rem; color: #475569; margin-top: 0.15rem; line-height: 1.5; }
.lp-icon { flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px; color: #FFFFFF; display: flex; align-items: center; justify-content: center; }
.lp-footnote { display: flex; align-items: center; gap: 0.4rem; margin-top: 1.25rem; font-size: 0.875rem; color: #64748B; }

/* Features */
.lp-features-bg { background: #F8FAFC; }
.lp-feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.25rem; margin-top: 2.25rem; }
.lp-feature { padding: 1.5rem; border-radius: 18px; background: #FFFFFF; border: 1px solid #E2E8F0; border-bottom: 4px solid var(--accent); transition: transform 0.2s ease; }
.lp-feature:hover { transform: translateY(-4px); }
.lp-feature-title { font-size: 1.0625rem; font-weight: 800; margin-top: 0.875rem; }
.lp-feature-text { font-size: 0.9rem; color: #475569; margin-top: 0.3rem; line-height: 1.5; }
.lp-offline { display: flex; align-items: center; gap: 0.6rem; margin-top: 1.5rem; padding: 1rem 1.25rem; border-radius: 14px;
  background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-weight: 600; font-size: 0.9375rem; }

/* Story */
.lp-story { background: linear-gradient(135deg, ${C.ink} 0%, #3B0764 100%); color: #E2E8F0; }
.lp-timeline { list-style: none; margin: 2.25rem 0 2.25rem; padding: 0 0 0 1.5rem; border-left: 2px dashed rgba(165, 180, 252, 0.4); display: flex; flex-direction: column; gap: 1.5rem; }
.lp-timeline li { position: relative; display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; align-items: baseline; }
.lp-dot { position: absolute; left: calc(-1.5rem - 8px); top: 0.35rem; width: 14px; height: 14px; border-radius: 50%; }
.lp-when { font-weight: 800; min-width: 90px; text-transform: uppercase; font-size: 0.8125rem; letter-spacing: 0.06em; }
.lp-what { flex: 1; min-width: 240px; font-size: 1.0625rem; line-height: 1.5; color: #F1F5F9; }

/* Final CTA */
.lp-final { background: linear-gradient(90deg, ${C.amber}, ${C.coral} 50%, ${C.violet}); padding: 4.5rem 0; color: #FFFFFF; text-align: center; }
.lp-final-inner h2 { font-size: clamp(1.7rem, 3.4vw, 2.5rem); font-weight: 800; margin: 0; letter-spacing: -0.02em; }
.lp-final-inner p { font-size: 1.0625rem; margin: 0.75rem auto 1.75rem; max-width: 560px; color: #FFF7ED; }
.lp-btn-white { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.95rem 1.6rem; border-radius: 12px; border: none; cursor: pointer;
  font-size: 1.0625rem; font-weight: 800; color: ${C.ink}; background: #FFFFFF; box-shadow: 0 12px 30px -10px rgba(30, 27, 75, 0.6); transition: transform 0.15s ease; }
.lp-btn-white:hover { transform: translateY(-2px); }

.lp-footer { background: #0F172A; color: #94A3B8; padding: 1.5rem 0; font-size: 0.8125rem; }
.lp-footer strong { color: #F8FAFC; }
.lp-footer-inner { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }

.lp-rise { animation: lp-rise 0.7s ease both; }
@keyframes lp-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

@media (max-width: 760px) {
  .lp-nav-links button:not(.lp-nav-cta) { display: none; }
  .lp-cards { height: 360px; }
  .lp-idea { width: 200px; }
  .lp-idea-2 { left: 30%; }
  .lp-chip { display: none; }
  .lp-idea-1 { left: 0; }
  .lp-idea-3 { left: 4%; }
}
@media (prefers-reduced-motion: reduce) {
  .lp-blob, .lp-idea-winner, .lp-rise, .lp-verdict { animation: none; }
}
`;

export default Landing;
