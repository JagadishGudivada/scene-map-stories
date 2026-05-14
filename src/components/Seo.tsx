import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface SeoProps {
  title: string;
  description: string;
  type?: "website" | "article" | "video.movie";
  image?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  canonicalPath?: string;
}

const SITE_NAME = "Sarevista";

export default function Seo({
  title,
  description,
  type = "website",
  image,
  jsonLd,
  canonicalPath,
}: SeoProps) {
  const { pathname } = useLocation();
  const path = canonicalPath ?? pathname;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const desc = description.slice(0, 160);
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={path} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={path} />
      <meta property="og:site_name" content={SITE_NAME} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}
      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
