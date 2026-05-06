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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/25 to-indigo-500/25 text-sm font-bold text-teal-200 ring-1 ring-white/10"
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
  accent: 'teal' | 'indigo' | 'violet' | 'rose';
  children: React.ReactNode;
}) {
  const accents = {
    teal: 'from-teal-500/20 to-teal-600/5 ring-teal-400/20',
    indigo: 'from-indigo-500/20 to-indigo-600/5 ring-indigo-400/20',
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
      className="group flex items-center gap-2.5 rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3 text-left text-sm font-medium text-slate-200 transition-all hover:border-teal-400/35 hover:bg-teal-500/10 hover:text-white hover:shadow-md hover:shadow-teal-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-lg transition-colors group-hover:bg-teal-500/20"
        aria-hidden
      >
        {icon}
      </span>
      <span className="flex-1 leading-snug">{label}</span>
      <span className="text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-300" aria-hidden>
        →
      </span>
    </a>
  );
}

const UserGuide: React.FC = () => {
  const toc = [
    { id: 'quick-start', label: 'Quick start', icon: '🚀' },
    { id: 'suggestion-flow', label: 'Get outfit suggestions', icon: '🎯' },
    { id: 'results', label: 'Your results', icon: '✨' },
    { id: 'wardrobe-analysis', label: 'Analyze my wardrobe', icon: '🧠' },
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
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-teal-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative px-6 py-12 sm:px-10 sm:py-14 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-teal-200/90 mb-6">
            <span aria-hidden>✨</span>
            Friendly walkthrough
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            How to use{' '}
            <span className="bg-gradient-to-r from-teal-300 to-indigo-300 bg-clip-text text-transparent">
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
          accent="teal"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 ring-1 ring-white/5">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-400/90 mb-2">No account needed</p>
              <p className="text-slate-300">
                Upload a clothing photo and tap <span className="text-white font-medium">Get AI outfit suggestion</span>.
                You will get a full outfit idea right away.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-5 ring-1 ring-indigo-400/10">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-2">With a free account</p>
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
          accent="indigo"
        >
          <StepList
            items={[
              'Stay on the Get Suggestion tab (it opens by default).',
              'Add a photo: tap the upload area, drag a file, or use Take Photo. We accept JPG, PNG, or WebP up to 10 MB.',
              'Open Preferences when you want: pick occasion, season, style, and add notes. Hover the section titles for a quick reminder of what is included.',
              'Logged in? In the Wardrobe block, switch Use my wardrobe only on to only mix pieces you own—or leave it off for fresh ideas from anywhere.',
              'If model image generation is on, you may see a short confirmation before the app creates a preview image.',
              'Press Get AI outfit suggestion and watch the right panel—your outfit appears when ready.',
            ]}
          />
          <TipBox>
            <strong className="text-white">From your wardrobe:</strong> if you start a suggestion from a saved item,
            that piece is loaded for you and the result stays linked to your pick.
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
              <span className="text-teal-400 font-bold shrink-0">•</span>
              <span>
                You will see <strong className="text-white">shirt, trousers, blazer, shoes, and belt</strong> with short
                descriptions. Small images may show your upload, items from your wardrobe, or an AI-only suggestion.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-teal-400 font-bold shrink-0">•</span>
              <span>
                <strong className="text-white">Why this works</strong> summarizes the styling logic in friendly language.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-teal-400 font-bold shrink-0">•</span>
              <span>
                <strong className="text-white">Like</strong>, <strong className="text-white">Dislike</strong>, and{' '}
                <strong className="text-white">Next suggestion</strong> work when you started from an uploaded photo.
                Some actions are limited for wardrobe-only flows without a new upload.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-teal-400 font-bold shrink-0">•</span>
              <span>
                Admins can toggle <strong className="text-white">Show AI Prompt &amp; Response</strong> in the sidebar
                to peek at technical details on outfit suggestions. Wardrobe analysis also surfaces admin diagnostics
                when premium metadata is available.
              </span>
            </li>
          </ul>
        </SectionCard>

        <SectionCard
          id="wardrobe-analysis"
          icon="🧠"
          title="Analyze My Wardrobe"
          subtitle="Find what you own, what you miss, and what to buy next."
          accent="indigo"
        >
          <StepList
            items={[
              'In Get Suggestion, set occasion, season, style, and optional notes in Preferences.',
              'Open the Wardrobe tab and click Analyze My Wardrobe in the header.',
              'Choose Free Analysis (rules-based) or Premium Analysis (ChatGPT-powered).',
              'The app locks during analysis and shows a progress message, similar to Get AI Suggestion.',
              'Review category cards for owned colors/styles, missing colors/styles, and buy-next recommendations.',
            ]}
          />
          <TipBox>
            <strong className="text-white">Admin users:</strong> premium runs can include mode used, cost, full AI
            prompt, and full AI response inside the analysis panel.
          </TipBox>
        </SectionCard>

        <SectionCard
          id="wardrobe"
          icon="👔"
          title="Your digital wardrobe"
          subtitle="For signed-in users—organize clothes the AI can actually use."
          accent="teal"
        >
          <StepList
            items={[
              'Open the Wardrobe tab to browse shirts, trousers, blazers, shoes, and belts.',
              'Add items with the guided flow: we suggest category, color, and a description—edit anything before saving.',
              'Tap an item anytime to update details or swap the photo.',
              'Use Get AI Suggestion on a piece to build a full outfit around that item.',
              'We warn you if a new photo looks like something you already saved—no accidental twins.',
            ]}
          />
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
                Builds an outfit from what you own, using your Preferences (occasion, season, style, notes).
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <p className="text-2xl mb-2" aria-hidden>
                📋
              </p>
              <h3 className="font-semibold text-white mb-2">Random from History</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Surfaces a past suggestion for instant inspiration—great when you are feeling indecisive.
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
          accent="indigo"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { k: 'Settings', d: 'Email, name, password, and a shortcut to your wardrobe.' },
              { k: 'Insights', d: 'Dedicated wardrobe gap analysis page with category recommendations.' },
              { k: 'Guide', d: 'Step-by-step help and tips (this page).' },
              { k: 'About', d: 'Product story, features, and creator links—open from the page footer.' },
              { k: 'Reports', d: 'Admins only—usage and access insights.' },
            ].map((row) => (
              <div
                key={row.k}
                className="flex gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3"
              >
                <span className="font-semibold text-teal-300 shrink-0 w-24">{row.k}</span>
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
          accent="teal"
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
                    <code className="rounded-md bg-slate-800 px-1.5 py-0.5 text-xs text-teal-200">
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
                body: 'If Premium Analysis cannot complete, the system may safely fall back to Free Analysis. Check the "Mode used" line in results.',
              },
            ].map((row) => (
              <li
                key={row.key}
                className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <span className="text-emerald-400 shrink-0" aria-hidden>
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
