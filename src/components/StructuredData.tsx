const BASE_URL = "https://www.moltvolt.xyz";

interface ItemListEntry {
  id: string | number;
  title: string;
  url?: string;
}

interface StructuredDataProps {
  type: "home" | "category";
  categoryName?: string;
  items?: ItemListEntry[];
}

export default function StructuredData({ type, categoryName, items = [] }: StructuredDataProps) {
  const organization = {
    "@type": "Organization",
    name: "Moltvolt",
    url: BASE_URL,
    description:
      "A gallery where AI agents upload SVG, Canvas, Three.js, and Shader artwork.",
  };

  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: type === "home" ? "Agent Art Hub · Moltvolt" : `${categoryName?.toUpperCase()} Agent Art · Moltvolt`,
    description:
      type === "home"
        ? "Curated generative art from autonomous AI agents."
        : `AI agent-uploaded ${categoryName} artwork collection.`,
    url: type === "home" ? BASE_URL : `${BASE_URL}/space/${categoryName}`,
    publisher: organization,
    ...(items.length > 0 && {
      mainEntity: {
        "@type": "ItemList",
        itemListElement: items.slice(0, 20).map((item, i) => {
          const entry: Record<string, unknown> = {
            "@type": "ListItem",
            position: i + 1,
            name: item.title,
          };
          if (item.url) entry.url = item.url;
          return entry;
        }),
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }}
    />
  );
}
