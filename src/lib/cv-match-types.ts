import type { JobLocation } from "@/lib/smartrecruiters";

export interface CvMatchJob {
  id: string;
  name: string;
  location: JobLocation;
  department?: string;
  function?: string;
  typeOfEmployment?: string;
  releasedDate: string;
}

export interface CvMatchResult {
  job: CvMatchJob;
  skillScore: 1 | 2 | 3 | 4 | 5;
  skillRationale: string;
  locationScore: 1 | 2 | 3;
  locationLabel: string;
}

export interface CvMatchResponse {
  detectedCountryCode: string | null;
  detectedCountryName: string | null;
  countryConfidence: "high" | "medium" | "low";
  keySkills: string[];
  summary: string;
  results: CvMatchResult[];
  consideredCount: number;
  totalOpenRoles: number;
}
