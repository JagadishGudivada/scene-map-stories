import { useParams } from "react-router-dom";
import SitePage from "./SitePage";
import { sitePages, type SitePageSlug } from "./sitePagesContent";
import NotFound from "./NotFound";

export default function SitePageRoute() {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? sitePages[slug as SitePageSlug] : undefined;
  if (!page) return <NotFound />;
  return <SitePage {...page} sections={[...page.sections] as any} />;
}
