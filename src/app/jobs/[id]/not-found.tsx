import Link from "next/link";

export default function JobNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-zinc-900">Job not found</h1>
      <p className="mt-2 text-zinc-500">
        This posting may have closed or the link is incorrect.
      </p>
      <Link href="/" className="mt-6 inline-block text-indigo-600 hover:underline">
        ← Back to all roles
      </Link>
    </div>
  );
}
