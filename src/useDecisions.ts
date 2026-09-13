/* ══════════════════════════════════════════════════════════════════════
   @ifantasy/feed — useDecisions

   Saves and passes. Both device-local.

   The rule that shapes this whole file
   ────────────────────────────────────
   Passes are never sent to a server. Not as an event, not as a count,
   not anonymised, not aggregated. A record of who was rejected and how
   often is precisely the data that damages the people this platform
   exists to protect, and it is the first thing anyone will add because
   it looks obviously useful.

   Keeping passes on the device makes that guarantee structural rather
   than a policy someone later optimises away.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keys, readList, writeList, readFlag, writeFlag, isEphemeral } from './storage';
import type { ProductId } from './types';

export interface Decisions {
  /** Saved ids, newest first. */
  saves: string[];
  isSaved: (id: string) => boolean;
  /** Idempotent. Swiping right twice leaves it saved. */
  save: (id: string) => void;
  /** Only the button unsaves. The gesture never does — see note below. */
  unsave: (id: string) => void;
  toggleSave: (id: string) => void;

  isPassed: (id: string) => boolean;
  pass: (id: string) => void;
  undoPass: (id: string) => void;
  passCount: number;

  /** Clears passes, keeps saves. */
  flush: () => void;

  /** Ids passed before this session began. These are filtered out of pages. */
  hiddenIds: Set<string>;

  /** Saves exist but there is no account yet. Show the banner once. */
  showSavedNotice: boolean;
  dismissSavedNotice: () => void;

  /** Storage is not persisting — private browsing or a blocked store. */
  ephemeral: boolean;

  /** For the one-tap migration when Identity ships. */
  exportSaves: () => string[];
}

export function useDecisions(product: ProductId, onFlush?: () => void): Decisions {
  const [saves, setSaves] = useState<string[]>(() => readList(keys.saves(product)));
  const [passes, setPasses] = useState<string[]>(() => readList(keys.passes(product)));
  const [noticeSeen, setNoticeSeen] = useState<boolean>(() =>
    readFlag(keys.savedNotice(product))
  );

  /* ── the snapshot rule ──────────────────────────────────────────────
     Pages are filtered against the passes that existed when the session
     started — not against the live set.

     Filtering live would remove a card from the list the instant someone
     passes it, which changes the scroll geometry under their thumb: the
     feed jumps, and the person they were about to look at is gone. So a
     card passed during this session stays exactly where it is, marked
     and undoable, and simply does not come back next time.
     ──────────────────────────────────────────────────────────────── */
  const snapshot = useRef<Set<string>>(new Set(readList(keys.passes(product))));

  useEffect(() => {
    setSaves(readList(keys.saves(product)));
    setPasses(readList(keys.passes(product)));
    setNoticeSeen(readFlag(keys.savedNotice(product)));
    snapshot.current = new Set(readList(keys.passes(product)));
  }, [product]);

  const persistSaves = useCallback(
    (next: string[]) => {
      setSaves(next);
      writeList(keys.saves(product), next);
    },
    [product]
  );

  const persistPasses = useCallback(
    (next: string[]) => {
      setPasses(next);
      writeList(keys.passes(product), next);
    },
    [product]
  );

  const savedSet = useMemo(() => new Set(saves), [saves]);
  const passedSet = useMemo(() => new Set(passes), [passes]);

  const save = useCallback(
    (id: string) => {
      if (savedSet.has(id)) return; // idempotent
      persistSaves([id, ...saves]); // newest first
    },
    [savedSet, saves, persistSaves]
  );

  const unsave = useCallback(
    (id: string) => persistSaves(saves.filter((s) => s !== id)),
    [saves, persistSaves]
  );

  const toggleSave = useCallback(
    (id: string) => (savedSet.has(id) ? unsave(id) : save(id)),
    [savedSet, save, unsave]
  );

  const pass = useCallback(
    (id: string) => {
      if (passedSet.has(id)) return;
      persistPasses([...passes, id]);
    },
    [passedSet, passes, persistPasses]
  );

  const undoPass = useCallback(
    (id: string) => {
      persistPasses(passes.filter((p) => p !== id));
      snapshot.current.delete(id);
    },
    [passes, persistPasses]
  );

  const flush = useCallback(() => {
    persistPasses([]);
    snapshot.current = new Set();
    onFlush?.();
  }, [persistPasses, onFlush]);

  const dismissSavedNotice = useCallback(() => {
    setNoticeSeen(true);
    writeFlag(keys.savedNotice(product));
  }, [product]);

  return {
    saves,
    isSaved: (id) => savedSet.has(id),
    save,
    unsave,
    toggleSave,
    isPassed: (id) => passedSet.has(id),
    pass,
    undoPass,
    passCount: passes.length,
    flush,
    hiddenIds: snapshot.current,
    showSavedNotice: saves.length > 0 && !noticeSeen,
    dismissSavedNotice,
    ephemeral: isEphemeral(),
    exportSaves: () => [...saves],
  };
}
