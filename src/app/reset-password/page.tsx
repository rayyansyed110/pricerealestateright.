import { ResetForm } from "@/components/AuthForms";
export const metadata = { title: "Choose a New Password" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  
  return (
    <div className="container-x flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="mb-1 text-2xl font-extrabold text-navy-900">Choose a New Password</h1>
        <p className="mb-6 text-sm text-slate-500">Pick a strong password you don&apos;t use elsewhere.</p>
        {sp.token ? <ResetForm token={sp.token} /> : <p className="text-sm text-red-600">Missing reset token.</p>}
      </div>
    </div>
  );
}
