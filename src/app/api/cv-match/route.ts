import { fetchAllPostings, fetchPosting, type JobPosting } from "@/lib/smartrecruiters";
import { extractCvText, CvParseError } from "@/lib/cv-text";
import { extractCvProfile, scoreJobMatches, ClaudeConfigError, type JobForScoring } from "@/lib/claude";
import { getLocationScore } from "@/lib/regions";
import { stripHtml } from "@/lib/strip-html";
import type { CvMatchResponse, CvMatchResult } from "@/lib/cv-match-types";

const SHORTLIST_SIZE = 35;
const MAX_DESCRIPTION_CHARS = 1500;

function jobSearchableText(job: JobPosting): string {
  return [
    job.name,
    job.department?.label,
    job.function?.label,
    job.industry?.label,
    job.experienceLevel?.label,
    job.typeOfEmployment?.label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function keywordRelevance(job: JobPosting, keySkills: string[]): number {
  const haystack = jobSearchableText(job);
  let hits = 0;
  for (const skill of keySkills) {
    if (skill.length >= 3 && haystack.includes(skill.toLowerCase())) hits += 1;
  }
  return hits;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Expected multipart/form-data with a 'cv' file field.", 400);
  }

  const file = formData.get("cv");
  if (!(file instanceof File)) {
    return jsonError("Missing 'cv' file in the upload.", 400);
  }

  let cvText: string;
  try {
    cvText = await extractCvText(file);
  } catch (err) {
    if (err instanceof CvParseError) return jsonError(err.message, 400);
    throw err;
  }

  try {
    const profile = await extractCvProfile(cvText);
    const candidateCountry = profile.countryCode;

    const allPostings = await fetchAllPostings();

    const preRanked = allPostings
      .map((job) => {
        const relevance = keywordRelevance(job, profile.keySkills);
        const location = getLocationScore(candidateCountry, job.location.country);
        return { job, relevance, preRank: relevance * 2 + location.score };
      })
      .sort((a, b) => b.preRank - a.preRank)
      .slice(0, SHORTLIST_SIZE);

    const details = await Promise.all(
      preRanked.map(({ job }) => fetchPosting(job.id))
    );

    const jobsForScoring: JobForScoring[] = [];
    const detailById = new Map<string, (typeof details)[number]>();
    for (const detail of details) {
      if (!detail) continue;
      detailById.set(detail.id, detail);
      const sections = detail.jobAd?.sections ?? {};
      const description = Object.values(sections)
        .filter((s): s is NonNullable<typeof s> => Boolean(s?.text))
        .map((s) => stripHtml(s.text))
        .join("\n\n")
        .slice(0, MAX_DESCRIPTION_CHARS);

      jobsForScoring.push({
        id: detail.id,
        title: detail.name,
        department: detail.department?.label,
        function: detail.function?.label,
        description: description || "(no description provided)",
      });
    }

    const scored = await scoreJobMatches(cvText, jobsForScoring);
    const scoreById = new Map(scored.map((s) => [s.id, s]));

    const results: CvMatchResult[] = [];
    for (const { job } of preRanked) {
      const detail = detailById.get(job.id);
      if (!detail) continue;
      const score = scoreById.get(job.id);
      if (!score) continue;
      const location = getLocationScore(candidateCountry, job.location.country);

      results.push({
        job: {
          id: job.id,
          name: job.name,
          location: job.location,
          department: job.department?.label,
          function: job.function?.label,
          typeOfEmployment: job.typeOfEmployment?.label,
          releasedDate: job.releasedDate,
        },
        skillScore: score.score,
        skillRationale: score.rationale,
        locationScore: location.score,
        locationLabel: location.label,
      });
    }

    results.sort((a, b) => {
      if (b.skillScore !== a.skillScore) return b.skillScore - a.skillScore;
      if (b.locationScore !== a.locationScore) return b.locationScore - a.locationScore;
      return new Date(b.job.releasedDate).getTime() - new Date(a.job.releasedDate).getTime();
    });

    const response: CvMatchResponse = {
      detectedCountryCode: profile.countryCode,
      detectedCountryName: profile.countryName,
      countryConfidence: profile.confidence,
      keySkills: profile.keySkills,
      summary: profile.summary,
      results,
      consideredCount: jobsForScoring.length,
      totalOpenRoles: allPostings.length,
    };

    return Response.json(response);
  } catch (err) {
    if (err instanceof ClaudeConfigError) return jsonError(err.message, 503);
    console.error("cv-match failed", err);
    return jsonError("Something went wrong while matching your CV. Please try again.", 500);
  }
}
