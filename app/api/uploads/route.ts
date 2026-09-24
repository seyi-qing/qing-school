import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !["ADMIN", "IT", "SECRETARY", "PRINCIPAL", "TEACHER"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field required" }, { status: 400 });
  }

  const result = await uploadFile(file, "school-docs");
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ url: result.url });
}
