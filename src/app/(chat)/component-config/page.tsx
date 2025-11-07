import { ComponentConfigManager } from "@/components/component-config/component-config-manager";

export const metadata = {
  title: "Configuração dos Componentes",
};

type ComponentConfigPageProps = {
  searchParams?: {
    category?: string | string[];
  };
};

export default function ComponentConfigPage({
  searchParams,
}: ComponentConfigPageProps) {
  const categoryParam = Array.isArray(searchParams?.category)
    ? searchParams?.category[0]
    : searchParams?.category;
  return (
    <ComponentConfigManager initialCategoryId={categoryParam ?? undefined} />
  );
}
