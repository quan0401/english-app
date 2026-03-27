import "server-only";
import { createCallerFactory } from "@/server/trpc/init";
import { createTRPCContext } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/router";
import { headers } from "next/headers";

const createCaller = createCallerFactory(appRouter);

export const api = async () => {
  const hdrs = await headers();
  return createCaller(await createTRPCContext({ headers: hdrs }));
};
