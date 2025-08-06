import { useEffect, useMemo, useRef, useState } from "react";
import { app } from "@/integrations/firebase/client";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp, onSnapshot, collection, query, where, getCountFromServer, deleteDoc, addDoc, orderBy, limit, writeBatch } from "firebase/firestore";
import { toast } from "@/components/ui/use-toast";

export type RoomUser = {
  id: string;
  name: string;
  gender: 'male' | 'female';
  x: number;
  y: number;
  z: number;
  ry: number;
  updatedAt: number;
  currentEnvironment?: 'tea' | 'village';
};

export type RoomMessage = {
  id: string;
  from: string;
  text: string;
  timestamp: number;
};

export function useRoomRealtime(roomId: string | undefined, name: string, gender: 'male' | 'female') {
  const [selfId, setSelfId] = useState<string | null>(null);
  const [users, setUsers] = useState<Record<string, RoomUser>>({});
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const authRef = useRef(getAuth(app));
  const dbRef = useRef(getFirestore(app));
  const presenceDocPath = (uid: string) => doc(dbRef.current, "rooms", roomId!, "presence", uid);
  const cleanupRef = useRef<(() => Promise<void>) | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isLeavingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  // Generate unique session ID
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  // Test Firebase connection
  useEffect(() => {
    if (!roomId) return;
    
    const testConnection = async () => {
      try {
        const db = dbRef.current;
        const testDoc = doc(db, "test", "connection");
        await setDoc(testDoc, { timestamp: Date.now() }, { merge: true });
        await deleteDoc(testDoc);
      } catch (e) {
        toast({ description: "Firebase connection failed. Check your internet connection." });
      }
    };
    
    testConnection();
  }, [roomId]);

  // Sign in anonymously
  useEffect(() => {
    if (!roomId || !name) return;
    
    const auth = authRef.current;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try {
          const result = await signInAnonymously(auth);
        } catch (e) {
          toast({ description: "Failed to sign in anonymously. Check Firebase config." });
        }
        return;
      }
      setSelfId(u.uid);
      setIsConnected(true);
    });
    return () => unsub();
  }, [roomId, name, gender]);

  // Enforce 2 users and set presence
  useEffect(() => {
    if (!roomId || !name || !selfId || !sessionIdRef.current) return;
    
    const db = dbRef.current;
    const uniqueUserId = `${selfId}-${sessionIdRef.current}`;

    (async () => {
      try {
        // First, check if we're already in the room
        const existingDoc = presenceDocPath(uniqueUserId);
        const existingSnap = await existingDoc.get();
        
        if (existingSnap.exists()) {
          await setDoc(existingDoc, {
            name,
            gender,
            updatedAt: Date.now(),
            ts: serverTimestamp(),
          }, { merge: true });
        } else {
          // Count current presence docs
          const q = query(collection(db, "rooms", roomId, "presence"));
          const snap = await getCountFromServer(q);
          const count = snap.data().count;
          
          if (count >= 2) {
            toast({ description: "Room is full (2 people max)." });
            return;
          }
          
          // Add new user to room with unique ID
          await setDoc(existingDoc, {
            name,
            gender,
            x: 0, y: 0.35, z: 0, ry: 0,
            updatedAt: Date.now(),
            ts: serverTimestamp(),
          });
        }

        // Cleanup function
        const cleanup = async () => {
          if (isLeavingRef.current) return;
          isLeavingRef.current = true;
          
          try { 
            await deleteDoc(presenceDocPath(uniqueUserId)); 
          } catch (e) {
            console.error("Cleanup error:", e);
          }
        };
        
        cleanupRef.current = cleanup;
        
        // Handle page unload
        const handleBeforeUnload = () => {
          cleanup();
        };
        
        // Handle tab visibility change
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
            // User switched tabs or minimized, but don't remove them yet
          }
        };
        
        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        
      } catch (e) {
        toast({ description: "Failed to join room. Check connectivity." });
      }
    })();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [roomId, name, gender, selfId]);

  // Heartbeat to keep user active
  useEffect(() => {
    if (!roomId || !selfId || !isConnected || !sessionIdRef.current) return;
    
    const uniqueUserId = `${selfId}-${sessionIdRef.current}`;
    
    const sendHeartbeat = async () => {
      if (isLeavingRef.current) return;
      
      try {
        await setDoc(presenceDocPath(uniqueUserId), {
          updatedAt: Date.now(),
        }, { merge: true });
      } catch (e) {
        console.error("Heartbeat error:", e);
      }
    };

    // Send heartbeat every 10 seconds
    heartbeatRef.current = setInterval(sendHeartbeat, 10000);
    
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [roomId, selfId, isConnected]);

  // Subscribe to presence and enforce max 2 live
  useEffect(() => {
    if (!roomId) return;
    
    const db = dbRef.current;
    const col = collection(db, "rooms", roomId, "presence");
    const unsub = onSnapshot(col, (snap) => {
      const map: Record<string, RoomUser> = {};
      
      snap.forEach((d) => {
        const v = d.data() as any;
        console.log("Presence doc:", d.id, "environment:", v.currentEnvironment);
        
        // Only include users that have been active in the last 30 seconds
        const now = Date.now();
        const lastUpdate = v.updatedAt || 0;
        if (now - lastUpdate < 30000) { // 30 seconds
          map[d.id] = {
            id: d.id,
            name: v.name || "",
            gender: v.gender || 'male',
            x: v.x ?? 0, y: v.y ?? 0.35, z: v.z ?? 0, ry: v.ry ?? 0,
            updatedAt: v.updatedAt ?? 0,
            currentEnvironment: v.currentEnvironment || 'village',
          };
          console.log("Added user to map:", d.id, "environment:", map[d.id].currentEnvironment);
        } else {
          // Remove stale user
          deleteDoc(doc(db, "rooms", roomId, "presence", d.id)).catch(console.error);
        }
      });
      
      const ids = Object.keys(map);
      
      if (ids.length > 2) {
        // If more than 2, remove the extra non-self if possible (client-side guard)
        const selfUniqueId = sessionIdRef.current ? `${selfId}-${sessionIdRef.current}` : selfId;
        const extras = ids.filter((id) => id !== selfUniqueId).slice(1);
        extras.forEach(async (id) => {
          try { await deleteDoc(doc(db, "rooms", roomId, "presence", id)); } catch {}
        });
        toast({ description: "Room is full (2 people max)." });
      }
      setUsers(map);
    }, (error) => {
      toast({ description: "Lost connection to room. Trying to reconnect..." });
    });
    return () => unsub();
  }, [roomId, selfId]);

  // Subscribe to messages
  useEffect(() => {
    if (!roomId) return;
    
    const db = dbRef.current;
    const messagesQuery = query(
      collection(db, "rooms", roomId, "messages"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    
    const unsub = onSnapshot(messagesQuery, (snap) => {
      const newMessages: RoomMessage[] = [];
      snap.forEach((d) => {
        const v = d.data() as any;
        newMessages.push({
          id: d.id,
          from: v.from || "",
          text: v.text || "",
          timestamp: v.timestamp || 0,
        });
      });
      // Sort by timestamp ascending for display
      setMessages(newMessages.reverse());
    }, (error) => {
      console.error("Messages subscription error:", error);
    });
    
    return () => unsub();
  }, [roomId]);

  const partner = useMemo(() => {
    if (!selfId || !sessionIdRef.current) {
      return null;
    }
    
    const selfUniqueId = `${selfId}-${sessionIdRef.current}`;
    const entries = Object.values(users).filter((u) => u.id !== selfUniqueId);
    
    if (entries.length > 0) {
      return entries[0];
    } else {
      return null;
    }
  }, [users, selfId]);

  const updatePosition = async (x: number, y: number, z: number, ry: number) => {
    if (!roomId || !selfId || !sessionIdRef.current) return;
    const db = dbRef.current;
    const uniqueUserId = `${selfId}-${sessionIdRef.current}`;
    try {
      await setDoc(presenceDocPath(uniqueUserId), { x, y, z, ry, updatedAt: Date.now() }, { merge: true });
    } catch (e) {
      console.error("Position update error:", e);
    }
  };

  const sendMessage = async (text: string) => {
    if (!roomId || !selfId || !text.trim() || !sessionIdRef.current) return;
    const db = dbRef.current;
    const uniqueUserId = `${selfId}-${sessionIdRef.current}`;
    const currentUser = users[uniqueUserId];
    
    if (!currentUser) {
      toast({ description: "User not found. Please refresh the page." });
      return;
    }
    
    try {
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        from: currentUser.name,
        text: text.trim(),
        timestamp: Date.now(),
        ts: serverTimestamp(),
      });
    } catch (e) {
      console.error("Send message error:", e);
      toast({ description: "Failed to send message. Check connectivity." });
    }
  };

  const updateName = async (newName: string) => {
    if (!roomId || !selfId || !newName.trim() || !sessionIdRef.current) return;
    const db = dbRef.current;
    const uniqueUserId = `${selfId}-${sessionIdRef.current}`;
    try {
      await setDoc(presenceDocPath(uniqueUserId), { 
        name: newName.trim(), 
        updatedAt: Date.now() 
      }, { merge: true });
    } catch (e) {
      console.error("Name update error:", e);
      toast({ description: "Failed to update name. Check connectivity." });
    }
  };

  const updateGender = async (newGender: 'male' | 'female') => {
    if (!roomId || !selfId || !sessionIdRef.current) return;
    const db = dbRef.current;
    const uniqueUserId = `${selfId}-${sessionIdRef.current}`;
    try {
      await setDoc(presenceDocPath(uniqueUserId), { 
        gender: newGender, 
        updatedAt: Date.now() 
      }, { merge: true });
    } catch (e) {
      console.error("Gender update error:", e);
      toast({ description: "Failed to update gender. Check connectivity." });
    }
  };

  const updateEnvironment = async (environment: 'tea' | 'village') => {
    if (!roomId || !selfId || !sessionIdRef.current) return;
    const db = dbRef.current;
    const uniqueUserId = `${selfId}-${sessionIdRef.current}`;
    try {
      console.log("Updating environment for user:", uniqueUserId, "to:", environment);
      await setDoc(presenceDocPath(uniqueUserId), { 
        currentEnvironment: environment, 
        updatedAt: Date.now() 
      }, { merge: true });
      console.log("Environment updated successfully");
    } catch (e) {
      console.error("Environment update error:", e);
      toast({ description: "Failed to update environment. Check connectivity." });
    }
  };

  return { 
    selfId, 
    users, 
    partner, 
    messages,
    isConnected,
    updatePosition, 
    sendMessage,
    updateName,
    updateGender,
    updateEnvironment
  };
}