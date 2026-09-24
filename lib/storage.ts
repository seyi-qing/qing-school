/**
 * Binary file storage
 * - With BLOB_READ_WRITE_TOKEN: uploads to Vercel Blob (production-ready)
 * - Without: returns error asking for token or use external URL
 */

export async function uploadFile(
  file: File,
  folder = "uploads"
): Promise<{ url: string } | { error: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return {
      error:
        "Binary upload needs BLOB_READ_WRITE_TOKEN (Vercel → Storage → Blob). Until then, paste a Drive/Dropbox link instead.",
    };
  }

  if (file.size > 4 * 1024 * 1024) {
    return { error: "File too large (max 4 MB)" };
  }

  try {
    const { put } = await import("@vercel/blob");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`${folder}/${Date.now()}-${safeName}`, file, {
      access: "public",
      token,
    });
    return { url: blob.url };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return { error: message };
  }
}
