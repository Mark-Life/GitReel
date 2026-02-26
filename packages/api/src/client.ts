import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { Router } from "./router.js";

/** Creates a typed oRPC client for the given base URL */
export const createClient = (baseUrl: string): RouterClient<Router> => {
  const link = new RPCLink({
    url: `${baseUrl}/rpc`,
  });

  return createORPCClient(link);
};
