import { auth } from "@/app/(auth)/auth";
import {
  getUserPreferredTemplate,
  setUserPreferredTemplate,
} from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      // For non-logged-in users, return null as they don't have preferences
      return NextResponse.json({
        preferredTemplateId: null,
      });
    }

    const preferredTemplateId = await getUserPreferredTemplate(session.user.id);

    // Only return the template ID if it's valid (not exposing internal structure)
    return NextResponse.json({
      preferredTemplateId: preferredTemplateId || null,
    });
  } catch (error) {
    console.error("Error fetching preferred template:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferred template" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      // For non-logged-in users, silently ignore the preference save
      return NextResponse.json({ success: true });
    }

    // Validate request body size to prevent DoS
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 1024) {
      // 1KB limit
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 },
      );
    }

    const body = await req.json();
    const { templateId } = body;

    // Validate required field
    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 },
      );
    }

    // Validate input type
    if (typeof templateId !== "string") {
      return NextResponse.json(
        { error: "Template ID must be a string" },
        { status: 400 },
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(templateId)) {
      return NextResponse.json(
        { error: "Invalid template ID format" },
        { status: 400 },
      );
    }

    await setUserPreferredTemplate(session.user.id, templateId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting preferred template:", error);

    // Handle specific ownership validation errors
    if (
      error instanceof Error &&
      error.message === "Template not found or access denied"
    ) {
      return NextResponse.json(
        { error: "Template not found or access denied" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to set preferred template" },
      { status: 500 },
    );
  }
}
