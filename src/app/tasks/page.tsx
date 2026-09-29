import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, Field, FormError, inputCls } from "@/components/ui";
import { createTask, cycleTask, deleteTask } from "@/modules/tasks/actions";

const STATUS_LABEL: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };

export default async function TasksPage({ searchParams }: { searchParams: { error?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Tasks</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { data: tasks } = await res.ctx.supabase
    .from("tasks")
    .select("id, title, description, status, due_on")
    .eq("owner_user_id", res.ctx.userId)
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const today = new Date().toISOString().slice(0, 10);
  const grouped = {
    todo: (tasks ?? []).filter((t) => t.status === "todo"),
    in_progress: (tasks ?? []).filter((t) => t.status === "in_progress"),
    done: (tasks ?? []).filter((t) => t.status === "done"),
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      <p className="mt-1 text-sm text-gray-600">Daftar kerja pribadi Anda.</p>
      <FormError message={searchParams.error} />

      <form action={createTask} className="mt-4 max-w-xl space-y-3 rounded border p-4">
        <p className="font-medium">Tambah tugas</p>
        <Field label="Judul" htmlFor="title">
          <input id="title" name="title" required className={inputCls} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jatuh tempo (opsional)" htmlFor="dueOn">
            <input id="dueOn" name="dueOn" type="date" className={inputCls} />
          </Field>
          <Field label="Catatan (opsional)" htmlFor="description">
            <input id="description" name="description" className={inputCls} autoComplete="off" />
          </Field>
        </div>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Tambah</button>
      </form>

      <div className="mt-6 grid max-w-4xl gap-4 md:grid-cols-3">
        {(Object.keys(grouped) as (keyof typeof grouped)[]).map((status) => (
          <section key={status} className="rounded border p-3">
            <p className="font-medium">{STATUS_LABEL[status]} ({grouped[status].length})</p>
            <ul className="mt-2 space-y-2 text-sm">
              {grouped[status].map((t) => {
                const overdue = t.status !== "done" && t.due_on && t.due_on < today;
                return (
                  <li key={t.id} className="rounded border px-3 py-2">
                    <p className="font-medium">{t.title}</p>
                    {t.description && <p className="text-gray-600">{t.description}</p>}
                    {t.due_on && (
                      <p className={overdue ? "text-red-600" : "text-gray-500"}>
                        {overdue ? "Terlambat: " : ""}{t.due_on}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <form action={cycleTask.bind(null, t.id)}>
                        <button type="submit" className="rounded border px-2 py-1 text-xs">Geser status</button>
                      </form>
                      <form action={deleteTask.bind(null, t.id)} className="flex items-center gap-1">
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" name="confirm" value="ya" aria-label={`Konfirmasi hapus ${t.title}`} /> ya, hapus
                        </label>
                        <button type="submit" className="rounded border px-2 py-1 text-xs">Hapus</button>
                      </form>
                    </div>
                  </li>
                );
              })}
              {grouped[status].length === 0 && <li className="text-sm text-gray-500">Kosong.</li>}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
