import Link from "next/link";
import { redirect } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { appendMessage } from "@/ai/memory/store";
import { ContextNote, EmptyState, FormError, PageHeader, inputCls } from "@/components/ui";
import { createConversation, processUserMessage } from "@/modules/workspace/actions";

export default async function WorkspacePage({ searchParams }: { searchParams: { error?: string; ask?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">AI Workspace</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, userId } = res.ctx;

  // Command-palette flow: /workspace?ask=... creates a conversation and processes the first message.
  const ask = (searchParams.ask ?? "").trim();
  if (ask) {
    const { data: conv, error } = await supabase
      .from("ai_conversations")
      .insert({ owner_user_id: userId, title: ask.slice(0, 60) })
      .select("id")
      .single();
    if (error || !conv) redirect(`/workspace?error=${encodeURIComponent(error?.message ?? "Gagal membuat percakapan.")}`);
    const id = conv.id as string;
    await appendMessage(supabase, id, "user", ask);
    await processUserMessage(res.ctx, id, ask);
    redirect(`/workspace/${id}`);
  }

  const { data: convs } = await supabase
    .from("ai_conversations")
    .select("id, title, updated_at")
    .eq("owner_user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <main className="p-8">
      <PageHeader title="AI Workspace" desc="Ruang kerja produktivitas: chat, usulan aksi, pratinjau, konfirmasi." />
      <FormError message={searchParams.error} />
      <form action={createConversation} className="mt-4 flex max-w-xl gap-2">
        <input name="firstMessage" placeholder="Jelaskan apa yang ingin Anda kerjakan..." aria-label="Pesan pertama"
          className={inputCls} autoComplete="off" />
        <button type="submit" className="shrink-0 rounded bg-black px-4 py-2 text-sm text-white">Mulai</button>
      </form>
      {(convs ?? []).length === 0 ? (
        <EmptyState title="Belum ada percakapan." desc="Mulai percakapan pertama dengan AI Teacher Workspace." />
      ) : (
        <ul className="mt-4 max-w-3xl divide-y rounded border">
          {(convs ?? []).map((c) => (
            <li key={c.id}>
              <Link href={`/workspace/${c.id}`} className="block px-4 py-2 hover:bg-gray-50">
                <span className="font-medium">{c.title}</span>
                <span className="ml-2 text-sm text-gray-500">{new Date(c.updated_at).toLocaleString("id-ID")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
