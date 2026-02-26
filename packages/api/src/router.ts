import { os } from "@orpc/server";

const health = {
  check: os.handler(async () => ({ status: "ok" as const })),
};

export const router = {
  health,
};

export type Router = typeof router;
