import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";

import Up from "@/animations/up";
import { Button, Link } from "@/ui";
import { toast } from "sonner";

const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-8 w-8" />;

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-md p-1.5 text-gray-400 transition-colors hover:text-white"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
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
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
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
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
};

const InstitutionLogos = () => {
  return (
    <div className="flex items-center space-x-3">
      {/* AIRI */}
      <div className="relative h-10 w-20 flex-shrink-0">
        <Image
          src="/images/airi_alb.png"
          alt="AIRI"
          fill
          className="hidden object-contain object-center dark:block"
          sizes="64px"
        />
        <Image
          src="/images/airi_negru.png"
          alt="AIRI"
          fill
          className="block object-contain object-center dark:hidden"
          sizes="64px"
        />
      </div>

      <span className="h-5 w-px flex-shrink-0 bg-neutral-600" />

      {/* UTCN */}
      <div className="relative h-8 w-12 flex-shrink-0">
        <Image
          src="/images/logo_ut_alb.png"
          alt="UTCN"
          fill
          className="hidden object-contain object-center dark:block"
          sizes="48px"
        />
        <Image
          src="/images/logo_ut_negru.png"
          alt="UTCN"
          fill
          className="block object-contain object-center dark:hidden"
          sizes="48px"
        />
      </div>
    </div>
  );
};

const Header = () => {
  const { data: session } = useSession();

  const handleLogout = async () => {
    try {
      await signOut({
        callbackUrl: "/",
      });
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  return (
    <header className="fixed top-0 z-50 block w-full bg-neutral-900/80 px-5 py-4 font-medium text-gray-200 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <Link href="/" underline={false}>
          <div className="flex items-center space-x-3 transition-all duration-100 hover:text-white">
            <Image
              src="/images/phck.svg"
              width={40}
              height={40}
              alt="Project Hackathon Logo"
            />
            <p className="hidden md:block">Hackcontrol</p>
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          <InstitutionLogos />
          <ThemeToggle />
          {session && (
            <>
              <Up>
                <div className="flex items-center space-x-3">
                  {session.user.role === "ADMIN" && (
                    <span className="rounded-full bg-green-600 px-2 py-1 text-xs font-medium text-white">
                      ADMIN
                    </span>
                  )}
                  <Image
                    src={session.user.image}
                    width={24}
                    height={24}
                    className="rounded-full"
                    alt={session.user.name}
                  />
                  <p className="hidden md:block">{session.user.name}</p>
                </div>
              </Up>
              <Up delay={0.2}>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-400">|</span>
                  <Button onClick={handleLogout}>Sign out</Button>
                </div>
              </Up>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
