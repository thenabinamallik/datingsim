import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import TeaScene from "@/components/TeaScene";
import VillageScene from "@/components/VillageScene";
import MemoriesScene from "@/components/MemoriesScene";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { toast } from "@/components/ui/use-toast";
import usersData from "@/data/users.json";

const QUICK_MESSAGES = [
  "Hey there! 👋",
  "You look amazing! ✨",
  "I love this place! ❤️",
  "Let's explore! 🏡",
  "Shall we have tea? 🍵",
  "Look at this picture! 🌸",
  "So happy to be here with you! 🥰",
  "You make my heart skip a beat! 💓",
];

export default function Room() {
  const { roomId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const secretId = search.get("id");
  const userData = secretId && secretId in usersData ? (usersData as any)[secretId] : null;

  useEffect(() => {
    if (!secretId || !userData) {
      navigate("/");
    }
  }, [secretId, userData, navigate]);

  const initialName = userData?.name ?? "";
  const initialGender = (userData?.gender as "male" | "female") ?? "male";

  const [you, setYou] = useState(initialName);
  const [gender, setGender] = useState<"male" | "female">(initialGender);
  const [message, setMessage] = useState("");
  const [currentEnvironment, setCurrentEnvironment] = useState<
    "tea" | "village" | "memories"
  >("village");
  const [isChangingEnvironment, setIsChangingEnvironment] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [youLatestMsg, setYouLatestMsg] = useState<string | undefined>();
  const [partnerLatestMsg, setPartnerLatestMsg] = useState<string | undefined>();

  const {
    selfId,
    partner: partnerUser,
    messages,
    users,
    isConnected,
    ping,
    updatePosition,
    sendMessage,
    updateName,
    updateEnvironment,
  } = useRoomRealtime(roomId, you, gender);

  /* ── Auto-scroll chat ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Track latest message for 3D speech bubbles ── */
  const lastMsgId =
    messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    if (!lastMsgId || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    const isSelf = latest.fromId
      ? latest.fromId === selfId
      : latest.from === you;

    if (isSelf) {
      setYouLatestMsg(latest.text);
    } else {
      setPartnerLatestMsg(latest.text);
    }

    const timer = setTimeout(() => {
      if (isSelf) setYouLatestMsg(undefined);
      else setPartnerLatestMsg(undefined);
    }, 8000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMsgId]);

  /* ── Sync environment with partner ── */
  useEffect(() => {
    if (
      partnerUser?.currentEnvironment &&
      partnerUser.currentEnvironment !== currentEnvironment &&
      !isChangingEnvironment
    ) {
      setCurrentEnvironment(partnerUser.currentEnvironment);
      updateEnvironment(partnerUser.currentEnvironment);
    }
  }, [
    partnerUser?.currentEnvironment,
    currentEnvironment,
    isChangingEnvironment,
    updateEnvironment,
  ]);

  useEffect(() => {
    if (isConnected && !currentEnvironment) {
      setCurrentEnvironment("village");
      updateEnvironment("village");
    }
  }, [isConnected, currentEnvironment, updateEnvironment]);

  useEffect(() => {
    document.title = `Hangout — ${roomId ?? "room"}`;
  }, [roomId]);

  /* ── Handlers ── */

  const send = async () => {
    if (!message.trim() || !you) return;
    await sendMessage(message.trim());
    setMessage("");
  };

  const handleNameChange = async (newName: string) => {
    setYou(newName);
    await updateName(newName);
  };



  const handleEnvironmentChange = async (
    environment: "tea" | "village" | "memories"
  ) => {
    if (isChangingEnvironment) return;
    setIsChangingEnvironment(true);
    setCurrentEnvironment(environment);
    await updateEnvironment(environment);
    setTimeout(() => setIsChangingEnvironment(false), 1000);
  };



  const connectedUsers = Object.keys(users).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="grid lg:grid-cols-[1fr_380px] h-screen">
        {/* ═══════════ 3D Scene ═══════════ */}
        <div className="relative overflow-hidden border-r border-border/30">
          <Tabs
            value={currentEnvironment}
            onValueChange={(v) =>
              handleEnvironmentChange(v as "tea" | "village" | "memories")
            }
            className="w-full h-full flex flex-col"
          >
            {/* Floating tab switcher */}
            <div className="absolute top-4 left-4 z-10">
              <TabsList className="glass-card border-0 shadow-lg">
                <TabsTrigger value="village">🏡 Village</TabsTrigger>
                <TabsTrigger value="tea">🍵 Tea Room</TabsTrigger>
                <TabsTrigger value="memories">🎬 Memories</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="tea" className="flex-1 m-0 data-[state=inactive]:hidden">
              <div className="h-full">
                <TeaScene
                  you={you}
                  partner={partnerUser?.name || ""}
                  youGender={gender}
                  partnerGender={partnerUser?.gender}
                  youMessage={youLatestMsg}
                  partnerMessage={partnerLatestMsg}
                />
              </div>
            </TabsContent>

            <TabsContent value="village" className="flex-1 m-0 data-[state=inactive]:hidden">
              <div className="h-full">
                <VillageScene
                  onSelfMove={updatePosition}
                  partner={
                    partnerUser
                      ? {
                          x: partnerUser.x,
                          y: partnerUser.y,
                          z: partnerUser.z,
                          ry: partnerUser.ry,
                          name: partnerUser.name,
                          gender: partnerUser.gender,
                          lastMessage: partnerLatestMsg,
                        }
                      : undefined
                  }
                  youGender={gender}
                  youName={you}
                  youMessage={youLatestMsg}
                />
              </div>
            </TabsContent>

            <TabsContent value="memories" className="flex-1 m-0 data-[state=inactive]:hidden">
              <div className="h-full">
                <MemoriesScene
                  onSelfMove={updatePosition}
                  partner={
                    partnerUser
                      ? {
                          x: partnerUser.x,
                          y: partnerUser.y,
                          z: partnerUser.z,
                          ry: partnerUser.ry,
                          name: partnerUser.name,
                          gender: partnerUser.gender,
                          lastMessage: partnerLatestMsg,
                        }
                      : undefined
                  }
                  youGender={gender}
                  youName={you}
                  youMessage={youLatestMsg}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ═══════════ Sidebar ═══════════ */}
        <div className="flex flex-col h-screen overflow-hidden bg-card/50">
          {/* ── Room Header ── */}
          <div className="p-4 border-b border-border/30">
             <div className="flex items-center justify-between mb-2.5">
              <h2 className="font-display font-bold text-lg gradient-text">
                Hangout
              </h2>
              <div className="flex items-center gap-2.5">
                {ping !== null && isConnected && (
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-sm transition-all duration-300">
                    ⚡ {ping}ms
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isConnected
                        ? "bg-emerald-400 animate-pulse-dot"
                        : "bg-zinc-500"
                    }`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {isConnected
                      ? connectedUsers === 2
                        ? "Both connected"
                        : "Waiting for partner…"
                      : "Connecting…"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/")}
                    className="text-xs h-8 px-2.5 hover:bg-destructive/10 hover:text-destructive"
                  >
                    ✕ Leave
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Leave sanctuary</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* ── User Profiles (compact) ── */}
          <div className="p-4 border-b border-border/30 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0 transition-colors ${
                  partnerUser
                    ? partnerUser.gender === "male"
                      ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20"
                      : "bg-pink-500/15 text-pink-400 ring-1 ring-pink-500/20"
                    : "bg-muted/30 text-muted-foreground/40 ring-1 ring-border/30"
                }`}
              >
                {partnerUser
                  ? partnerUser.gender === "male"
                    ? "G"
                    : "V"
                  : "?"}
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                  Partner
                </label>
                <p
                  className={`text-sm px-1.5 truncate ${
                    partnerUser?.name
                      ? "text-foreground"
                      : "text-muted-foreground/40 italic"
                  }`}
                >
                  {partnerUser?.name || "Waiting for partner…"}
                </p>
              </div>
              {partnerUser && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-500/25 text-emerald-400 bg-emerald-500/5 px-2 py-0.5"
                >
                  ● Online
                </Badge>
              )}
            </div>
          </div>

          {/* ── Chat ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-2">
                    <p className="text-2xl">💬</p>
                    <p className="text-sm text-muted-foreground/40">
                      {isConnected
                        ? "Send the first message!"
                        : "Connecting to room…"}
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isSelf = m.fromId
                    ? m.fromId === selfId
                    : m.from === you;

                  return (
                    <div
                      key={m.id}
                      className={`flex ${
                        isSelf ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`px-3.5 py-2 max-w-[85%] ${
                          isSelf ? "chat-bubble-self" : "chat-bubble-other"
                        }`}
                      >
                        {!isSelf && (
                          <p className="text-[11px] font-medium text-primary/70 mb-0.5">
                            {m.from}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed break-words">
                          {m.text}
                        </p>
                        <p className="text-[10px] text-muted-foreground/40 mt-1 text-right">
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message input */}
            <div className="p-3 border-t border-border/30 space-y-3">
              {/* Quick Messages */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1">
                  Quick Messages
                </span>
                <div 
                  className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 px-1 scroll-smooth"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {QUICK_MESSAGES.map((msg, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(msg)}
                      disabled={!isConnected}
                      className="px-3 py-1.5 text-xs rounded-full bg-primary/10 hover:bg-primary/20 text-foreground border border-primary/20 hover:border-primary/45 transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center gap-1 shadow-sm font-medium hover:-translate-y-0.5"
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  id="message-input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write a sweet note…"
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  disabled={!isConnected}
                  className="bg-muted/20 border-border/30 focus:border-primary/40 placeholder:text-muted-foreground/30"
                />
                <Button
                  id="send-btn"
                  onClick={send}
                  disabled={!isConnected || !message.trim()}
                  size="icon"
                  className="shrink-0 bg-primary hover:bg-primary/80 transition-all duration-200 disabled:opacity-30"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
