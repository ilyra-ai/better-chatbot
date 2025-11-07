import { NextRequest, NextResponse } from "next/server";

import {
  createComponentFile,
  deleteComponentFile,
  readComponentFile,
  saveComponentFile,
} from "@/lib/component-config";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  const file = request.nextUrl.searchParams.get("file");
  if (!category || !file) {
    return NextResponse.json(
      { message: "Informe a categoria e o arquivo desejado." },
      { status: 400 },
    );
  }
  try {
    const content = await readComponentFile(category, file);
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o arquivo solicitado.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const category: string | undefined = body?.category;
  const file: string | undefined = body?.file;
  const content: string = body?.content ?? "";
  if (!category || !file) {
    return NextResponse.json(
      { message: "É necessário informar categoria e caminho do arquivo." },
      { status: 400 },
    );
  }
  try {
    const createdPath = await createComponentFile(category, file, content);
    return NextResponse.json({ path: createdPath });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o arquivo.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const category: string | undefined = body?.category;
  const file: string | undefined = body?.file;
  const content: string = body?.content ?? "";
  if (!category || !file) {
    return NextResponse.json(
      { message: "É necessário informar categoria e caminho do arquivo." },
      { status: 400 },
    );
  }
  try {
    await saveComponentFile(category, file, content);
    return NextResponse.json({ path: file });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o arquivo.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const category: string | undefined = body?.category;
  const file: string | undefined = body?.file;
  if (!category || !file) {
    return NextResponse.json(
      { message: "É necessário informar categoria e caminho do arquivo." },
      { status: 400 },
    );
  }
  try {
    await deleteComponentFile(category, file);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível remover o arquivo.",
      },
      { status: 500 },
    );
  }
}
