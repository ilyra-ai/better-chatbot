import { promises as fs } from "fs";
import type { Dirent } from "fs";
import path from "path";

export type ComponentCategory = {
  id: string;
  label: string;
  description: string;
  directory: string;
  excludeTopLevel?: Set<string>;
};

export type ComponentCategorySummary = {
  id: string;
  label: string;
  description: string;
  totalFiles: number;
};

export type ComponentFileSummary = {
  path: string;
  name: string;
  size: number;
  updatedAt: number;
};

const componentsRoot = path.join(process.cwd(), "src/components");

const componentCategories: ComponentCategory[] = [
  {
    id: "structural",
    label: "Estrutural",
    description:
      "Componentes essenciais compartilhados em toda a aplicação, base da experiência do usuário.",
    directory: componentsRoot,
    excludeTopLevel: new Set([
      "admin",
      "agent",
      "auth",
      "export",
      "layouts",
      "tool-invocation",
      "ui",
      "user",
    ]),
  },
  {
    id: "administrador",
    label: "Administrador",
    description: "Painéis e elementos exclusivos da administração do sistema.",
    directory: path.join(componentsRoot, "admin"),
  },
  {
    id: "agentes",
    label: "Agentes",
    description: "Gestão completa dos agentes inteligentes e suas interações.",
    directory: path.join(componentsRoot, "agent"),
  },
  {
    id: "autenticacao",
    label: "Autenticação",
    description:
      "Fluxos de entrada, cadastro e segurança de acesso dos usuários.",
    directory: path.join(componentsRoot, "auth"),
  },
  {
    id: "exportacao",
    label: "Exportação",
    description:
      "Ferramentas de exportação de dados e históricos da plataforma.",
    directory: path.join(componentsRoot, "export"),
  },
  {
    id: "layouts",
    label: "Layouts",
    description:
      "Estruturas visuais completas que organizam páginas e painéis.",
    directory: path.join(componentsRoot, "layouts"),
  },
  {
    id: "ferramentas",
    label: "Ferramentas",
    description:
      "Invocações e integrações com ferramentas externas e internas.",
    directory: path.join(componentsRoot, "tool-invocation"),
  },
  {
    id: "ui-ux",
    label: "UI / UX",
    description:
      "Biblioteca de componentes visuais reutilizáveis e estilização avançada.",
    directory: path.join(componentsRoot, "ui"),
  },
  {
    id: "detalhes-usuarios",
    label: "Detalhes dos Usuários",
    description:
      "Componentes dedicados a perfis, preferências e dados dos usuários.",
    directory: path.join(componentsRoot, "user", "user-detail"),
  },
  {
    id: "workflow",
    label: "WorkFlow",
    description:
      "Orquestração e configuração completa dos fluxos de trabalho inteligentes.",
    directory: path.join(componentsRoot, "user", "workflow"),
  },
];

const categoriesById = new Map(
  componentCategories.map((category) => [category.id, category]),
);

function ensureCategory(id: string) {
  const category = categoriesById.get(id);
  if (!category) {
    throw new Error("Categoria inválida");
  }
  return category;
}

function toPosix(value: string) {
  return value.split(path.sep).join("/");
}

function normalizeRelativePath(value: string) {
  const normalized = toPosix(value.trim());
  const stripped = normalized.replace(/^\/+/g, "");
  if (!stripped) {
    throw new Error("Caminho inválido");
  }
  if (stripped.includes("..")) {
    throw new Error("O caminho não pode retroceder pastas");
  }
  return stripped;
}

function validateStructuralPath(
  category: ComponentCategory,
  relativePath: string,
) {
  if (!category.excludeTopLevel?.size) {
    return;
  }
  const [firstSegment] = relativePath.split("/");
  if (firstSegment && category.excludeTopLevel.has(firstSegment)) {
    throw new Error("O caminho selecionado pertence a outro agrupamento");
  }
}

function resolveFilePath(category: ComponentCategory, relativePath: string) {
  const cleanPath = normalizeRelativePath(relativePath);
  if (category.excludeTopLevel) {
    validateStructuralPath(category, cleanPath);
  }
  const target = path.join(category.directory, cleanPath);
  const normalized = path.normalize(target);
  if (!normalized.startsWith(category.directory)) {
    throw new Error("O caminho está fora do escopo permitido");
  }
  return { fullPath: normalized, relativePath: cleanPath };
}

async function collectFiles(category: ComponentCategory) {
  const results: ComponentFileSummary[] = [];
  await walkDirectory(category.directory, category, results);
  results.sort((a, b) => a.path.localeCompare(b.path));
  return results;
}

async function walkDirectory(
  baseDir: string,
  category: ComponentCategory,
  output: ComponentFileSummary[],
  currentDir: string = baseDir,
) {
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const absolute = path.join(currentDir, entry.name);
    const relative = toPosix(path.relative(baseDir, absolute));
    if (entry.isDirectory()) {
      if (baseDir === currentDir && category.excludeTopLevel?.has(entry.name)) {
        continue;
      }
      await walkDirectory(baseDir, category, output, absolute);
    } else if (entry.isFile()) {
      const stats = await fs.stat(absolute);
      output.push({
        path: relative,
        name: entry.name,
        size: stats.size,
        updatedAt: stats.mtimeMs,
      });
    }
  }
}

export async function getComponentCategoriesSummary() {
  const summaries: ComponentCategorySummary[] = [];
  for (const category of componentCategories) {
    const files = await collectFiles(category);
    summaries.push({
      id: category.id,
      label: category.label,
      description: category.description,
      totalFiles: files.length,
    });
  }
  return summaries;
}

export async function listComponentFiles(categoryId: string) {
  const category = ensureCategory(categoryId);
  return collectFiles(category);
}

export async function readComponentFile(
  categoryId: string,
  relativePath: string,
) {
  const category = ensureCategory(categoryId);
  const { fullPath } = resolveFilePath(category, relativePath);
  const buffer = await fs.readFile(fullPath, "utf8");
  return buffer;
}

export async function saveComponentFile(
  categoryId: string,
  relativePath: string,
  content: string,
) {
  const category = ensureCategory(categoryId);
  const { fullPath } = resolveFilePath(category, relativePath);
  await fs.access(fullPath);
  await fs.writeFile(fullPath, content, "utf8");
}

export async function createComponentFile(
  categoryId: string,
  relativePath: string,
  content: string,
) {
  const category = ensureCategory(categoryId);
  const { fullPath, relativePath: cleanPath } = resolveFilePath(
    category,
    relativePath,
  );
  const directory = path.dirname(fullPath);
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.access(fullPath);
    throw new Error("O arquivo já existe");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  await fs.writeFile(fullPath, content, "utf8");
  return cleanPath;
}

export async function deleteComponentFile(
  categoryId: string,
  relativePath: string,
) {
  const category = ensureCategory(categoryId);
  const { fullPath } = resolveFilePath(category, relativePath);
  await fs.unlink(fullPath);
}

export function getComponentCategories() {
  return componentCategories.map(({ id, label, description }) => ({
    id,
    label,
    description,
  }));
}
