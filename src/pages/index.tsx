import Image from "next/image";
import NextLink from "next/link";

import HackathonCard from "@/components/hackathonCard";
import { ExternalLink, Link } from "@/ui";
import { ArrowRight, Github } from "@/ui/icons";
import Up from "@/animations/up";
import { ButtonStyles } from "@/ui/button";
import clsx from "clsx";
import { api } from "@/trpc/api";

export default function Home() {
  const { data: recentHackathons, isLoading } =
    api.hackathon.getRecentHackathons.useQuery();

  return (
    <div className="flex min-h-screen flex-col items-center space-y-5 py-8">
      <Up>
        <Image
          className="relative z-20"
          src="/images/phck_logo.svg"
          width={64}
          height={64}
          alt="Phck logo"
        />
      </Up>
      <h1 className="text-center text-2xl sm:text-left md:mt-4 md:text-3xl">
        An open source hackathon management
      </h1>
      <div className="flex items-center space-x-2">
        <ExternalLink
          href="https://github.com/pheralb/project-hackathon"
          className={ButtonStyles}
        >
          <div className="flex items-center space-x-2">
            <Github width={16} />
            <span>Repository</span>
          </div>
        </ExternalLink>
        <Link href="auth" underline={false} className={clsx(ButtonStyles)}>
          <div className="flex items-center space-x-2">
            <span>Get Started</span>
            <ArrowRight width={16} />
          </div>
        </Link>
      </div>
      <div className="mb-6 mt-4 flex flex-col gap-4 md:flex-row md:gap-3">
        <HackathonCard
          name="✨ Simple, as it should be"
          description="Create hackathons in no time, review and decide who wins your event"
        />
        <HackathonCard
          name="🚀 Share and participate"
          description="Share with friends and power your event with organization"
        />
      </div>

      {/* Recent Hackathons Section */}
      <div className="w-full max-w-4xl px-4">
        <h2 className="mb-4 text-xl font-medium text-neutral-200">
          Recent Hackathons
        </h2>
        {isLoading ? (
          <p className="text-gray-400">Loading hackathons...</p>
        ) : recentHackathons && recentHackathons.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentHackathons.map((hackathon) => (
              <NextLink
                key={hackathon.id}
                href={`/hackathon/${hackathon.url}`}
                className="block"
              >
                <div className="group relative h-full w-full cursor-pointer rounded-md bg-white bg-opacity-10 p-4 transition-all hover:bg-opacity-20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{hackathon.name}</h3>
                    {hackathon.is_finished && (
                      <span className="rounded bg-green-600 px-2 py-0.5 text-xs">
                        Finished
                      </span>
                    )}
                  </div>
                  {hackathon.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                      {hackathon.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {new Date(hackathon.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </NextLink>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No hackathons yet. Be the first to create one!</p>
        )}
      </div>
    </div>
  );
}
