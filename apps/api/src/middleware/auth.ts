import { type SupabaseClient, createClient } from "@supabase/supabase-js";
// apps/api/src/middleware/auth.ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
  };
}

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
    const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"];

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase credentials not configured (SUPABASE_URL, SUPABASE_ANON_KEY)");
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const supabase = getSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      reply.status(401).send({ error: "Invalid or expired token" });
      return;
    }

    (request as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email ?? "",
    };
  } catch (_err) {
    reply.status(401).send({ error: "Authentication failed" });
  }
}

export function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: () => void,
): void {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    done();
    return;
  }

  const token = authHeader.slice(7);

  getSupabaseClient()
    .auth.getUser(token)
    .then(({ data: { user }, error }) => {
      if (!error && user) {
        (request as AuthenticatedRequest).user = {
          id: user.id,
          email: user.email ?? "",
        };
      }
      done();
    })
    .catch(() => {
      done();
    });
}
