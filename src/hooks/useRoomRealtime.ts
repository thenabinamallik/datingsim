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
  const [isConnected, setIsConnected] = useState(false);

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

  /* ──────── 5. Subscribe to messages (Firestore) ──────── */

  useEffect(() => {
    if (!roomId) return;

    const q = query(
      collection(firestore, "rooms", roomId, "messages"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs: RoomMessage[] = [];
        snap.forEach((d) => {
          const v = d.data();
          msgs.push({
            id: d.id,
            from: (v.from as string) || "",
            fromId: (v.fromId as string) || "",
            text: (v.text as string) || "",
            timestamp: (v.timestamp as number) || 0,
          });
        });
        setMessages(msgs.reverse());
      },
      (error) => {
        console.error("Messages subscription error:", error);
      }
    );

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
        await addDoc(collection(firestore, "rooms", roomId, "messages"), {
          from: currentUser.name,
          fromId: selfId,
          text: text.trim(),
          timestamp: Date.now(),
          ts: serverTimestamp(),
        });
      } catch {
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

  return {
    selfId,
    users,
    partner,
    messages,
    isConnected,
    updatePosition,
    sendMessage,
    updateName,
    updateEnvironment,
  };
}