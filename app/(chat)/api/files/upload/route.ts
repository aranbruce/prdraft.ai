import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid"; // Import uuid

import { auth } from "@/app/(auth)/auth";

const FileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 4.5 * 1024 * 1024, {
      message: "File size should be less than 4.5 MB",
    })
    .refine(
      (file) =>
        ["image/jpeg", "image/png", "application/pdf"].includes(file.type),
      {
        message: "File type should be JPEG, PNG, or PDF",
      },
    ),
});

export async function POST(request: Request) {
  console.log("File upload request received");
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Consider removing this check.
  // request.formData() will likely throw an error for an empty or malformed body,
  // which will be caught by the try...catch block below.
  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Sanitize or use a unique name for the blob
    // Example: prefixing with a UUID to ensure uniqueness
    const uniqueBlobName = `${uuidv4()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await put(uniqueBlobName, fileBuffer, {
        access: "public",
        // With unique names, allowOverwrite: false is often preferred
        // as each upload should be a distinct object.
        allowOverwrite: false,
      });

      return NextResponse.json({ ...data, originalFilename: file.name });
    } catch (error) {
      console.error("File upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error processing file upload request:", error); // Enhanced logging
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
