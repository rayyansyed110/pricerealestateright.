import { ForgotForm } from "@/components/AuthForms";
export const metadata = { title: "Reset Password" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  void sp;
  return (
    <div className="container-x flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="mb-1 text-2xl font-extrabold text-navy-900">Reset Password</h1>
        <p className="mb-6 text-sm text-slate-500">Enter your email and we will send you a reset link.</p>
        <ForgotForm />
      </div>
    </div>
  );
}
