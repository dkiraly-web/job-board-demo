const COMPANY_IDENTIFIER = "BoschGroup";
const API_BASE = `https://api.smartrecruiters.com/v1/companies/${COMPANY_IDENTIFIER}`;

export interface JobLocation {
  city?: string;
  region?: string;
  country?: string;
  fullLocation?: string;
  remote?: boolean;
  hybrid?: boolean;
}

export interface JobTaxonomy {
  id?: string;
  label?: string;
}

export interface JobPosting {
  id: string;
  name: string;
  refNumber?: string;
  releasedDate: string;
  location: JobLocation;
  department?: JobTaxonomy;
  function?: JobTaxonomy;
  typeOfEmployment?: JobTaxonomy;
  experienceLevel?: JobTaxonomy;
  industry?: JobTaxonomy;
}

export interface JobPostingsResponse {
  offset: number;
  limit: number;
  totalFound: number;
  content: JobPosting[];
}

export interface JobAdSection {
  title: string;
  text: string;
}

export interface JobPostingDetail extends JobPosting {
  applyUrl: string;
  postingUrl: string;
  language?: { label: string };
  jobAd?: {
    sections: Record<string, JobAdSection | undefined>;
  };
}

export interface FetchPostingsParams {
  q?: string;
  country?: string;
  city?: string;
  limit?: number;
  offset?: number;
}

const REVALIDATE_SECONDS = 300;

export async function fetchPostings(
  params: FetchPostingsParams = {}
): Promise<JobPostingsResponse> {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.country) usp.set("country", params.country);
  if (params.city) usp.set("city", params.city);
  usp.set("limit", String(params.limit ?? 20));
  usp.set("offset", String(params.offset ?? 0));

  const res = await fetch(`${API_BASE}/postings?${usp.toString()}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch postings (${res.status})`);
  }
  return res.json();
}

export async function fetchPosting(id: string): Promise<JobPostingDetail | null> {
  const res = await fetch(`${API_BASE}/postings/${id}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch posting ${id} (${res.status})`);
  }
  return res.json();
}

// The public postings search endpoint silently ignores a "function" filter
// (unlike "department", which 400s on non-UUID values), so job-function
// filtering has to happen client-side against the full posting set.
const BULK_PAGE_SIZE = 100;

export async function fetchAllPostings(): Promise<JobPosting[]> {
  const first = await fetchPostings({ limit: BULK_PAGE_SIZE, offset: 0 });
  const offsets: number[] = [];
  for (let offset = BULK_PAGE_SIZE; offset < first.totalFound; offset += BULK_PAGE_SIZE) {
    offsets.push(offset);
  }
  const rest = await Promise.all(
    offsets.map((offset) => fetchPostings({ limit: BULK_PAGE_SIZE, offset }))
  );
  return [first, ...rest].flatMap((page) => page.content);
}

export interface JobFunctionOption {
  id: string;
  label: string;
  count: number;
}

export async function fetchJobFunctionOptions(): Promise<JobFunctionOption[]> {
  const postings = await fetchAllPostings();
  const counts = new Map<string, JobFunctionOption>();
  for (const posting of postings) {
    const fn = posting.function;
    if (!fn?.id) continue;
    const existing = counts.get(fn.id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(fn.id, { id: fn.id, label: fn.label ?? fn.id, count: 1 });
    }
  }
  return Array.from(counts.values()).sort((a, b) => a.label.localeCompare(b.label));
}
