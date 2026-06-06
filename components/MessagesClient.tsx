"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api-client";

type Coach = { id: string; name: string; profile_image_url: string; is_online: boolean };
type Message = {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
};

export function MessagesClient({ userId }: { userId: string }) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [coachId, setCoachId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");

  useEffect(() => {
    api<Coach[]>("coaches").then((c) => {
      setCoaches(c);
      if (c[0]) setCoachId(c[0].id);
    });
  }, []);

  useEffect(() => {
    if (!coachId) return;
    api<Message[]>(`messages/${userId}/${coachId}`).then(setMessages);
  }, [userId, coachId]);

  async function send() {
    if (!content.trim() || !coachId) return;
    await api("messages", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        coach_id: coachId,
        sender: "user",
        content,
        attachment_base64: "",
      }),
    });
    setContent("");
    const updated = await api<Message[]>(`messages/${userId}/${coachId}`);
    setMessages(updated);
  }

  const coach = coaches.find((c) => c.id === coachId);

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
      {coach && (
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
          {coach.profile_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coach.profile_image_url} alt="" className="h-10 w-10 rounded-full object-cover" />
          )}
          <div>
            <p className="font-medium text-white">{coach.name}</p>
            <p className="text-xs text-emerald-400">{coach.is_online ? "Online" : "Offline"}</p>
          </div>
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              m.sender === "user"
                ? "ml-auto bg-white text-black"
                : "bg-zinc-800 text-zinc-100"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-zinc-800 p-4">
        <Input
          placeholder="Type a message…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button type="button" onClick={send}>
          Send
        </Button>
      </div>
    </div>
  );
}
