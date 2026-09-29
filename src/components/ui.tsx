import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, desc, actionHref, actionLabel }: {
  title: string;
  desc?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {desc && <p className="mt-1 text-sm text-gray-600">{desc}</p>}
      </div>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="shrink-0 rounded bg-black px-4 py-2 text-sm text-white">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ title, desc, actionHref, actionLabel }: {
  title: string;
  desc?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mt-4 rounded border p-6 text-center">
      <p className="font-medium">{title}</p>
      {desc && <p className="mt-1 text-sm text-gray-600">{desc}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mt-3 inline-block rounded bg-black px-4 py-2 text-sm text-white">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function Field({ label, htmlFor, children, hint }: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export const inputCls = "w-full rounded border px-3 py-2";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
      {message}
    </p>
  );
}

export function ContextNote({ reason, message }: { reason: string; message: string }) {
  const href = reason === "login" ? "/login" : "/onboarding";
  const label = reason === "login" ? "Masuk" : "Lengkapi Onboarding";
  return (
    <main className="p-8">
      <div className="max-w-xl rounded border p-4">
        <p className="font-medium">{message}</p>
        <Link href={href} className="mt-3 inline-block rounded bg-black px-4 py-2 text-sm text-white">
          {label}
        </Link>
      </div>
    </main>
  );
}
