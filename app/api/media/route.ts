import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "IT", "SECRETARY"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ assets });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN", "IT", "SECRETARY"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "multipart required" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const result = await uploadFile(file, "media-library");
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      url: result.url,
      filename: file.name,
      mimeType: file.type || null,
      sizeBytes: file.size,
      uploadedBy: session.userId,
    },
  });

  return NextResponse.json({ asset }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN", "IT"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.mediaAsset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
