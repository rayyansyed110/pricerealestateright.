import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/AuthForms";
export const metadata = { title: "Create Your Free Account" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect("/");
  return (
    <div className="container-x flex justify-center py-12">
      <div className="card w-full max-w-xl p-6 sm:p-8">
        <h1 className="mb-1 text-2xl font-extrabold text-navy-900">Create Your Free Account</h1>
        <p className="mb-6 text-sm text-slate-500">Guess home prices, climb the ladder and win cash.</p>
        <RegisterForm next={sp.next} agent={sp.agent === "1"} />
      </div>
    </div>
  );
}
