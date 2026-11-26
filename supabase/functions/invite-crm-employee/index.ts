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
    const callerClient = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) return json({ error: "Invalid session" }, 401);
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: actor } = await admin.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
    if (!actor || !["admin", "super_admin"].includes(actor.role)) return json({ error: "Only an Admin can invite employee accounts." }, 403);

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim().slice(0, 120);
    const jobTitle = String(body.job_title ?? "").trim().slice(0, 100);
    const roleCode = String(body.role_code ?? "").trim();
    const departmentCode = String(body.department_code ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2) return json({ error: "A valid email and full name are required." }, 400);
    if (!roleCode || roleCode === "business_admin") return json({ error: "Select a standard employee role." }, 400);

    const [{ data: role }, { data: department }] = await Promise.all([
      admin.from("app_roles").select("id,code").eq("code", roleCode).maybeSingle(),
      admin.from("departments").select("id,code").eq("code", departmentCode).maybeSingle(),
    ]);
    if (!role || !department) return json({ error: "The selected role or department is invalid." }, 400);

    const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { display_name: fullName } });
    if (inviteError) throw inviteError;
    const { data: profile, error: profileError } = await admin.from("employee_profiles").insert({
      auth_user_id: invitation.user.id, full_name: fullName, work_email: email,
      job_title: jobTitle || null, department_id: department.id, employment_status: "pending",
    }).select("id").single();
    if (profileError) throw profileError;
    const { error: roleError } = await admin.from("user_roles").insert({
      user_id: invitation.user.id, role_id: role.id, department_id: department.id, assigned_by: user.id,
    });
    if (roleError) throw roleError;

    const forwarded = (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "").split(",")[0].trim();
    const ua = (req.headers.get("user-agent") ?? "").slice(0, 500);
    const device = /android|iphone|ipad|mobile/i.test(ua) ? "mobile" : /windows|macintosh|linux|x11/i.test(ua) ? "desktop" : "other";
    await admin.from("audit_events").insert({
      actor_user_id: user.id, action: "invite_employee", module: "employees",
      target_type: "employee_profiles", target_id: profile.id, outcome: "success",
      ip_address: /^[0-9a-fA-F:.]+$/.test(forwarded) ? forwarded : null,
      user_agent: ua, device_category: device, metadata: { role_code: role.code, department_code: department.code },
    });
    return json({ success: true, invited_email: email, employee_id: profile.id, role: role.code });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Employee invitation failed." }, 400);
  }
});