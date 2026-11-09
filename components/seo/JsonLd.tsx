// components/seo/JsonLd.tsx
//
// The one place a JSON-LD <script> is rendered. Server component: the data is in
// the HTML the crawler receives. `serializeLd` keeps the payload valid JSON that
// can never close the script tag.

import { serializeLd } from "@/lib/seo/jsonld";

export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeLd(data) }} />;
}
