import { api } from "@/trpc/api";
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { toast } from "sonner";

const CHANNEL_ICONS: Record<string, string> = {
  MENTORS_PARTICIPANTS: "💬",
  MENTORS_JUDGES: "⚖️",
  VOLUNTEERS_PARTICIPANTS: "🤝",
  VOLUNTEERS_ONLY: "🟣",
  TEAM_ONLY: "🔒",
};

const CHANNEL_LABELS: Record<string, string> = {
  MENTORS_PARTICIPANTS: "Mentors & Participants",
  MENTORS_JUDGES: "Mentors & Judges",
  VOLUNTEERS_PARTICIPANTS: "Volunteers & Participants",
  VOLUNTEERS_ONLY: "Volunteer Team",
  TEAM_ONLY: "Team Channel",
};

interface Channel {
  id: string;
  type: string;
  name: string;
  participationId: string | null;
}

interface Message {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  user: { id: string; name: string | null; image: string | null };
}

function MessageList({ channelId, currentUserId }: { channelId: string; currentUserId: string }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages } = api.chat.getMessages.useQuery(
    { channelId, limit: 60 },
    { refetchInterval: 3000 },
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const list = (messages as Message[] | undefined) ?? [];

  if (list.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-neutral-500">
        No messages yet. Be the first to say something!
      </div>
    );
  }

  let lastDate = "";

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {list.map((msg) => {
        const date = new Date(msg.createdAt);
        const dateLabel = date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
        const showDate = dateLabel !== lastDate;
        lastDate = dateLabel;
        const isMe = msg.userId === currentUserId;

        return (
          <div key={msg.id}>
            {showDate && (
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-neutral-800" />
                <span className="text-xs text-neutral-500">{dateLabel}</span>
                <div className="h-px flex-1 bg-neutral-800" />
              </div>
            )}
            <div className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs font-bold text-white overflow-hidden">
                {msg.user.image
                  ? <img src={msg.user.image} alt="" className="h-full w-full object-cover" />
                  : (msg.user.name?.[0] ?? "?").toUpperCase()
                }
              </div>
              <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`flex items-baseline gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  <span className="text-xs font-medium text-neutral-300">{isMe ? "You" : msg.user.name ?? "Unknown"}</span>
                  <span className="text-xs text-neutral-600">
                    {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className={`mt-0.5 rounded-2xl px-3 py-2 text-sm ${isMe ? "rounded-tr-sm bg-neutral-700 text-white" : "rounded-tl-sm bg-neutral-800 text-neutral-100"}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageInput({ channelId, onSent }: { channelId: string; onSent: () => void }) {
  const [text, setText] = useState("");

  const sendMutation = api.chat.sendMessage.useMutation({
    onSuccess: () => { setText(""); onSent(); },
    onError: (e) => toast.error(e.message || "Failed to send message"),
  });

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isLoading) return;
    sendMutation.mutate({ channelId, content: trimmed });
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t border-neutral-800 p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          maxLength={2000}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          className="flex-1 resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
          style={{ minHeight: "40px", maxHeight: "120px" }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sendMutation.isLoading}
          className="rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}

interface ChatViewProps {
  hackathonId: string;
  currentUserId: string;
}

const ChatView = ({ hackathonId, currentUserId }: ChatViewProps) => {
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const { data: channels, isLoading } = api.chat.getMyChannels.useQuery({ hackathonId });

  const channelList = (channels as Channel[] | undefined) ?? [];

  useEffect(() => {
    if (channelList.length > 0 && !activeChannelId) {
      setActiveChannelId(channelList[0]!.id);
    }
  }, [channelList, activeChannelId]);

  const activeChannel = channelList.find((c) => c.id === activeChannelId);

  if (isLoading) {
    return <div className="py-12 text-center text-neutral-400">Loading channels...</div>;
  }

  if (channelList.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 py-12 text-center">
        <p className="text-neutral-400">No chat channels available for your role in this hackathon.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[500px] overflow-hidden rounded-lg border border-neutral-800">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-neutral-800 bg-neutral-900/50">
        <div className="border-b border-neutral-800 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Channels</p>
        </div>
        <nav className="p-2 space-y-0.5">
          {channelList.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannelId(channel.id)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                activeChannelId === channel.id
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <span className="text-base">{CHANNEL_ICONS[channel.type] ?? "💬"}</span>
              <span className="truncate">{CHANNEL_LABELS[channel.type] ?? channel.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeChannel && (
          <>
            <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
              <span className="text-lg">{CHANNEL_ICONS[activeChannel.type] ?? "💬"}</span>
              <span className="font-medium text-white">
                {CHANNEL_LABELS[activeChannel.type] ?? activeChannel.name}
              </span>
              {activeChannel.type === "TEAM_ONLY" && (
                <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">Private</span>
              )}
            </div>
            <MessageList
              key={(activeChannelId ?? "") + refreshTick}
              channelId={activeChannel.id}
              currentUserId={currentUserId}
            />
            <MessageInput channelId={activeChannel.id} onSent={() => setRefreshTick((t) => t + 1)} />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatView;
