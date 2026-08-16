import type { Env } from "./types";
import { handleGetConfig } from "./routes/config";
import { handleGetPixels, handleGetCapsules, handleGetImage, handleGetBlock } from "./routes/blocks";
import { handleUpload } from "./routes/upload";
import { handleCheckout } from "./routes/checkout";
import { handleWebhook } from "./routes/webhook";
import { handleHeartbeat, handleGetPresence } from "./routes/presence";
import { handleGetStats } from "./routes/stats";
import { handleSharePage } from "./routes/share";
import { handleScheduledDelivery } from "./routes/delivery";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      if (pathname === "/api/config" && request.method === "GET") {
        return handleGetConfig(env);
      }
      if (pathname === "/api/pixels" && request.method === "GET") {
        return handleGetPixels(env);
      }
      if (pathname === "/api/capsules" && request.method === "GET") {
        return handleGetCapsules(env);
      }
      if (pathname.startsWith("/api/blocks/") && request.method === "GET") {
        return handleGetBlock(pathname.slice("/api/blocks/".length), env);
      }
      if (pathname === "/api/upload" && request.method === "POST") {
        return handleUpload(request, env);
      }
      if (pathname === "/api/checkout" && request.method === "POST") {
        return handleCheckout(request, env);
      }
      if (pathname === "/api/webhook" && request.method === "POST") {
        return handleWebhook(request, env);
      }
      if (pathname === "/api/presence" && request.method === "POST") {
        return handleHeartbeat(request, env);
      }
      if (pathname === "/api/presence" && request.method === "GET") {
        return handleGetPresence(env);
      }
      if (pathname === "/api/stats" && request.method === "GET") {
        return handleGetStats(env);
      }
      if (pathname.startsWith("/images/") && request.method === "GET") {
        return handleGetImage(pathname.slice("/images/".length), env);
      }
      if (pathname.startsWith("/s/") && request.method === "GET") {
        const parts = pathname.slice("/s/".length).split("/");
        if (parts.length === 2) {
          return handleSharePage(parts[0], parts[1], env);
        }
      }
    } catch (err) {
      console.error(err);
      return new Response("Internal error", { status: 500 });
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(_event, env): Promise<void> {
    await handleScheduledDelivery(env);
  },
} satisfies ExportedHandler<Env>;
