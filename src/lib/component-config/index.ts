import { promises as fs } from "fs";
import type { Dirent } from "fs";
import path from "path";

import { COMPONENT_CATEGORY_DEFINITIONS } from "@/constants/component-categories";

export type ComponentCategory = {
  id: string;
  label: string;
  description: string;
  directory: string;
  relativeDirectory: string;
  excludeTopLevel?: Set<string>;
};

export type ComponentCategorySummary = {
  id: string;
  label: string;
  description: string;
  totalFiles: number;
  relativeDirectory: string;
};

export type ComponentFileSummary = {
  path: string;
  name: string;
  size: number;
  updatedAt: number;
};

const componentsRoot = path.join(process.cwd(), "src/components");

const componentCategories: ComponentCategory[] =
  COMPONENT_CATEGORY_DEFINITIONS.map(
    ({ directorySegments, excludeTopLevel, ...definition }) => {
      const directory = path.join(componentsRoot, ...directorySegments);
      const relativeDirectory = path
        .relative(process.cwd(), directory)
        .split(path.sep)
        .join("/");
      return {
        ...definition,
        directory,
        relativeDirectory,
        excludeTopLevel: excludeTopLevel ? new Set(excludeTopLevel) : undefined,
      };
    },
  );

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
      relativeDirectory: category.relativeDirectory,
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
  return componentCategories.map(({ id, label, description, relativeDirectory }) => ({
    id,
    label,
    description,
    relativeDirectory,
  }));
}
