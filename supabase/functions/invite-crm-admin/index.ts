import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!url || !anonKey || !serviceKey) throw new Error("Server credentials are not configured.");
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: actor, error: actorError } = await adminClient.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
    if (actorError || actor?.role !== "super_admin") return new Response(JSON.stringify({ error: "Only the super administrator can invite administrators." }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const displayName = String(body.display_name ?? "").trim().slice(0, 100);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response(JSON.stringify({ error: "Enter a valid email address." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    const { data: invitation, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, { data: { display_name: displayName } });
    if (inviteError) throw inviteError;
    const { error: insertError } = await adminClient.from("admin_users").upsert({
      user_id: invitation.user.id, email, role: "admin", display_name: displayName || null, created_by: user.id,
    }, { onConflict: "user_id" });
    if (insertError) throw insertError;
    return new Response(JSON.stringify({ success: true, invited_email: email, role: "admin" }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unable to create administrator." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});