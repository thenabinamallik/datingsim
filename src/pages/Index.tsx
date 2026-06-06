import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import usersData from "@/data/users.json";

const HEART_PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 10,
  duration: 8 + Math.random() * 8,
  size: 0.6 + Math.random() * 1,
}));

const Index = () => {
  const [secretId, setSecretId] = useState("");
  const navigate = useNavigate();

  const go = () => {
    const id = secretId.trim();
    if (!id) return;
    
    // Check if the ID exists in our local JSON
    if (id in usersData) {
      navigate(`/room/private-sanctuary?id=${encodeURIComponent(id)}`);
    } else {
      toast({ description: "Invalid Secret ID. Access denied.", variant: "destructive" });
    }
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
            GV's World
          </h1>
          <p className="text-muted-foreground text-sm tracking-widest uppercase">
            Our Private Sanctuary
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Secret ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="secret-id"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              Secret Access ID
            </label>
            <Input
              id="secret-id"
              type="password"
              value={secretId}
              onChange={(e) => setSecretId(e.target.value)}
              placeholder="Enter your secret ID"
              className="bg-white/5 border-white/10 focus:border-primary/50 h-11 placeholder:text-muted-foreground/40"
              onKeyDown={(e) => e.key === "Enter" && go()}
            />
          </div>

          {/* Submit */}
          <Button
            id="join-room-btn"
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 mt-2"
            onClick={go}
            disabled={!secretId.trim()}
          >
            Enter Sanctuary →
          </Button>
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-muted-foreground/50">
          Only authorized IDs can enter this private space.
        </p>
      </div>
    </div>
  );
};

export default Index;
