"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CvMatchResponse, CvMatchResult } from "@/lib/cv-match-types";
import { getLocationScore } from "@/lib/regions";
import { formatDate, formatLocation } from "@/lib/format";

function SkillDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Skill match ${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-2.5 w-2.5 rounded-full ${n <= score ? "bg-indigo-600" : "bg-zinc-200"}`}
        />
      ))}
    </div>
  );
}

function LocationBadge({ score, label }: { score: number; label: string }) {
  const colors =
    score === 3
      ? "bg-emerald-100 text-emerald-800"
      : score === 2
        ? "bg-amber-100 text-amber-800"
        : "bg-zinc-100 text-zinc-600";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${colors}`}>{label}</span>
  );
}

export default function CvMatchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CvMatchResponse | null>(null);
  const [countryOverride, setCountryOverride] = useState("");

  const effectiveCountry = countryOverride.trim().toLowerCase() || data?.detectedCountryCode || null;

  const displayResults: CvMatchResult[] = useMemo(() => {
    if (!data) return [];
    if (!countryOverride.trim()) return data.results;
    return data.results
      .map((r) => {
        const location = getLocationScore(effectiveCountry, r.job.location.country);
        return { ...r, locationScore: location.score, locationLabel: location.label };
      })
      .sort((a, b) => {
        if (b.skillScore !== a.skillScore) return b.skillScore - a.skillScore;
        if (b.locationScore !== a.locationScore) return b.locationScore - a.locationScore;
        return new Date(b.job.releasedDate).getTime() - new Date(a.job.releasedDate).getTime();
      });
  }, [data, countryOverride, effectiveCountry]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setData(null);
    setCountryOverride("");

    try {
      const formData = new FormData();
      formData.set("cv", file);
      const res = await fetch("/api/cv-match", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      setData(json as CvMatchResponse);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-zinc-900">Match my CV to open roles</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Upload your CV and we&apos;ll compare it against every live Bosch Group role to find your
        closest matches — skill fit scored 1–5, location scored 1–3.
      </p>
      <p className="mt-2 text-xs text-zinc-400">
        Your CV is sent to Claude (Anthropic) to generate this match list and is not stored or
        logged by this app.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {loading ? "Matching…" : "Find matching roles"}
        </button>
      </form>

      {loading && (
        <p className="mt-6 text-sm text-zinc-500">
          Reading your CV and comparing it against thousands of open roles — this can take up to
          20 seconds…
        </p>
      )}

      {error && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {data && (
        <div className="mt-8">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-700">{data.summary}</p>
            <p className="mt-2 text-sm text-zinc-500">
              Detected location:{" "}
              <span className="font-medium text-zinc-700">
                {data.detectedCountryName ?? "Unknown"}
              </span>{" "}
              {data.detectedCountryName && `(${data.countryConfidence} confidence)`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label htmlFor="country-override" className="text-xs text-zinc-500">
                Not right? Enter your country code (e.g. de, us, in):
              </label>
              <input
                id="country-override"
                type="text"
                maxLength={2}
                value={countryOverride}
                onChange={(e) => setCountryOverride(e.target.value)}
                placeholder={data.detectedCountryCode ?? "us"}
                className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-xs uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Considered your top {data.consideredCount} keyword/location matches out of{" "}
              {data.totalOpenRoles.toLocaleString()} open roles worldwide.
            </p>
          </div>

          <ul className="mt-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {displayResults.map((r) => (
              <li key={r.job.id} className="px-5 py-4">
                <Link
                  href={`/jobs/${r.job.id}`}
                  className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{r.job.name}</p>
                    <p className="text-sm text-zinc-500">{formatLocation(r.job.location)}</p>
                    <p className="mt-1 text-xs text-zinc-500">{r.skillRationale}</p>
                    <p className="mt-1 text-xs text-zinc-400">Posted {formatDate(r.job.releasedDate)}</p>
                  </div>
                  <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-end">
                    <SkillDots score={r.skillScore} />
                    <LocationBadge score={r.locationScore} label={r.locationLabel} />
                  </div>
                </Link>
              </li>
            ))}
            {displayResults.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-zinc-500">
                No close matches found.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
