import { createNextApiHandler } from "@trpc/server/adapters/next";

import { env } from "@/env/index.mjs";
import { createTRPCContext } from "@/trpc";
import { appRouter } from "@/trpc/root";

// export API handler
export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError: ({ path, error }) => {
    console.error(`tRPC error on ${path ?? "<no-path>"}: ${error.message}\n${error.stack ?? ""}`);
  },
});
