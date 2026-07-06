import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPosting } from "@/lib/smartrecruiters";
import { formatDate, formatLocation } from "@/lib/format";

interface JobPageProps {
  params: Promise<{ id: string }>;
}

const SECTION_ORDER = [
  "companyDescription",
  "jobDescription",
  "qualifications",
  "additionalInformation",
];

export async function generateMetadata({ params }: JobPageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await fetchPosting(id);
  if (!job) return { title: "Job not found — Bosch Group Careers" };
  return {
    title: `${job.name} — Bosch Group Careers`,
    description: formatLocation(job.location),
  };
}

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params;
  const job = await fetchPosting(id);
  if (!job) notFound();

  const sections = job.jobAd?.sections ?? {};
  const orderedSectionKeys = [
    ...SECTION_ORDER.filter((key) => sections[key]?.text),
    ...Object.keys(sections).filter(
      (key) => !SECTION_ORDER.includes(key) && sections[key]?.text
    ),
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-indigo-600 hover:underline">
        ← Back to all roles
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-zinc-900">{job.name}</h1>
      <p className="mt-1 text-zinc-500">{formatLocation(job.location)}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {job.typeOfEmployment?.label && (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
            {job.typeOfEmployment.label}
          </span>
        )}
        {job.experienceLevel?.label && (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
            {job.experienceLevel.label}
          </span>
        )}
        {job.industry?.label && (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
            {job.industry.label}
          </span>
        )}
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
          Posted {formatDate(job.releasedDate)}
        </span>
      </div>

      <a
        href={job.applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-block rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Apply on SmartRecruiters
      </a>

      <div className="mt-8 space-y-8">
        {orderedSectionKeys.map((key) => {
          const section = sections[key];
          if (!section?.text) return null;
          return (
            <section key={key}>
              <h2 className="text-lg font-semibold text-zinc-900">{section.title}</h2>
              <div
                className="job-content mt-2 text-sm leading-relaxed text-zinc-700"
                dangerouslySetInnerHTML={{ __html: section.text }}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
