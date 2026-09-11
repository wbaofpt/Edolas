import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server.js";
import { canManageUsers } from "../admin/authorization.ts";
import { readRequestCookie, validateControlMutation } from "../control/guard.ts";
import { CONTROL_SESSION_COOKIE } from "../control/session.ts";
import { resolveControlSession } from "../control/session-service.ts";
import { readRequestBytes, RequestBodyTooLargeError } from "../minecraft/request-body.ts";
import { STORE_PACKAGE_IMAGE_LIMIT_BYTES, updateStorePackageImage, validateStorePackageImage, type StorePackageImageValidation } from "./package-image.ts";

type Resolver = typeof resolveControlSession;
type SuccessfulValidation = Extract<StorePackageImageValidation, { ok: true }>;
type WriteImage = (file: File, bytes: Uint8Array, validation: SuccessfulValidation) => Promise<{ publicPath: string; diskPath: string }>;
type Deps = { resolveControlSession?: Resolver; updateStorePackageImage?: typeof updateStorePackageImage; writeImage?: WriteImage; removeFile?: (diskPath: string) => Promise<void>; onCleanupFailure?: (diskPath: string, error: unknown) => void };
const MAX_MULTIPART_BYTES = 6 * 1024 * 1024;
const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

export function managedStorePackageDiskPath(publicPath: string | null) {
  if (!publicPath || !/^\/uploads\/store\/packages\/[a-zA-Z0-9._-]+$/.test(publicPath)) return null;
  return path.join(process.cwd(), "public", "uploads", "store", "packages", path.basename(publicPath));
}

export async function cleanupManagedStorePackageImage(
  publicPath: string | null,
  removeFile: (diskPath: string) => Promise<void> = unlink,
  onFailure: (diskPath: string, error: unknown) => void = console.error,
) {
  const diskPath = managedStorePackageDiskPath(publicPath);
  if (!diskPath) return false;
  try {
    await removeFile(diskPath);
    return false;
  } catch (error) {
    onFailure(diskPath, error);
    return true;
  }
}

async function writeManagedImage(_file: File, bytes: Uint8Array, validation: SuccessfulValidation) {
  const directory = path.join(process.cwd(), "public", "uploads", "store", "packages");
  const fileName = `${Date.now()}-${randomUUID()}.${validation.extension}`;
  const diskPath = path.join(directory, fileName);
  await mkdir(directory, { recursive: true });
  await writeFile(diskPath, bytes, { flag: "wx" });
  return { publicPath: `/uploads/store/packages/${fileName}`, diskPath };
}

async function authorize(request: Request, resolver: Resolver) {
  const mutation = validateControlMutation(request);
  if (!mutation.ok) return { response: fail(mutation.status, mutation.error) } as const;
  const session = await resolver(readRequestCookie(request, CONTROL_SESSION_COOKIE), { csrfToken: mutation.csrfToken });
  if (!session) return { response: fail(401, "Phien Control da het han.") } as const;
  if (!canManageUsers(session.user.roleName)) return { response: fail(403, "Ban khong co quyen quan ly anh goi.") } as const;
  return { user: session.user } as const;
}

export function createStorePackageImageHandler(deps: Deps = {}) {
  const removeFile = deps.removeFile ?? unlink;
  const updateImage = deps.updateStorePackageImage ?? updateStorePackageImage;
  async function cleanup(diskPath: string | null) {
    if (!diskPath) return false;
    try {
      await removeFile(diskPath);
      return false;
    } catch (error) {
      (deps.onCleanupFailure ?? console.error)(diskPath, error);
      return true;
    }
  }
  return async (request: Request, { params }: { params: { id: string } }) => {
    const access = await authorize(request, deps.resolveControlSession ?? resolveControlSession);
    if ("response" in access) return access.response;
    const packageId = Number(params.id);
    if (!Number.isSafeInteger(packageId) || packageId < 1) return fail(400, "Ma goi khong hop le.");

    if (request.method === "DELETE") {
      try {
        const result = await updateImage(access.user, packageId, null);
        if (!result.ok) return fail(result.status, result.error);
        const previous = managedStorePackageDiskPath(result.previousPath);
        const cleanupPending = await cleanup(previous);
        return NextResponse.json({ ok: true, imagePath: null, cleanupPending });
      } catch {
        return fail(503, "Khong the go anh goi luc nay.");
      }
    }

    if (request.method !== "POST") return fail(405, "Phuong thuc khong duoc ho tro.");
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) return fail(413, "Anh tai len vuot qua gioi han 5 MB.");
    let multipartBytes: Uint8Array;
    try {
      multipartBytes = await readRequestBytes(request, MAX_MULTIPART_BYTES);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) return fail(413, "Anh tai len vuot qua gioi han 5 MB.");
      return fail(400, "Khong the doc du lieu tai len.");
    }
    const multipartBody = new Uint8Array(multipartBytes.byteLength);
    multipartBody.set(multipartBytes);
    const multipartRequest = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: multipartBody.buffer,
    });
    const form = await multipartRequest.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return fail(400, "Vui long chon mot anh goi.");
    if (file.size > STORE_PACKAGE_IMAGE_LIMIT_BYTES) return fail(413, "Anh goi khong duoc vuot qua 5 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validateStorePackageImage(bytes.slice(0, 16), file.size);
    if (!validation.ok) return fail(400, validation.error);

    let stored: { publicPath: string; diskPath: string } | null = null;
    try {
      stored = await (deps.writeImage ?? writeManagedImage)(file, bytes, validation);
      const result = await updateImage(access.user, packageId, stored.publicPath);
      if (!result.ok) {
        await cleanup(stored.diskPath);
        return fail(result.status, result.error);
      }
      const previous = managedStorePackageDiskPath(result.previousPath);
      const cleanupPending = previous && result.previousPath !== stored.publicPath
        ? await cleanup(previous)
        : false;
      return NextResponse.json({ ok: true, imagePath: stored.publicPath, cleanupPending }, { status: 201 });
    } catch {
      if (stored) await cleanup(stored.diskPath);
      return fail(503, "Khong the luu anh goi luc nay.");
    }
  };
}
