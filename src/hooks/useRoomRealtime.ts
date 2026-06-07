import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { rtdb, firestore, auth } from "@/integrations/firebase/client";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  ref,
  set,
  update,
  onValue,
  onDisconnect,
  remove,
  get,
} from "firebase/database";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "@/components/ui/use-toast";

export type RoomUser = {
  id: string;
  name: string;
  gender: "male" | "female";
  x: number;
  y: number;
  z: number;
  ry: number;
  updatedAt: number;
  currentEnvironment?: "tea" | "village" | "memories";
};

export type RoomMessage = {
  id: string;
  from: string;
  fromId?: string;
  text: string;
  timestamp: number;
};

export type PlayerState = {
  url: string;
  isPlaying: boolean;
  position: number;
  updatedAt: number;
  updatedBy: string;
};


/**
 * Real-time room hook.
 *
 * Presence & position → Firebase Realtime Database (unlimited free writes).
 * Messages → Firestore (low-volume, benefits from queries).
 * Disconnect cleanup → RTDB onDisconnect (automatic, no heartbeat needed).
 */
export function useRoomRealtime(
  roomId: string | undefined,
  name: string,
  gender: "male" | "female"
) {
  const [selfId, setSelfId] = useState<string | null>(null);
  const [users, setUsers] = useState<Record<string, RoomUser>>({});
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ping, setPing] = useState<number | null>(null);

  // Refs so the join-room effect can read current values without re-running
  const nameRef = useRef(name);
  const genderRef = useRef(gender);
  nameRef.current = name;
  genderRef.current = gender;

  /* ──────────────────────── 1. Auth ──────────────────────── */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          await signInAnonymously(auth);
        } catch {
          toast({ description: "Auth failed. Check Firebase config." });
        }
        return;
      }
      // Append a random session ID so testing in two tabs of the same browser works
      setSelfId(`${u.uid}_${Math.random().toString(36).slice(2, 7)}`);
    });
    return () => unsub();
  }, []);

  /* ──────────────── 2. Join Room (RTDB presence) ──────────────── */

  useEffect(() => {
    if (!roomId || !selfId) return;

    let cancelled = false;
    const presenceRef = ref(rtdb, `rooms/${roomId}/presence/${selfId}`);

    const joinRoom = async () => {
      try {
        const roomRef = ref(rtdb, `rooms/${roomId}/presence`);
        const snap = await get(roomRef);
        const data = snap.val() || {};
        const others = Object.keys(data).filter((id) => id !== selfId);

        if (others.length >= 2) {
          toast({ description: "Room is full (2 people max)." });
          return;
        }

        if (cancelled) return;

        let initialEnv = "village";
        if (others.length > 0) {
          const partnerId = others[0];
          initialEnv = data[partnerId].currentEnvironment || "village";
        }

        await set(presenceRef, {
          name: nameRef.current,
          gender: genderRef.current,
          x: 0,
          y: 0.35,
          z: 0,
          ry: 0,
          updatedAt: Date.now(),
          currentEnvironment: initialEnv,
        });

        // Firebase will auto-remove this data on disconnect (tab close, network loss, etc.)
        await onDisconnect(presenceRef).remove();

        if (!cancelled) setIsConnected(true);
      } catch (e) {
        console.error("Join room error:", e);
        toast({ description: "Failed to join room. Check connectivity." });
      }
    };

    joinRoom();

    const handleUnload = () => {
      remove(presenceRef).catch(() => {});
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", handleUnload);
      remove(presenceRef).catch(() => {});
      setIsConnected(false);
    };
  }, [roomId, selfId]);

  /* ──────── 2.5. Ping measurement (RTDB latency) ──────── */

  useEffect(() => {
    if (!isConnected || !roomId || !selfId) return;

    const pingRef = ref(rtdb, `rooms/${roomId}/ping/${selfId}`);
    onDisconnect(pingRef).remove().catch(() => {});

    const interval = setInterval(async () => {
      const start = performance.now();
      try {
        await set(pingRef, Date.now());
        const latency = Math.round(performance.now() - start);
        setPing(latency);
      } catch {
        // ignore
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      remove(pingRef).catch(() => {});
    };
  }, [isConnected, roomId, selfId]);

  /* ──────── 3. Sync profile changes without re-joining ──────── */

  useEffect(() => {
    if (!roomId || !selfId || !isConnected) return;
    update(ref(rtdb, `rooms/${roomId}/presence/${selfId}`), {
      name,
      gender,
      updatedAt: Date.now(),
    }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, gender]);

  /* ──────── 4. Subscribe to presence (all users in room) ──────── */

  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(rtdb, `rooms/${roomId}/presence`);
    const unsub = onValue(
      roomRef,
      (snap) => {
        const data = snap.val();
        if (!data) {
          setUsers({});
          return;
        }

        const map: Record<string, RoomUser> = {};
        Object.entries(data).forEach(([id, v]: [string, any]) => {
          map[id] = {
            id,
            name: v.name || "",
            gender: v.gender || "male",
            x: v.x ?? 0,
            y: v.y ?? 0.35,
            z: v.z ?? 0,
            ry: v.ry ?? 0,
            updatedAt: v.updatedAt ?? 0,
            currentEnvironment: v.currentEnvironment || "village",
          };
        });

        setUsers(map);
      },
      (error) => {
        console.error("Presence subscription error:", error);
        toast({ description: "Lost connection to room." });
      }
    );

    return () => unsub();
  }, [roomId]);

  /* ──────── 5. Subscribe to messages (RTDB for ultra-low latency) ──────── */

  useEffect(() => {
    if (!roomId) return;

    const messagesRef = ref(rtdb, `rooms/${roomId}/messages`);
    const unsub = onValue(
      messagesRef,
      (snap) => {
        const data = snap.val();
        if (!data) {
          setMessages([]);
          return;
        }

        const msgs: RoomMessage[] = Object.entries(data).map(([id, v]: [string, any]) => ({
          id,
          from: v.from || "",
          fromId: v.fromId || "",
          text: v.text || "",
          timestamp: v.timestamp || 0,
        }));
        
        // Sort by timestamp ascending
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgs);
      },
      (error) => {
        console.error("Messages subscription error:", error);
      }
    );

    return () => unsub();
  }, [roomId]);

  /* ──────── 6. Subscribe to player state ──────── */

  useEffect(() => {
    if (!roomId) return;

    const playerRef = ref(rtdb, `rooms/${roomId}/player`);
    const unsub = onValue(playerRef, (snap) => {
      const data = snap.val();
      if (!data) {
        setPlayerState(null);
        return;
      }
      setPlayerState({
        url: data.url || "",
        isPlaying: data.isPlaying || false,
        position: data.position || 0,
        updatedAt: data.updatedAt || 0,
        updatedBy: data.updatedBy || "",
      });
    });

    return () => unsub();
  }, [roomId]);

  /* ──────── Derived: partner ──────── */

  const partner = useMemo(() => {
    if (!selfId) return null;
    const others = Object.values(users).filter((u) => u.id !== selfId);
    return others[0] || null;
  }, [users, selfId]);

  /* ──────── Actions ──────── */

  const updatePosition = useCallback(
    async (x: number, y: number, z: number, ry: number) => {
      if (!roomId || !selfId) return;
      await update(ref(rtdb, `rooms/${roomId}/presence/${selfId}`), {
        x,
        y,
        z,
        ry,
        updatedAt: Date.now(),
      }).catch(() => {});
    },
    [roomId, selfId]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!roomId || !selfId || !text.trim()) return;
      const currentUser = users[selfId];
      if (!currentUser) {
        toast({ description: "Not connected yet. Try again." });
        return;
      }

      try {
        const msgId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const msgRef = ref(rtdb, `rooms/${roomId}/messages/${msgId}`);
        await set(msgRef, {
          from: currentUser.name,
          fromId: selfId,
          text: text.trim(),
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error("Failed to send message:", e);
        toast({ description: "Failed to send message." });
      }
    },
    [roomId, selfId, users]
  );

  const updateName = useCallback(
    async (newName: string) => {
      if (!roomId || !selfId || !newName.trim()) return;
      await update(ref(rtdb, `rooms/${roomId}/presence/${selfId}`), {
        name: newName.trim(),
        updatedAt: Date.now(),
      }).catch(() => {});
    },
    [roomId, selfId]
  );



  const updateEnvironment = useCallback(
    async (env: "tea" | "village" | "memories") => {
      if (!roomId || !selfId) return;
      await update(ref(rtdb, `rooms/${roomId}/presence/${selfId}`), {
        currentEnvironment: env,
        updatedAt: Date.now(),
      }).catch(() => {});
    },
    [roomId, selfId]
  );

  const updatePlayer = useCallback(
    async (newState: Partial<Omit<PlayerState, "updatedAt" | "updatedBy">>) => {
      if (!roomId || !selfId) return;
      
      // Get current state to merge
      const playerRef = ref(rtdb, `rooms/${roomId}/player`);
      const snap = await get(playerRef);
      const current = snap.val() || {};
      
      await update(playerRef, {
        ...current,
        ...newState,
        updatedAt: Date.now(),
        updatedBy: selfId,
      }).catch(() => {});
    },
    [roomId, selfId]
  );

  return {
    selfId,
    users,
    partner,
    messages,
    playerState,
    isConnected,
    ping,
    updatePosition,
    sendMessage,
    updateName,
    updateEnvironment,
    updatePlayer,
  };
}