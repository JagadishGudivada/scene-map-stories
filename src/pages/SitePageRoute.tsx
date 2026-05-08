import { useLocation } from "react-router-dom";
import SitePage from "./SitePage";
import { sitePages, type SitePageSlug } from "./sitePagesContent";
import NotFound from "./NotFound";

export default function SitePageRoute() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, "").replace(/\/$/, "") as SitePageSlug;
  const page = sitePages[slug];
  if (!page) return <NotFound />;
  return <SitePage {...page} sections={[...page.sections] as any} />;
}
