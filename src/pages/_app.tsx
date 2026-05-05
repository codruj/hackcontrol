import type { AppType } from "next/app";
import NextNProgress from "nextjs-progressbar";
import { ThemeProvider, useTheme } from "next-themes";

// Next-Auth:
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

// tRPC:
import { api } from "@/trpc/api";

// Styles:
import "@/styles/globals.css";
import { Toaster } from "sonner";
import Show from "@/animations/show";

// Layout:
import Header from "@/layout/header";

// SEO:
import { DefaultSeo } from "next-seo";
import { nextSeoConfig } from "next-seo.config";

const AppContent = ({
  Component,
  pageProps,
  router,
}: {
  Component: React.ComponentType<Record<string, unknown>>;
  pageProps: Record<string, unknown>;
  router: { route: string };
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <main className="font-sans">
      <Header />
      <Show routerKey={router.route}>
        <Component {...pageProps} />
      </Show>
      <Toaster
        theme={isLight ? "light" : "dark"}
        position="bottom-center"
        toastOptions={{
          style: {
            background: isLight ? "#f8fafc" : "#161616",
            fontFamily: "Satoshi",
            fontSize: "15px",
          },
        }}
      />
    </main>
  );
};

const App: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
  router,
}) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SessionProvider session={session}>
        <DefaultSeo {...nextSeoConfig} />
        <NextNProgress
          color="#979797"
          startPosition={0.3}
          stopDelayMs={200}
          height={1}
          showOnShallow={true}
          options={{ showSpinner: false }}
        />
        <AppContent
          Component={Component as React.ComponentType<Record<string, unknown>>}
          pageProps={pageProps}
          router={router}
        />
      </SessionProvider>
    </ThemeProvider>
  );
};

export default api.withTRPC(App);
