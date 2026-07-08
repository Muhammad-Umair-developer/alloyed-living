import type { Metadata } from "next"
import OurStoryPageView from "./OurStoryPageView"

export const metadata: Metadata = {
  title: "Our Story — Alloyed Living",
  description:
    "Home decor made from strong steel. The story of Alloyed Living — Pakistan's steel home decor brand.",
}

export default function OurStoryPage() {
  return <OurStoryPageView />
}
