import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!url || !anon || !service) throw new Error("Server credentials are not configured.");
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Invalid session" }, 401);
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const [{ data: adminRow }, { data: staffRows }] = await Promise.all([
      admin.from("admin_users").select("role").eq("user_id", user.id).maybeSingle(),
      admin.from("user_roles").select("role_id").eq("user_id", user.id).limit(1),
    ]);
    if (!adminRow && !staffRows?.length) return json({ error: "No active staff role" }, 403);

    const body = await req.json();
    const allowedActions = new Set(["sign_in", "sign_out", "invite_admin", "role_assignment", "record_export"]);
    const action = String(body.action ?? "");
    if (!allowedActions.has(action)) return json({ error: "Unsupported audit action" }, 400);
    const moduleName = String(body.module ?? "identity").slice(0, 50);
    const targetType = body.target_type ? String(body.target_type).slice(0, 80) : null;
    const targetId = body.target_id ? String(body.target_id) : null;
    const forwarded = (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "").split(",")[0].trim();
    const ua = (req.headers.get("user-agent") ?? "").slice(0, 500);
    const device = /android|iphone|ipad|mobile/i.test(ua) ? "mobile" : /windows|macintosh|linux|x11/i.test(ua) ? "desktop" : ua ? "other" : "unknown";
    const payload: Record<string, unknown> = {
      actor_user_id: user.id, action, module: moduleName, target_type: targetType,
      outcome: "success", user_agent: ua, device_category: device,
      metadata: { source: "admin_gateway" },
    };
    if (targetId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) payload.target_id = targetId;
    if (forwarded && /^[0-9a-fA-F:.]+$/.test(forwarded)) payload.ip_address = forwarded;
    const { error } = await admin.from("audit_events").insert(payload);
    if (error) throw error;
    return json({ success: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Audit event could not be recorded" }, 400);
  }
});