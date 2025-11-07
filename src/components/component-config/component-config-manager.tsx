"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Textarea } from "ui/textarea";
import { ScrollArea } from "ui/scroll-area";
import { Badge } from "ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "ui/alert-dialog";
import { fetcher, cn } from "lib/utils";
import {
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  FileCode,
  Folder,
  Search,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type {
  ComponentCategorySummary,
  ComponentFileSummary,
} from "@/lib/component-config";

interface FileContentResponse {
  content: string;
}

type ComponentConfigManagerProps = {
  initialCategoryId?: string;
};

export function ComponentConfigManager({
  initialCategoryId,
}: ComponentConfigManagerProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategoryId ?? null,
  );
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [editorValue, setEditorValue] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: categories,
    isLoading: categoriesLoading,
    mutate: mutateCategories,
  } = useSWR<ComponentCategorySummary[]>(
    "/api/component-config/categories",
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const searchParamsString = searchParams.toString();
  const categoryParam = searchParams.get("category");

  const syncCategoryInUrl = useCallback(
    (categoryId: string | null) => {
      if (categoryParam === categoryId) {
        return;
      }
      const next = new URLSearchParams(searchParamsString);
      if (categoryId) {
        next.set("category", categoryId);
      } else {
        next.delete("category");
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [categoryParam, pathname, router, searchParamsString],
  );

  useEffect(() => {
    if (!categories?.length) {
      if (selectedCategory !== null) {
        setSelectedCategory(null);
      }
      if (categoryParam !== null) {
        syncCategoryInUrl(null);
      }
      if (pendingCategory !== null) {
        setPendingCategory(null);
      }
      return;
    }
    if (categoryParam) {
      const exists = categories.some(
        (category) => category.id === categoryParam,
      );
      if (exists) {
        if (pendingCategory && categoryParam !== pendingCategory) {
          return;
        }
        if (pendingCategory && categoryParam === pendingCategory) {
          setPendingCategory(null);
        }
        if (selectedCategory !== categoryParam) {
          setSelectedCategory(categoryParam);
        }
        return;
      }
    }
    const fallback = categories[0].id;
    if (selectedCategory !== fallback) {
      setSelectedCategory(fallback);
    }
    if (categoryParam !== fallback) {
      syncCategoryInUrl(fallback);
    }
    if (pendingCategory !== null) {
      setPendingCategory(null);
    }
  }, [
    categories,
    categoryParam,
    pendingCategory,
    selectedCategory,
    syncCategoryInUrl,
  ]);

  const handleSelectCategory = useCallback(
    (categoryId: string) => {
      if (selectedCategory === categoryId) {
        return;
      }
      setPendingCategory(categoryId);
      setSelectedCategory(categoryId);
      syncCategoryInUrl(categoryId);
    },
    [selectedCategory, syncCategoryInUrl],
  );

  const {
    data: files,
    isLoading: filesLoading,
    mutate: mutateFiles,
  } = useSWR<ComponentFileSummary[]>(
    selectedCategory
      ? `/api/component-config/files?category=${selectedCategory}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    if (!selectedCategory) {
      setSelectedFilePath(null);
      setEditorValue("");
      setOriginalContent("");
      return;
    }
    setSearchTerm("");
  }, [selectedCategory]);

  useEffect(() => {
    if (!files?.length) {
      setSelectedFilePath(null);
      setEditorValue("");
      setOriginalContent("");
      return;
    }
    if (!selectedFilePath) {
      setSelectedFilePath(files[0].path);
      return;
    }
    const exists = files.find((file) => file.path === selectedFilePath);
    if (!exists) {
      setSelectedFilePath(files[0].path);
    }
  }, [files, selectedFilePath]);

  const {
    data: fileContent,
    isLoading: contentLoading,
    mutate: mutateFileContent,
  } = useSWR<FileContentResponse>(
    selectedCategory && selectedFilePath
      ? `/api/component-config/file?category=${selectedCategory}&file=${encodeURIComponent(
          selectedFilePath,
        )}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    if (fileContent?.content !== undefined) {
      setEditorValue(fileContent.content);
      setOriginalContent(fileContent.content);
    }
  }, [fileContent?.content, selectedFilePath]);

  const filteredFiles = useMemo(() => {
    if (!files) {
      return [];
    }
    if (!searchTerm.trim()) {
      return files;
    }
    const term = searchTerm.toLowerCase();
    return files.filter((file) => file.path.toLowerCase().includes(term));
  }, [files, searchTerm]);

  const selectedCategoryInfo = useMemo(() => {
    if (!selectedCategory || !categories) {
      return undefined;
    }
    return categories.find((category) => category.id === selectedCategory);
  }, [categories, selectedCategory]);

  const selectedFile = useMemo(() => {
    if (!selectedFilePath || !files) {
      return undefined;
    }
    return files.find((file) => file.path === selectedFilePath);
  }, [files, selectedFilePath]);

  const isDirty = editorValue !== originalContent;

  const formatBytes = useCallback((value: number) => {
    if (value < 1024) {
      return `${value} B`;
    }
    const units = ["KB", "MB", "GB", "TB"];
    let result = value / 1024;
    let index = 0;
    while (result >= 1024 && index < units.length - 1) {
      result /= 1024;
      index += 1;
    }
    return `${result.toFixed(2)} ${units[index]}`;
  }, []);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    [],
  );

  const handleSave = useCallback(async () => {
    if (!selectedCategory || !selectedFilePath) {
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/component-config/file", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: selectedCategory,
          file: selectedFilePath,
          content: editorValue,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Falha ao salvar o arquivo.");
      }
      await mutateFiles();
      mutateFileContent({ content: editorValue }, false);
      setOriginalContent(editorValue);
      toast.success("Arquivo salvo com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao salvar o arquivo.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    editorValue,
    mutateFileContent,
    mutateFiles,
    selectedCategory,
    selectedFilePath,
  ]);

  const handleRefresh = useCallback(async () => {
    if (!selectedCategory) {
      return;
    }
    setIsRefreshing(true);
    try {
      await Promise.all([
        mutateCategories(),
        mutateFiles(),
        mutateFileContent(),
      ]);
      toast.success("Informações atualizadas.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao atualizar dados.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [mutateCategories, mutateFileContent, mutateFiles, selectedCategory]);

  const handleCreate = useCallback(async () => {
    if (!selectedCategory) {
      toast.error("Selecione uma categoria antes de criar arquivos.");
      return;
    }
    const pathValue = newFilePath.trim();
    if (!pathValue) {
      toast.error("Informe o caminho do novo componente.");
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch("/api/component-config/file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: selectedCategory,
          file: pathValue,
          content: newFileContent,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Falha ao criar o arquivo.");
      }
      await Promise.all([mutateFiles(), mutateCategories()]);
      setSelectedFilePath(data.path || pathValue);
      setEditorValue(newFileContent);
      setOriginalContent(newFileContent);
      setCreateDialogOpen(false);
      setNewFilePath("");
      setNewFileContent("");
      toast.success("Arquivo criado com sucesso.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao criar o arquivo.",
      );
    } finally {
      setIsCreating(false);
    }
  }, [
    mutateCategories,
    mutateFileContent,
    mutateFiles,
    newFileContent,
    newFilePath,
    selectedCategory,
  ]);

  const handleDelete = useCallback(async () => {
    if (!selectedCategory || !selectedFilePath) {
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch("/api/component-config/file", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: selectedCategory,
          file: selectedFilePath,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Falha ao remover o arquivo.");
      }
      setDeleteDialogOpen(false);
      setSelectedFilePath(null);
      setEditorValue("");
      setOriginalContent("");
      mutateFileContent(undefined, false);
      await Promise.all([mutateFiles(), mutateCategories()]);
      toast.success("Arquivo removido.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao remover o arquivo.",
      );
    } finally {
      setIsDeleting(false);
    }
  }, [
    mutateCategories,
    mutateFileContent,
    mutateFiles,
    selectedCategory,
    selectedFilePath,
  ]);

  const editorPlaceholder = !selectedFilePath
    ? "Selecione um arquivo para iniciar a edição."
    : contentLoading
      ? "Carregando conteúdo do componente..."
      : undefined;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Folder className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">
            Configuração dos Componentes
          </h1>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          Administre cada componente do aplicativo com edições, criações e
          exclusões totalmente integradas ao código fonte.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_320px_1fr] lg:grid-cols-[260px_280px_1fr] grid-cols-1">
        <Card className="min-h-[480px] h-[calc(100vh-220px)]">
          <CardHeader>
            <CardTitle>Grupos de componentes</CardTitle>
            <CardDescription>
              Escolha a coleção que deseja manter
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {categoriesLoading ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : categories?.length ? (
              <ScrollArea className="h-[calc(100vh-360px)] px-6">
                <div className="flex flex-col gap-2 pb-4">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleSelectCategory(category.id)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left transition",
                        selectedCategory === category.id
                          ? "border-primary/70 bg-primary/10 text-primary"
                          : "border-border hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{category.label}</span>
                        <Badge variant="secondary">{category.totalFiles}</Badge>
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {category.description}
                        </p>
                        <span className="font-mono text-[11px] text-muted-foreground/80">
                          {category.relativeDirectory}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm px-6">
                Nenhuma categoria encontrada.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[480px] h-[calc(100vh-220px)]">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Arquivos</CardTitle>
                <CardDescription className="flex flex-col gap-1">
                  <span>Busque e selecione o componente desejado</span>
                  {selectedCategoryInfo ? (
                    <span className="font-mono text-[11px] text-muted-foreground/80">
                      {selectedCategoryInfo.relativeDirectory}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Escolha um grupo para exibir os arquivos
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                disabled={!selectedCategory}
              >
                <Plus className="size-4 mr-2" />
                Novo arquivo
              </Button>
            </div>
            <div className="px-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome ou caminho"
                  className="pl-9"
                  disabled={!selectedCategory}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {filesLoading ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : filteredFiles.length ? (
              <ScrollArea className="h-[calc(100vh-360px)] px-6">
                <div className="flex flex-col gap-2 pb-4">
                  {filteredFiles.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFilePath(file.path)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left transition",
                        selectedFilePath === file.path
                          ? "border-primary/70 bg-primary/10 text-primary"
                          : "border-border hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium truncate">
                          {file.path}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(file.size)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dateFormatter.format(new Date(file.updatedAt))}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm px-6">
                Nenhum arquivo encontrado para o filtro aplicado.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[480px] h-[calc(100vh-220px)] flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="size-4 text-primary" />
                  <span className="truncate">
                    {selectedFilePath || "Editor de código"}
                  </span>
                </CardTitle>
                <CardDescription className="truncate">
                  {selectedFile
                    ? `${formatBytes(selectedFile.size)} • ${dateFormatter.format(
                        new Date(selectedFile.updatedAt),
                      )}`
                    : "Selecione um arquivo para visualizar e editar."}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="size-4" />
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!selectedFilePath}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="size-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!selectedFilePath || !isDirty || isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="size-4 mr-2" />
                      Salvar alterações
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {selectedFilePath ? (
              contentLoading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : (
                <Textarea
                  value={editorValue}
                  onChange={(event) => setEditorValue(event.target.value)}
                  placeholder={editorPlaceholder}
                  className="flex-1 min-h-[320px] resize-none font-mono text-sm"
                  spellCheck={false}
                />
              )
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                {editorPlaceholder}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo componente</DialogTitle>
            <DialogDescription>
              Informe o caminho relativo dentro da categoria e o conteúdo
              inicial do componente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Caminho do arquivo
              </label>
              <Input
                value={newFilePath}
                onChange={(event) => setNewFilePath(event.target.value)}
                placeholder="ex: barra-lateral/menu.tsx"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Conteúdo inicial
              </label>
              <Textarea
                value={newFileContent}
                onChange={(event) => setNewFileContent(event.target.value)}
                placeholder="Cole ou escreva o código do novo componente"
                className="min-h-[200px] font-mono text-sm"
                spellCheck={false}
              />
            </div>
          </div>
          <DialogFooter className="flex items-center gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Plus className="size-4 mr-2" />
                  Criar componente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover componente</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme a exclusão definitiva do arquivo selecionado. Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
