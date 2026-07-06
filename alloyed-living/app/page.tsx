import { getProducts } from "@/src/lib/data/products"
import { getContentPage } from "@/src/lib/data/content"
import type { HomePageContent } from "@/src/lib/data/types"
import HomePageView from "./HomePageView"

// ISR: dashboard edits appear within a minute without paying a Supabase
// round-trip on every request (the dashboard is a separate app, so its
// revalidatePath calls can never reach this one anyway).
export const revalidate = 60

export default async function HomePage() {
  const [products, page] = await Promise.all([
    getProducts(),
    getContentPage<HomePageContent>("home"),
  ])
  return <HomePageView products={products} content={page!.fields} />
}
