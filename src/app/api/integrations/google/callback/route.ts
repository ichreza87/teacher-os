import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { exchangeGoogleCode } from "@/integrations/google/oauth";
import { saveToken } from "@/integrations/secrets";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/integrations/google?error=${encodeURIComponent("GOOGLE_CLIENT_ID/SECRET belum diisi di server.")}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/integrations/google?error=${encodeURIComponent("Otorisasi dibatalkan.")}`);
  }

  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.redirect(`${origin}/integrations/google?error=${encodeURIComponent("Supabase belum dikonfigurasi.")}`);
  }
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Callback only reads the session; no refresh needed here.
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== state) {
    return NextResponse.redirect(`${origin}/integrations/google?error=${encodeURIComponent("Sesi tidak valid. Masuk lalu ulangi.")}`);
  }

  try {
    const tokens = await exchangeGoogleCode({
      clientId,
      clientSecret,
      redirectUri: `${appUrl}/api/integrations/google/callback`,
      code,
    });
    await saveToken(supabase, user.id, "google", JSON.stringify(tokens), { connected_at: new Date().toISOString() });
    return NextResponse.redirect(`${origin}/integrations/google`);
  } catch (e) {
    return NextResponse.redirect(
      `${origin}/integrations/google?error=${encodeURIComponent(e instanceof Error ? e.message : "OAuth gagal.")}`
    );
  }
}
