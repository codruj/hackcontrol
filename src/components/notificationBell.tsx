import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import { api } from "@/trpc/api";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const { data: unreadCount = 0, refetch: refetchCount } =
    api.notification.getUnreadCount.useQuery(undefined, {
      enabled: !!session,
      refetchInterval: 30000,
    });

  const { data: notifications = [], refetch: refetchList } =
    api.notification.getMyNotifications.useQuery(
      { limit: 30 },
      { enabled: !!session && open },
    );

  const markAsRead = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      void refetchCount();
      void refetchList();
    },
  });

  const markAllAsRead = api.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      void refetchCount();
      void refetchList();
    },
  });

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (
      unreadCount > prevCountRef.current &&
      prevCountRef.current > 0 &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      new Notification("Hackcontrol", {
        body: `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`,
      });
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleNotificationClick = (n: {
    id: string;
    read: boolean;
    link: string | null;
  }) => {
    if (!n.read) markAsRead.mutate({ id: n.id });
    setOpen(false);
    if (n.link) void router.push(n.link);
  };

  const requestBrowserPermission = async () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const showBrowserPermissionButton =
    typeof Notification !== "undefined" && Notification.permission === "default";

  if (!session) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-1 text-gray-400 transition-colors hover:text-white"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <span className="text-sm font-medium text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isLoading}
                className="text-xs text-blue-400 transition-colors hover:text-blue-300 disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-neutral-500">
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={clsx(
                    "flex w-full flex-col gap-1 border-b border-neutral-800 px-4 py-3 text-left transition-colors last:border-0 hover:bg-neutral-800/50",
                    !n.read && "bg-blue-950/20",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                    )}
                    <span
                      className={clsx(
                        "text-sm font-medium leading-tight",
                        !n.read ? "text-white" : "text-neutral-300",
                        n.read && "pl-3.5",
                      )}
                    >
                      {n.title}
                    </span>
                  </div>
                  <p className="pl-3.5 text-xs leading-relaxed text-neutral-400 line-clamp-2">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-2 pl-3.5">
                    {n.hackathon && (
                      <span className="text-xs text-neutral-500">{n.hackathon.name}</span>
                    )}
                    {n.hackathon && (
                      <span className="text-xs text-neutral-700">·</span>
                    )}
                    <span className="text-xs text-neutral-500">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {showBrowserPermissionButton && (
            <div className="border-t border-neutral-800 px-4 py-2.5">
              <button
                onClick={requestBrowserPermission}
                className="text-xs text-neutral-500 transition-colors hover:text-neutral-300"
              >
                Enable browser notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
