/**
 * In-app user guide — how to use AI Outfit Suggestor
 */

import React from 'react';

function StepList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-4 mt-2">
      {items.map((text, i) => (
        <li key={text} className="flex gap-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue/25 to-brand-purple/25 text-sm font-bold text-brand-blue ring-1 ring-white/10"
            aria-hidden
          >
            {i + 1}
          </span>
          <p className="text-slate-200 leading-relaxed pt-1.5">{text}</p>
        </li>
      ))}
    </ol>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex gap-3 rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-500/10 to-orange-500/5 px-4 py-4 sm:px-5">
      <span className="text-xl shrink-0" aria-hidden>
        💡
      </span>
      <div className="text-sm sm:text-base text-amber-50/95 leading-relaxed">{children}</div>
    </div>
  );
}

function SectionCard({
  id,
  icon,
  title,
  subtitle,
  accent,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  accent: 'blue' | 'purple' | 'violet' | 'rose';
  children: React.ReactNode;
}) {
  const accents = {
    blue: 'from-brand-blue/20 to-brand-blue/5 ring-brand-blue/20',
    purple: 'from-brand-purple/20 to-brand-purple/5 ring-brand-purple/20',
    violet: 'from-violet-500/20 to-violet-600/5 ring-violet-400/20',
    rose: 'from-rose-500/15 to-rose-600/5 ring-rose-400/20',
  };
  return (
    <section
      id={id}
      className={`scroll-mt-24 rounded-3xl border border-white/10 bg-gradient-to-b ${accents[accent]} p-6 sm:p-8 shadow-lg ring-1 backdrop-blur-sm`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-5">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900/60 text-2xl shadow-inner ring-1 ring-white/10"
          aria-hidden
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{title}</h3>
          {subtitle && <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      <div className="text-sm sm:text-base text-slate-200/95 space-y-4 leading-relaxed">{children}</div>
    </section>
  );
}

function TocChip({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      className="group flex items-center gap-2.5 rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-left text-sm font-medium text-slate-200 transition-all hover:border-brand-blue/35 hover:bg-brand-blue/10 hover:text-white hover:shadow-md hover:shadow-brand-blue/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-lg transition-colors group-hover:bg-brand-gradient-soft"
        aria-hidden
      >
        {icon}
      </span>
      <span className="flex-1 leading-snug">{label}</span>
      <span className="text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-blue" aria-hidden>
        →
      </span>
    </a>
  );
}

const UserGuide: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
  const toc = [
    { id: 'quick-start', label: 'Quick start', icon: '🚀' },
    { id: 'suggestion-flow', label: 'Get outfit suggestions', icon: '🎯' },
    { id: 'results', label: 'Your results', icon: '✨' },
    { id: 'wardrobe-analysis', label: 'Insights & wardrobe analysis', icon: '🧠' },
    { id: 'wardrobe', label: 'Wardrobe', icon: '👔' },
    { id: 'random-history', label: 'Random & history', icon: '🎲' },
    { id: 'account', label: 'Account', icon: '⚙️' },
    { id: 'pwa', label: 'Install app', icon: '📲' },
    { id: 'tips', label: 'Tips & help', icon: '💡' },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-8">
      {/* Hero */}
      <div className="relative mb-8 sm:mb-10 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-blue/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-brand-purple/20 blur-3xl" />
        <div className="relative px-6 py-12 sm:px-10 sm:py-14 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-blue/90 mb-6">
            <span aria-hidden>✨</span>
            Friendly walkthrough
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            How to use{' '}
            <span className="bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
              AI Outfit Suggestor
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Everything you need in plain language—upload a photo, tweak preferences, and let the AI style you. Jump
            to any topic below, or scroll at your own pace.
          </p>
          <p className="mt-6 text-sm text-slate-500">
            Tip: use the <strong className="text-slate-400 font-semibold">tabs at the top</strong> for Get Suggestion,
            Guide, History, Wardrobe, and Insights. <strong className="text-slate-400 font-semibold">About</strong> (app story &
            creator links) lives in the <strong className="text-slate-400 font-semibold">footer</strong>.
          </p>
        </div>
      </div>

      {/* Table of contents */}
      <nav
        aria-label="Guide sections"
        className="mb-10 sm:mb-12 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 backdrop-blur-sm"
      >
        <h2 className="text-lg font-semibold text-white mb-1">Jump to a section</h2>
        <p className="text-sm text-slate-400 mb-5">Tap a card to scroll there instantly.</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {toc.map((item) => (
            <li key={item.id}>
              <TocChip href={`#${item.id}`} icon={item.icon} label={item.label} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-8 sm:space-y-10">
        <SectionCard
          id="quick-start"
          icon="🚀"
          title="Quick start"
          subtitle="Try it now, or sign in for the full experience."
          accent="blue"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 ring-1 ring-white/5">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-blue/90 mb-2">No account needed</p>
              <p className="text-slate-300">
                Upload a clothing photo and tap <span className="text-white font-medium">Generate Outfit</span>.
                You will get a full outfit idea right away.
              </p>
            </div>
            <div className="rounded-2xl border border-brand-purple/20 bg-brand-purple/10 p-5 ring-1 ring-brand-purple/10">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-purple mb-2">With a free account</p>
              <p className="text-slate-200">
                Save a <span className="text-white font-medium">wardrobe</span>, browse{' '}
                <span className="text-white font-medium">history</span>, use{' '}
                <span className="text-white font-medium">wardrobe-only</span> mode, random picks, and settings.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="suggestion-flow"
          icon="🎯"
          title="Get outfit suggestions"
          subtitle="Six simple steps from photo to polished look."
          accent="purple"
        >
          <StepList
            items={[
              'Stay on the Get Suggestion tab (it opens by default).',
              'Add a photo: tap the upload area, drag a file, or use Take Photo. We accept JPG, PNG, or WebP up to 10 MB.',
              'Open Preferences when you want: pick occasion, season, style, and add notes. Hover the section titles for a quick reminder of what is included.',
              'Logged in? In the Wardrobe block, switch Use my wardrobe only on to only mix pieces you own—or leave it off for fresh ideas from anywhere.',
              'If model image generation is on, you may see a short confirmation before the app creates a preview image.',
              'Press Generate Outfit and watch the right panel—your outfit appears when ready.',
            ]}
          />
          <TipBox>
            <strong className="text-white">From your wardrobe:</strong> start with one item via{' '}
            <span className="text-white font-medium">Style this item with AI</span>, or combine several on the Wardrobe tab
            with <span className="text-white font-medium">Complete outfit with AI</span>—set Preferences there first when you want
            occasion, season, style, or notes to shape the result.
          </TipBox>
        </SectionCard>

        <SectionCard
          id="results"
          icon="✨"
          title="Understanding your results"
          subtitle="What each part of the screen means."
          accent="violet"
        >
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="text-brand-blue font-bold shrink-0">•</span>
              <span>
                You will see <strong className="text-white">shirt, trousers, blazer, shoes, and belt</strong> with short
                descriptions. Small images may show your upload, items from your wardrobe, or an AI-only suggestion. When
                the occasion calls for it, the AI may also suggest a <strong className="text-white">sweater, jacket or coat, or tie</strong>{' '}
                in an <strong className="text-white">Also wear</strong> section below the core five pieces. Blazers are structured suit-style layers;
                casual jackets and coats stay separate and appear as optional outerwear—not as the main blazer slot. In summer, heavy coats and
                wool blazers are usually skipped.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-blue font-bold shrink-0">•</span>
              <span>
                <strong className="text-white">Why this works</strong> summarizes the styling logic in friendly language.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-blue font-bold shrink-0">•</span>
              <span>
                After a result, tap <strong className="text-white">Generate Another Look</strong> for a fresh outfit from the
                same photo. Secondary actions let you make it more formal or casual, limit picks to your wardrobe, or change
                occasion in Preferences. Image-based actions require an uploaded photo.
              </span>
            </li>
            {isAdmin && (
              <li className="flex gap-3">
                <span className="text-brand-blue font-bold shrink-0">•</span>
                <span>
                  Admins can toggle <strong className="text-white">Show AI Prompt &amp; Response</strong> in the sidebar
                  to peek at technical details on outfit suggestions. Wardrobe analysis also surfaces admin diagnostics
                  when premium metadata is available.
                </span>
              </li>
            )}
          </ul>
        </SectionCard>

        <SectionCard
          id="wardrobe-analysis"
          icon="🧠"
          title="Analyze My Wardrobe"
          subtitle="Find what you own, what you miss, and what to buy next."
          accent="purple"
        >
          <StepList
            items={[
              'Open the Insights tab for the Wardrobe Insights workspace—summary-first layout with gap score and top priorities.',
              'Before your first run, set occasion, season, style, and optional notes in Analysis Preferences.',
              'You can also start from Wardrobe by clicking Analyze My Wardrobe in the header.',
              'Choose Quick Wardrobe Check (rules-based) or AI Stylist Review (deeper AI styling advice).',
              'After analysis, preferences collapse into an Analyzed for bar—tap Change preferences to edit and re-run.',
              'Review the summary card, Top items to add, Wardrobe coverage dashboard (shirts through belts plus sweaters and jackets; ties appear for business, formal, or office), and expand Detailed category analysis for specifics.',
              'Tap a best color on any item card to search Google Shopping for that category and color. Use Shop similar for a broader search.',
              'Tap Shopping list to open a market-ready table with Buy labels, priority badges, human Look for guidance, and per style/color Search online chips.',
              'Use Copy list, Export to WhatsApp, or Export as PDF—the export uses numbered items with one focused Google Shopping link per row (no raw style/color tuples).',
            ]}
          />
          {isAdmin && (
            <TipBox>
              <strong className="text-white">Admin users:</strong> premium runs can include mode used, cost, full AI
              prompt, and full AI response inside the analysis panel.
            </TipBox>
          )}
        </SectionCard>

        <SectionCard
          id="wardrobe"
          icon="👔"
          title="Your digital wardrobe"
          subtitle="For signed-in users—organize clothes the AI can actually use."
          accent="blue"
        >
          <StepList
            items={[
              'Open the Wardrobe tab to browse shirts, trousers, blazers, shoes, and belts. When you own specific types—polo, T-shirt, jeans, shorts, sweater, jacket, coat, tie, and more—extra filter chips appear so you can narrow the list quickly. Blazers are structured layers; casual jackets and coats are tracked separately.',
              'Add items with the guided flow: we suggest category, color, and a description—edit anything before saving.',
              'Tap an item anytime to update details or swap the photo.',
              'For one saved piece, tap Style this item with AI to open Suggest with that item loaded—set preferences and tap Generate Outfit.',
              'To combine multiple pieces, use Complete an outfit from selected wardrobe pieces: tap Add to outfit completion on item cards (1 to 5 items). Core slots are shirt, trousers, blazer, shoes, and belt; jackets and coats count as outerwear, sweaters as layer. Choose only one of blazer, outerwear, or sweater at a time—one item per other slot.',
              'Expand Preferences on Wardrobe to set occasion, season, style, and notes—the same pickers as Suggest. Logged in? Toggle Use my wardrobe only if you want recommendations limited to saved items.',
              'Preferences on Wardrobe stay in sync with Suggest and Insights—change them inline without switching tabs first.',
              'Tap Complete outfit with AI when at least one item is selected. The AI keeps your picks and fills any missing slots.',
              'We warn you if a new photo looks like something you already saved—no accidental twins.',
            ]}
          />
          <TipBox>
            <strong className="text-white">Slot rules:</strong> pick one item per slot. You cannot select two shirts (or two of any slot). For upper body, choose only one of{' '}
            <span className="text-white font-medium">blazer, outerwear, or sweater</span>—so a blazer and a jacket cannot both be selected. If you try, you will see{' '}
            <span className="text-white font-medium">Choose only one of blazer, outerwear, or sweater</span> or{' '}
            <span className="text-white font-medium">Choose one item per outfit slot</span>. Your selection summary shows slots like{' '}
            <span className="text-white font-medium">2 selected: shirt, trousers</span>.
          </TipBox>
        </SectionCard>

        <SectionCard
          id="random-history"
          icon="🎲"
          title="Random picks & history"
          subtitle="Spice things up or revisit old favorites."
          accent="rose"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <p className="text-2xl mb-2" aria-hidden>
                🎲
              </p>
              <h3 className="font-semibold text-white mb-2">Random from Wardrobe</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                AI combines items from your wardrobe into a fresh outfit, using your Preferences (occasion,
                season, style, notes). Repeated taps aim for different looks within your session.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <p className="text-2xl mb-2" aria-hidden>
                📋
              </p>
              <h3 className="font-semibold text-white mb-2">Random from History</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Surfaces a past suggestion for instant inspiration—great when you are feeling indecisive.
                Repeated taps rotate through varied saved looks instead of showing the same outfit.
              </p>
            </div>
          </div>
          <p className="mt-5 text-slate-300">
            The <strong className="text-white">History</strong> tab is your timeline: search, refresh, delete entries,
            and tap images to view them full screen.
          </p>
        </SectionCard>

        <SectionCard
          id="account"
          icon="⚙️"
          title="Account & navigation"
          subtitle="Where to find settings and extras."
          accent="purple"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { k: 'Settings', d: 'Email, name, password, and a shortcut to your wardrobe.' },
              { k: 'Insights', d: 'Wardrobe Insights—gap score, priorities, coverage dashboard, and actionable buy-next cards.' },
              { k: 'Guide', d: 'Step-by-step help and tips (this page).' },
              { k: 'About', d: 'Product story, features, and creator links—open from the page footer.' },
              ...(isAdmin
                ? [{ k: 'Reports', d: 'Admins only—usage and access insights.' }]
                : []),
            ].map((row) => (
              <div
                key={row.k}
                className="flex gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3"
              >
                <span className="font-semibold text-brand-blue shrink-0 w-24">{row.k}</span>
                <span className="text-slate-400 text-sm">{row.d}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          id="pwa"
          icon="📲"
          title="Install like an app"
          subtitle="Progressive Web App (PWA)—home screen, full screen, faster return visits."
          accent="violet"
        >
          <p className="text-slate-300">
            On Chrome, Edge, or many Android browsers, look for <strong className="text-white">Install app</strong> or{' '}
            <strong className="text-white">Add to Home Screen</strong> in the menu (HTTPS sites only). The shell can
            load from cache offline; <strong className="text-white">new outfit ideas still need internet</strong> to
            reach the AI.
          </p>
        </SectionCard>

        <SectionCard
          id="tips"
          icon="💡"
          title="Tips & troubleshooting"
          subtitle="Small habits that improve your results."
          accent="blue"
        >
          <ul className="space-y-3">
            {[
              {
                key: 'light',
                body: 'Use bright, steady light and one clear subject—your AI “sees” what you show it.',
              },
              {
                key: 'upload',
                body: 'Upload failed? Check type (JPG/PNG/WebP) and size; shrink huge files and try again.',
              },
              {
                key: 'network',
                body: (
                  <>
                    Errors after tapping suggest? Check Wi‑Fi or data and that the backend is reachable. Custom sites
                    need{' '}
                    <code className="rounded-md bg-slate-800 px-1.5 py-0.5 text-xs text-brand-blue">
                      REACT_APP_API_URL
                    </code>{' '}
                    set when you build the frontend.
                  </>
                ),
              },
              {
                key: 'wardrobe',
                body: 'Wardrobe-only needs items in your closet first; an empty wardrobe may fall back to open suggestions.',
              },
              {
                key: 'premium',
                body: 'If AI Stylist Review cannot complete, the system may safely fall back to Quick Wardrobe Check. Check the review type line in results.',
              },
            ].map((row) => (
              <li
                key={row.key}
                className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <span className="text-brand-blue shrink-0" aria-hidden>
                  ✓
                </span>
                <span>{row.body}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-slate-500">
            Questions or ideas? Open <strong className="text-slate-400">About</strong> from the footer for links to the
            creator.
          </p>
        </SectionCard>
      </div>
    </div>
  );
};

export default UserGuide;
