import Link from "next/link";
export default function NotFound() {
  return <div className="container-x py-24 text-center"><h1 className="text-4xl font-black text-navy-900">Page not found</h1><p className="mt-2 text-slate-500">That home may have been removed.</p><Link href="/" className="btn-green mt-6">Back to games</Link></div>;
}
