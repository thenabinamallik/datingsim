import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Index = () => {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const navigate = useNavigate();

  const go = () => {
    if (!name || !room) return;
    navigate(`/room/${encodeURIComponent(room)}?name=${encodeURIComponent(name)}&gender=${gender}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-6 border rounded-xl bg-card shadow-sm space-y-4 animate-fade-in">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold">Tea for Two</h1>
          <p className="text-muted-foreground">Enter your details and join a private room</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Your name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayaan" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Gender</label>
            <Select value={gender} onValueChange={(value: 'male' | 'female') => setGender(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Room ID</label>
            <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. garden-rose-123" />
          </div>
          <Button className="w-full" onClick={go}>Join</Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
