"use client";
import { startTransition, useActionState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";

type S = { error?: string; ok?: string } | undefined;

/**
 * Like useActionState, but keeps what the user typed when the server returns an error
 * (React 19 resets uncontrolled forms after a form action by default).
 */
export function useForm(action: (s: S, fd: FormData) => Promise<S>, confirmMsg?: string) {
  const [state, run, pending] = useActionState(action, undefined);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (confirmMsg && !confirm(confirmMsg)) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => run(fd));
  };
  return { state, onSubmit, pending };
}

export function Submit({ children, className = "btn-green", pendingText = "Saving…", pending: p }: { children: React.ReactNode; className?: string; pendingText?: string; pending?: boolean }) {
  const { pending: fp } = useFormStatus();
  const pending = p ?? fp;
  return <button type="submit" disabled={pending} className={className}>{pending ? pendingText : children}</button>;
}

export function Msg({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200">{state.ok}</p>;
  return null;
}

/** A button inside a <form action={serverAction}> that asks for confirmation first. */
export function ConfirmButton({ children, message, className = "btn-red btn-sm" }: { children: React.ReactNode; message: string; className?: string }) {
  return <button type="submit" className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>;
}
