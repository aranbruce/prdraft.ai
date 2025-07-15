import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/app/(auth)/auth";
import { getTemplatesByUserId, saveTemplate } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json([]);
    }
    let templates = await getTemplatesByUserId({ userId: session.user.id });
    if (!templates || templates.length === 0) {
      templates = [];
    }
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { title, content } = body;
    if (!title || !content) {
      return NextResponse.json(
        { error: "Missing name or content" },
        { status: 400 },
      );
    }
    // Use the saveTemplate query
    const result = await saveTemplate({
      content,
      title,
      userId: session.user.id,
    });
    // Optionally, fetch the inserted template to return full data (id, timestamps, etc.)
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save template" },
      { status: 500 },
    );
  }
}
