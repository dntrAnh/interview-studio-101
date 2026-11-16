import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { RunResult, TimerState } from "./types";

export type SharedState = {
  language: string;
  hintsVisible: boolean;
  timer: TimerState;
  results: RunResult[] | null;
  runError: string | null;
};

export type Peer = { userId: string; name: string; role: string; color: string };

const COLORS = ["#f59e0b", "#22c55e", "#38bdf8", "#f472b6", "#a3e635", "#fb923c"];
const toB64 = (u: Uint8Array) => {
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]!);
  return btoa(s);
};
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function useRoom(opts: {
  sessionId: string;
  me: { id: string; name: string; role: string };
  initial: SharedState;
  initialCode: string;
}) {
  const { sessionId, me } = opts;
  const doc = useMemo(() => new Y.Doc(), [sessionId]);
  const ytext = useMemo(() => doc.getText("code"), [doc]);
  const awareness = useMemo(() => new Awareness(doc), [doc]);
  const [state, setStateRaw] = useState<SharedState>(opts.initial);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [peers, setPeers] = useState<Peer[]>([]);
  const [ready, setReady] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const initialCodeRef = useRef(opts.initialCode);
  const color = useMemo(() => COLORS[Math.abs(hash(me.id)) % COLORS.length]!, [me.id]);

  useEffect(() => {
    awareness.setLocalStateField("user", { name: me.name, color });
    const channel = supabase.channel(`session:${sessionId}`, {
      config: { broadcast: { self: false }, presence: { key: me.id } },
    });
    channelRef.current = channel;
    const send = (event: string, payload: Record<string, unknown>) =>
      channel.send({ type: "broadcast", event, payload });

    const onDoc = (update: Uint8Array, origin: unknown) => {
      if (origin !== "remote") send("y", { u: toB64(update) });
    };
    const onAw = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
      if (origin === "remote") return;
      send("aw", { u: toB64(encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed])) });
    };
    doc.on("update", onDoc);
    awareness.on("update", onAw);

    channel
      .on("broadcast", { event: "y" }, ({ payload }) => Y.applyUpdate(doc, fromB64(payload.u), "remote"))
      .on("broadcast", { event: "aw" }, ({ payload }) => applyAwarenessUpdate(awareness, fromB64(payload.u), "remote"))
      .on("broadcast", { event: "state" }, ({ payload }) => setStateRaw(payload.state as SharedState))
      .on("broadcast", { event: "sync-req" }, ({ payload }) => {
        send("y", { u: toB64(Y.encodeStateAsUpdate(doc, fromB64(payload.sv))) });
        send("aw", { u: toB64(encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys()))) });
        send("state", { state: stateRef.current });
      })
      .on("presence", { event: "sync" }, () => {
        const ps = channel.presenceState<Peer>();
        setPeers(Object.values(ps).map((arr) => arr[0]).filter((p): p is NonNullable<typeof p> => !!p));
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({ userId: me.id, name: me.name, role: me.role, color });
        send("sync-req", { sv: toB64(Y.encodeStateVector(doc)) });
        // If nobody answered with content, seed from the last saved code.
        setTimeout(() => {
          const others = Object.keys(channel.presenceState()).filter((k) => k !== me.id);
          if (ytext.length === 0 && others.length === 0 && initialCodeRef.current) {
            ytext.insert(0, initialCodeRef.current);
          }
          setReady(true);
        }, 900);
      });

    return () => {
      doc.off("update", onDoc);
      awareness.off("update", onAw);
      removeAwarenessStates(awareness, [doc.clientID], "local");
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId, me.id, me.name, me.role, color, doc, ytext, awareness]);

  const setState = useCallback((patch: Partial<SharedState>) => {
    const next = { ...stateRef.current, ...patch };
    stateRef.current = next;
    setStateRaw(next);
    channelRef.current?.send({ type: "broadcast", event: "state", payload: { state: next } });
  }, []);

  return { doc, ytext, awareness, state, setState, peers, ready };
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
