import { ChangeEvent, useState } from "react";

interface Props {
  signatureUrl: string;
  resourceType?: "auto" | "raw" | "image" | "video";
  onUploaded: (url: string, publicId: string) => void;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
}

export default function FileUploader({
  signatureUrl,
  resourceType = "auto",
  onUploaded,
  label = "Upload file",
  accept,
  maxSizeMB,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    setError(null);

    if (resourceType === "video" && !file.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      input.value = "";
      return;
    }

    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must not exceed ${maxSizeMB} MB.`);
      input.value = "";
      return;
    }

    setBusy(true);

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

      if (!cloudName) {
        throw new Error("Cloudinary cloud name is not configured.");
      }

      const signatureResponse = await fetch(signatureUrl, {
        credentials: "same-origin",
        cache: "no-store",
      });

      const signatureData = await signatureResponse.json().catch(() => ({}));

      if (!signatureResponse.ok) {
        throw new Error(
          signatureData.detail ||
          signatureData.error ||
          "Could not obtain an upload signature. Please sign in again."
        );
      }

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", signatureData.apiKey);
      form.append("timestamp", String(signatureData.timestamp));
      form.append("signature", signatureData.signature);
      form.append("folder", signatureData.folder);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        { method: "POST", body: form }
      );

      const uploadData = await uploadResponse.json().catch(() => ({}));

      if (!uploadResponse.ok) {
        throw new Error(
          uploadData.error?.message || "Cloudinary upload failed."
        );
      }

      if (!uploadData.secure_url || !uploadData.public_id) {
        throw new Error("Cloudinary returned an incomplete upload response.");
      }

      onUploaded(uploadData.secure_url, uploadData.public_id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected upload error occurred."
      );
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
        {busy ? "Uploading…" : label}
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={busy}
          onChange={handleFileChange}
        />
      </label>

      {busy && (
        <p className="mt-2 text-sm text-gray-500">
          Uploading file to secure media storage. Please keep this page open.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
