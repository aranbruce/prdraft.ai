import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { updateTemplate, deleteTemplateById } from "@/lib/db/queries";

export async function PUT(req: NextRequest, context: any) {
  const { params } = context;
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = params;
    const body = await req.json();
    const { title, content } = body;
    if (!id || !title || !content) {
      return NextResponse.json(
        { error: "Missing id, name, or content" },
        { status: 400 },
      );
    }
    const now = new Date();
    const result = await updateTemplate({
      id,
      content,
      title,
      updatedAt: now,
      userId: session.user.id,
    });
    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, context: any) {
  const { params } = context;
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const result = await deleteTemplateById({ id, userId: session.user.id });
    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 },
    );
  }
}
