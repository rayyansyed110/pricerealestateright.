import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForms";
export const metadata = { title: "Sign In" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect(sp.next?.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/");
  return (
    <div className="container-x flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="mb-1 text-2xl font-extrabold text-navy-900">Sign In</h1>
        <p className="mb-6 text-sm text-slate-500">Welcome back! Sign in to place your guesses.</p>
        <LoginForm next={sp.next} />
      </div>
    </div>
  );
}
