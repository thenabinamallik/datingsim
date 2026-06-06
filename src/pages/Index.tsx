import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const generateRoomId = () => {
  const adjectives = [
    "moonlit",
    "starry",
    "golden",
    "velvet",
    "dreamy",
    "cosmic",
    "tender",
    "blissful",
    "serene",
    "enchanted",
  ];
  const nouns = [
    "garden",
    "meadow",
    "sky",
    "river",
    "sunset",
    "aurora",
    "bloom",
    "haven",
    "oasis",
    "lagoon",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}-${noun}-${num}`;
};

const HEART_PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 10,
  duration: 8 + Math.random() * 8,
  size: 0.6 + Math.random() * 1,
}));

const Index = () => {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const navigate = useNavigate();

  const go = () => {
    if (!name || !room) return;
    navigate(
      `/room/${encodeURIComponent(room)}?name=${encodeURIComponent(name)}&gender=${gender}`
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg relative overflow-hidden">
      {/* Floating heart particles */}
      {HEART_PARTICLES.map((p) => (
        <span
          key={p.id}
          className="heart-particle"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: `${p.size}rem`,
          }}
        >
          ♥
        </span>
      ))}

      {/* Main card */}
      <div className="w-full max-w-md mx-4 p-8 glass-card rounded-2xl space-y-6 animate-fade-in z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-extrabold gradient-text font-display tracking-tight">
            Hangout
          </h1>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">
            Virtual Date Sim
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="user-name"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              Your Name
            </label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="bg-white/5 border-white/10 focus:border-primary/50 h-11 placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Gender
            </label>
            <Select
              value={gender}
              onValueChange={(v: "male" | "female") => setGender(v)}
            >
              <SelectTrigger
                id="user-gender"
                className="bg-white/5 border-white/10 h-11"
              >
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">♂ Male</SelectItem>
                <SelectItem value="female">♀ Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Room ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="room-id"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              Room ID
            </label>
            <div className="flex gap-2">
              <Input
                id="room-id"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. moonlit-garden-42"
                className="bg-white/5 border-white/10 focus:border-primary/50 h-11 placeholder:text-muted-foreground/40"
                onKeyDown={(e) => e.key === "Enter" && go()}
              />
              <Button
                variant="outline"
                onClick={() => setRoom(generateRoomId())}
                className="shrink-0 border-white/10 hover:bg-white/10 h-11 px-3 text-sm"
                type="button"
              >
                ✨ Generate
              </Button>
            </div>
          </div>

          {/* Submit */}
          <Button
            id="join-room-btn"
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 mt-2"
            onClick={go}
            disabled={!name.trim() || !room.trim()}
          >
            Enter Room →
          </Button>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-muted-foreground/50">
          Share the Room ID with your partner to connect together
        </p>
      </div>
    </div>
  );
};

export default Index;
