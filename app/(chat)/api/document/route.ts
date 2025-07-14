import { NextRequest } from "next/server";
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsByIdForUser,
  getDocumentByIdForUser,
  saveDocument,
} from "@/lib/db/queries";
import { withAuth, getSearchParam, validateRequired, ApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  return withAuth(async (userId, req) => {
    const id = getSearchParam(req, "id");
    
    const documents = await getDocumentsByIdForUser({ id, userId });
    
    // Handle empty results
    if (!documents || documents.length === 0) {
      throw new ApiError("No documents found", 404);
    }

    return documents;
  }, request);
}

export async function POST(request: NextRequest) {
  return withAuth(async (userId, req) => {
    const id = getSearchParam(req, "id");
    const body = await req.json();
    
    validateRequired(body, ["content", "title"]);
    const { content, title } = body;

    const document = await saveDocument({
      id,
      content,
      title,
      userId,
    });

    return document;
  }, request);
}

export async function PATCH(request: NextRequest) {
  return withAuth(async (userId, req) => {
    const id = getSearchParam(req, "id");
    const body = await req.json();
    
    validateRequired(body, ["timestamp"]);
    const { timestamp } = body;

    // Check ownership before deletion
    const document = await getDocumentByIdForUser({ id, userId });
    if (!document) {
      throw new ApiError("Document not found or unauthorized", 404);
    }

    await deleteDocumentsByIdAfterTimestamp({
      id,
      timestamp: new Date(timestamp),
    });

    return { message: "Documents deleted successfully" };
  }, request);
}
