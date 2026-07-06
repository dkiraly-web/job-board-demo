import Link from "next/link";
import {
  fetchAllPostings,
  fetchJobFunctionOptions,
  fetchPostings,
  type JobPosting,
} from "@/lib/smartrecruiters";
import { formatDate, formatLocation } from "@/lib/format";

const PAGE_SIZE = 20;

interface HomeProps {
  searchParams: Promise<{
    q?: string;
    country?: string;
    city?: string;
    function?: string;
    page?: string;
  }>;
}

function matchesText(haystack: string | undefined, needle: string): boolean {
  return (haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const jobFunctionOptions = await fetchJobFunctionOptions();

  let totalFound: number;
  let content: JobPosting[];

  if (params.function) {
    // The API doesn't support filtering by function server-side, so filter
    // the full posting set in memory instead.
    const allPostings = await fetchAllPostings();
    const filtered = allPostings.filter((job) => {
      if (job.function?.id !== params.function) return false;
      if (params.q && !matchesText(job.name, params.q)) return false;
      if (params.city && !matchesText(job.location.city, params.city)) return false;
      if (params.country && !matchesText(job.location.country, params.country)) return false;
      return true;
    });
    totalFound = filtered.length;
    content = filtered.slice(offset, offset + PAGE_SIZE);
  } else {
    const data = await fetchPostings({
      q: params.q,
      country: params.country,
      city: params.city,
      limit: PAGE_SIZE,
      offset,
    });
    totalFound = data.totalFound;
    content = data.content;
  }

  const totalPages = Math.max(1, Math.ceil(totalFound / PAGE_SIZE));

  const buildPageHref = (targetPage: number) => {
    const usp = new URLSearchParams();
    if (params.q) usp.set("q", params.q);
    if (params.country) usp.set("country", params.country);
    if (params.city) usp.set("city", params.city);
    if (params.function) usp.set("function", params.function);
    if (targetPage > 1) usp.set("page", String(targetPage));
    const qs = usp.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold text-zinc-900">Open roles at Bosch Group</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {totalFound.toLocaleString()} open positions worldwide
      </p>

      <form className="mt-6 flex flex-wrap gap-3" action="/" method="get">
        <input
          type="text"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search job titles or keywords"
          className="min-w-[200px] flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input
          type="text"
          name="city"
          defaultValue={params.city ?? ""}
          placeholder="City"
          className="w-40 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input
          type="text"
          name="country"
          defaultValue={params.country ?? ""}
          placeholder="Country code (e.g. us, de, br)"
          className="w-56 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          name="function"
          defaultValue={params.function ?? ""}
          className="w-56 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All job functions</option>
          {jobFunctionOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Search
        </button>
      </form>

      <ul className="mt-8 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {content.map((job) => (
          <li key={job.id}>
            <Link
              href={`/jobs/${job.id}`}
              className="flex flex-col gap-1 px-5 py-4 hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-zinc-900">{job.name}</p>
                <p className="text-sm text-zinc-500">{formatLocation(job.location)}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500 sm:flex-col sm:items-end">
                {job.typeOfEmployment?.label && <span>{job.typeOfEmployment.label}</span>}
                <span>Posted {formatDate(job.releasedDate)}</span>
              </div>
            </Link>
          </li>
        ))}
        {content.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-zinc-500">
            No roles match your search. Try different keywords or location.
          </li>
        )}
      </ul>

      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-zinc-500">
          Page {page} of {totalPages.toLocaleString()}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={buildPageHref(page - 1)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100"
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={buildPageHref(page + 1)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
