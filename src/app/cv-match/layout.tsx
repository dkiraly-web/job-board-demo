import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Match my CV — Bosch Group Careers",
  description: "Upload your CV to find the closest-matching open Bosch Group roles.",
};

export default function CvMatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
