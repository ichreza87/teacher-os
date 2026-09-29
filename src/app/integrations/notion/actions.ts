"use server";

import { redirect } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import { ingestText } from "@/knowledge/ingest";
import { disconnectProvider, getDecryptedToken } from "@/integrations/secrets";
import { createNotionClient, exportText, fetchPageText } from "@/integrations/notion/client";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function notionClient() {
  const res = await getSchoolContext();
  if (!res.ok) fail("/integrations/notion", res.message);
  const token = await getDecryptedToken(res.ctx.supabase, res.ctx.userId, "notion");
  if (!token) fail("/integrations/notion", "Notion belum terhubung. Hubungkan dulu di halaman ini.");
  return { ...res.ctx, notion: createNotionClient(token) };
}

export async function importNotionPage(pageId: string): Promise<never> {
  const ctx = await notionClient();
  const externalId = `notion:${pageId.replace(/-/g, "")}`;

  // Avoid duplicate records: re-import is rejected with an honest message.
  const { data: existing } = await ctx.supabase
    .from("knowledge_documents")
    .select("id, title")
    .eq("owner_user_id", ctx.userId)
    .eq("external_id", externalId)
    .maybeSingle();
  if (existing) fail("/integrations/notion", `Halaman ini sudah diimpor sebagai "${(existing as { title: string }).title}".`);

  let title: string;
  let text: string;
  try {
    ({ title, text } = await fetchPageText(ctx.notion, pageId));
  } catch (e) {
    fail("/integrations/notion", `Gagal membaca halaman Notion: ${e instanceof Error ? e.message : "unknown"}.`);
  }
  if (!text.trim()) fail("/integrations/notion", "Halaman Notion kosong — tidak ada teks untuk diimpor.");

  let docId: string;
  try {
    docId = await ingestText(ctx.supabase, {
      ownerId: ctx.userId,
      userId: ctx.userId,
      teacherId: ctx.teacherId,
      schoolId: ctx.schoolId,
      title,
      text,
      source: "import",
      externalId,
    });
  } catch (e) {
    fail("/integrations/notion", e instanceof Error ? e.message : "Impor gagal.");
  }
  redirect(`/knowledge/${docId}?imported=notion`);
}

export async function exportToNotion(formData: FormData): Promise<never> {
  const ctx = await notionClient();
  const parentPageId = String(formData.get("parentPageId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!parentPageId || !title || !content) {
    fail("/integrations/notion", "ID halaman induk, judul, dan isi wajib diisi.");
  }
  try {
    const url = await exportText(ctx.notion, parentPageId, title, content);
    redirect(`/integrations/notion?exported=${encodeURIComponent(url)}`);
  } catch (e) {
    fail("/integrations/notion", `Export gagal: ${e instanceof Error ? e.message : "unknown"}.`);
  }
}

export async function searchAction(formData: FormData): Promise<never> {
  const q = String(formData.get("q") ?? "").trim();
  redirect(`/integrations/notion${q ? `?q=${encodeURIComponent(q)}` : ""}`);
}

export async function disconnectNotion(): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/integrations/notion", res.message);
  await disconnectProvider(res.ctx.supabase, res.ctx.userId, "notion");
  redirect("/integrations/notion?disconnected=1");
}
