import { NextRequest, NextResponse } from "next/server";

import { listComponentFiles } from "@/lib/component-config";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  if (!category) {
    return NextResponse.json(
      { message: "Informe a categoria desejada." },
      { status: 400 },
    );
  }
  try {
    const files = await listComponentFiles(category);
    return NextResponse.json(files);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os arquivos.",
      },
      { status: 500 },
    );
  }
}
