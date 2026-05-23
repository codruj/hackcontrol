import { api } from "@/trpc/api";
import { useState } from "react";
import Loading from "./loading";
import { Lightbulb } from "@/ui/icons";

function getPreview(content: string): string {
  const lines = content.split("\n");
  if (lines.length > 3) return lines.slice(0, 3).join("\n");
  if (content.length > 300) return content.slice(0, 300);
  return content;
}

function needsExpansion(content: string): boolean {
  return content.split("\n").length > 3 || content.length > 300;
}

function AnnouncementItem({ announcement }: { announcement: { id: string; title: string; content: string; important: boolean; createdAt: Date } }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = needsExpansion(announcement.content);
  const preview = getPreview(announcement.content);

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        announcement.important
          ? "border-yellow-600/50 bg-yellow-900/10 shadow-lg shadow-yellow-900/20"
          : "border-neutral-800/50 bg-neutral-900/30"
      }`}
    >
      <div className="flex items-center gap-2">
        {announcement.important && (
          <span className="rounded-full bg-yellow-600 px-2 py-0.5 text-xs font-bold text-white">
            IMPORTANT
          </span>
        )}
        <h3 className="text-lg font-semibold text-white">{announcement.title}</h3>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-gray-300">
        {expanded ? announcement.content : preview}
        {!expanded && isLong ? "…" : ""}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
      <p className="mt-3 text-xs text-gray-500">
        Posted on {new Date(announcement.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })} at {new Date(announcement.createdAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}

interface AnnouncementDisplayProps {
  hackathonUrl: string;
}

const AnnouncementDisplay = ({ hackathonUrl }: AnnouncementDisplayProps) => {
  const { data: announcements, isLoading } = api.announcement.getByHackathonUrl.useQuery({
    url: hackathonUrl,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loading text="Loading announcements..." />
      </div>
    );
  }

  if (!announcements || announcements.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto mt-8 max-w-4xl px-6">
      <div className="rounded-lg border border-neutral-800 p-6">
        <div className="mb-6 flex items-center gap-2">
          <Lightbulb width={24} className="text-yellow-500" />
          <h2 className="text-2xl font-semibold">Announcements</h2>
        </div>

        <div className="space-y-4">
          {announcements.map((announcement) => (
            <AnnouncementItem key={announcement.id} announcement={announcement} />
          ))}
        </div>

        <div className="mt-6 rounded-lg bg-blue-900/20 p-4">
          <p className="text-sm text-blue-300">
            💡 Stay tuned for more updates! Check back regularly for new announcements.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDisplay;
