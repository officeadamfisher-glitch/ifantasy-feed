/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — the three ways a feed stops

   EndCard   — you reached the bottom and there were some
   EmptyCard — there were none to begin with
   ErrorCard — we could not ask

   These are the most important screens in the product at launch, and the
   ones every feed forgets to design. With thin supply most sessions end
   here, and an infinite loop of the same nine people is the fastest
   possible way to be caught being small.

   The rule underneath all three: say the real number. A short feed that
   states its own size reads as a standard being kept. A short feed that
   hides its size reads as a ghost town.
   ══════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { useFeed } from './FeedProvider';
import { nextBand, bandLabel as label, unitsFor } from './bands';
import type { DistanceBand } from './types';

export { nextBand };

function bandLabel(b: DistanceBand): string {
  return label(b, unitsFor(null)).toLowerCase();
}

/* ════════════════════════════════════════════════════════════════════ */

export function EndCard() {
  const { total, config, decisions, widerTotal } = useFeed();
  const wider = nextBand(config.band);

  return (
    <Shell mark="—">
      <h2>
        {wider
          ? `That's everyone verified ${bandLabel(config.band)}.`
          : "That's everyone verified, anywhere."}
      </h2>
      <p>
        {total} {total === 1 ? 'person' : 'people'}. We don&rsquo;t pad the feed
        with listings nobody has checked.
      </p>

      {wider && config.onBandChange ? (
        <Option
          icon="&#8853;"
          title={`Widen to ${bandLabel(wider)}`}
          /* Only ever a real number. If the server did not send one, the
             line simply does not claim one. */
          note={
            typeof widerTotal === 'number'
              ? `Another ${widerTotal} verified`
              : undefined
          }
          onClick={() => config.onBandChange!(wider)}
        />
      ) : null}

      {decisions.passCount > 0 ? (
        <Option
          icon="&#8635;"
          title="Bring back the ones you passed"
          note={`${decisions.passCount} hidden. Clears your passes, keeps your saves.`}
          onClick={decisions.flush}
        />
      ) : null}

      <NotifyOption />

      <p className="fd__fine">
        Order rotates daily. Position here is never for sale.
      </p>
    </Shell>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

export function EmptyCard() {
  const { config, decisions, widerTotal } = useFeed();
  const wider = nextBand(config.band);

  return (
    <Shell mark="—">
      <h2>Nobody verified here yet.</h2>
      <p>
        We&rsquo;re new, and we won&rsquo;t pad the directory with listings we
        haven&rsquo;t checked. Everyone who appears here has proved who they
        are first.
      </p>

      {wider && config.onBandChange ? (
        <Option
          icon="&#8853;"
          title={`Try ${bandLabel(wider)}`}
          note={
            typeof widerTotal === 'number'
              ? `${widerTotal} verified`
              : undefined
          }
          onClick={() => config.onBandChange!(wider)}
        />
      ) : null}

      {decisions.passCount > 0 ? (
        <Option
          icon="&#8635;"
          title="Bring back the ones you passed"
          note={`${decisions.passCount} hidden`}
          onClick={decisions.flush}
        />
      ) : null}

      <NotifyOption />

      <a className="fd__endlink" href={config.directoryUrl}>
        Browse the full directory instead
      </a>
    </Shell>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

export function ErrorCard() {
  const { retry, config } = useFeed();

  return (
    <Shell mark="—">
      <h2>We can&rsquo;t reach the feed right now.</h2>
      {/* Never "something went wrong" — it tells the person nothing and
          implies they might have caused it. */}
      <p>This is on us, not you. It is usually over in a moment.</p>

      <Option icon="&#8635;" title="Try again" onClick={retry} />

      <a className="fd__endlink" href={config.directoryUrl}>
        Open the directory
      </a>
    </Shell>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

function NotifyOption() {
  const { config } = useFeed();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>(
    'idle'
  );

  /* No handler means no form. A dead field that swallows an address is
     worse than not asking. */
  if (!config.onNotify) return null;

  if (state === 'done') {
    return (
      <p className="fd__done">
        We&rsquo;ll tell you when someone verifies nearby. Nothing else.
      </p>
    );
  }

  if (!open) {
    return (
      <Option
        icon="&#9906;"
        title="Tell me when someone new verifies"
        note="Near you. No other email, ever."
        onClick={() => setOpen(true)}
      />
    );
  }

  const submit = async () => {
    if (!/.+@.+\..+/.test(email)) {
      setState('failed');
      return;
    }
    setState('sending');
    try {
      await config.onNotify!(email);
      setState('done');
    } catch {
      setState('failed');
    }
  };

  return (
    <div className="fd__notify" data-no-drag>
      <label className="fd__sr" htmlFor="fd-notify">
        Your email
      </label>
      <input
        id="fd-notify"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === 'failed') setState('idle');
        }}
        aria-invalid={state === 'failed'}
      />
      <button onClick={submit} disabled={state === 'sending'}>
        {state === 'sending' ? '…' : 'Tell me'}
      </button>
      {state === 'failed' ? (
        <span className="fd__err">
          That address doesn&rsquo;t look right. Try again.
        </span>
      ) : null}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

function Shell({
  mark,
  children,
}: {
  mark: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fd__endmark" aria-hidden="true">
        {mark}
      </div>
      {children}
    </>
  );
}

function Option({
  icon,
  title,
  note,
  onClick,
}: {
  icon: string;
  title: string;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button className="fd__endopt" onClick={onClick} data-no-drag>
      <i aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon }} />
      <span>
        <strong>{title}</strong>
        {note ? <em>{note}</em> : null}
      </span>
    </button>
  );
}
