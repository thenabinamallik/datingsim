import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import TeaScene from "@/components/TeaScene";
import VillageScene from "@/components/VillageScene";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useRoomRealtime } from "@/hooks/useRoomRealtime";

export default function Room() {
  const { roomId } = useParams();
  const [search] = useSearchParams();
  const initialName = search.get("name") ?? "";
  const initialGender = (search.get("gender") as "male" | "female") ?? "male";

  const [you, setYou] = useState(initialName);
  const [gender, setGender] = useState<"male" | "female">(initialGender);
  const [message, setMessage] = useState("");
  const [currentEnvironment, setCurrentEnvironment] = useState<
    "tea" | "village"
  >("village");
  const [isChangingEnvironment, setIsChangingEnvironment] = useState(false);

  const {
    partner: partnerUser,
    messages,
    users,
    isConnected,
    updatePosition,
    sendMessage,
    updateName,
    updateGender,
    updateEnvironment,
  } = useRoomRealtime(roomId, you, gender);

  // Sync environment with partner
  useEffect(() => {
    if (
      partnerUser?.currentEnvironment &&
      partnerUser.currentEnvironment !== currentEnvironment &&
      !isChangingEnvironment
    ) {
      console.log("Syncing environment:", partnerUser.currentEnvironment);
      setCurrentEnvironment(partnerUser.currentEnvironment);
    }
  }, [
    partnerUser?.currentEnvironment,
    currentEnvironment,
    isChangingEnvironment,
  ]);

  // Set initial environment when joining
  useEffect(() => {
    if (isConnected && !currentEnvironment) {
      console.log("Setting initial environment to village");
      setCurrentEnvironment("village");
      updateEnvironment("village");
    }
  }, [isConnected, currentEnvironment]);

  const send = async () => {
    if (!message.trim() || !you) return;
    await sendMessage(message.trim());
    setMessage("");
  };

  const handleNameChange = async (newName: string) => {
    setYou(newName);
    await updateName(newName);
  };

  const handleGenderChange = async (newGender: "male" | "female") => {
    setGender(newGender);
    await updateGender(newGender);
  };

  const handleEnvironmentChange = async (environment: "tea" | "village") => {
    if (isChangingEnvironment) return; // Prevent rapid switching

    console.log("Changing environment to:", environment);
    setIsChangingEnvironment(true);
    setCurrentEnvironment(environment);
    await updateEnvironment(environment);

    // Reset the flag after a short delay
    setTimeout(() => {
      setIsChangingEnvironment(false);
    }, 1000);
  };

  useEffect(() => {
    document.title = `Tea for Two — ${roomId ?? "room"}`;
  }, [roomId]);

  const title = useMemo(() => `Room ${roomId ?? ""}`, [roomId]);

  const connectedUsers = Object.keys(users).length;
  const hasPartner = connectedUsers > 1;

  // Get connection status message
  const getConnectionStatus = () => {
    if (!isConnected) return "Connecting to Firebase...";
    if (connectedUsers === 0) return "Joining room...";
    if (connectedUsers === 1) return "Waiting for partner...";
    if (connectedUsers === 2) return "Connected with partner!";
    return "Room full";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="grid lg:grid-cols-[1fr_360px] gap-4 p-4">
        <div className="rounded-xl overflow-hidden border bg-card">
          <Tabs
            value={currentEnvironment}
            onValueChange={(value: "tea" | "village") =>
              handleEnvironmentChange(value)
            }
            className="w-full"
          >
            <div className="p-3 border-b">
              <TabsList>
                <TabsTrigger value="tea">Tea</TabsTrigger>
                <TabsTrigger value="village">Village</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="tea">
              <div className="h-[60vh] sm:h-[70vh] lg:h-[80vh]">
                <TeaScene
                  you={you}
                  partner={partnerUser?.name || ""}
                  youGender={gender}
                  partnerGender={partnerUser?.gender}
                />
              </div>
            </TabsContent>
            <TabsContent value="village">
              <div className="h-[60vh] sm:h-[70vh] lg:h-[80vh]">
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
                        }
                      : undefined
                  }
                  youGender={gender}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={isConnected ? "default" : "secondary"}>
                    {getConnectionStatus()}
                  </Badge>
                  {connectedUsers > 0 && (
                    <Badge variant="outline">{connectedUsers}/2 users</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Your name
                  </label>
                  <Input
                    value={you}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ayaan"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Partner's Status
                    {partnerUser?.name && (
                      <span className="ml-1 text-xs text-green-600">✓</span>
                    )}
                  </label>
                  <Input
                    value={partnerUser?.name || ""}
                    placeholder={
                      hasPartner
                        ? "Partner connected"
                        : "Waiting for partner..."
                    }
                    disabled
                    className={
                      partnerUser?.name ? "border-green-200 bg-green-50" : ""
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Your gender
                  </label>
                  <Select
                    value={gender}
                    onValueChange={(value: "male" | "female") =>
                      handleGenderChange(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Partner gender
                  </label>
                  <Input
                    value={
                      partnerUser?.gender === "male"
                        ? "Male"
                        : partnerUser?.gender === "female"
                        ? "Female"
                        : "Unknown"
                    }
                    disabled
                    className={
                      partnerUser?.gender ? "border-green-200 bg-green-50" : ""
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Current environment
                  </label>
                  <Input
                    value={
                      currentEnvironment === "tea" ? "Tea Room" : "Village"
                    }
                    disabled
                    className="border-blue-200 bg-blue-50"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Partner environment
                    {partnerUser?.currentEnvironment &&
                      partnerUser.currentEnvironment === currentEnvironment && (
                        <span className="ml-1 text-xs text-green-600">✓</span>
                      )}
                  </label>
                  <Input
                    value={
                      partnerUser?.currentEnvironment === "tea"
                        ? "Tea Room"
                        : partnerUser?.currentEnvironment === "village"
                        ? "Village"
                        : "Unknown"
                    }
                    disabled
                    className={
                      partnerUser?.currentEnvironment
                        ? "border-green-200 bg-green-50"
                        : ""
                    }
                  />
                </div>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write a sweet note…"
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  disabled={!isConnected}
                />
                <Button
                  onClick={send}
                  disabled={!isConnected || !message.trim()}
                >
                  Send
                </Button>
              </div>
              <div className="h-48 overflow-auto rounded-md border p-2 bg-muted/30 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {isConnected
                      ? "No messages yet. Start the conversation!"
                      : "Connecting to room..."}
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="text-sm">
                      <span className="text-muted-foreground">
                        {new Date(m.timestamp).toLocaleTimeString()} •
                      </span>
                      <span className="font-medium">{m.from}:</span> {m.text}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
