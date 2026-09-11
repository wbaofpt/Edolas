export const STORE_PAYMENT_METHODS = ["momo", "bank"] as const;
export const STORE_ACCENTS = ["cyan", "violet", "sapphire", "ice"] as const;
export const STORE_COMMAND_VARIABLES = [
  "player",
  "package",
  "amount",
  "cluster",
] as const;

export type StorePaymentMethod = (typeof STORE_PAYMENT_METHODS)[number];
export type StoreAccent = (typeof STORE_ACCENTS)[number];
export type StoreCommandVariables = Record<
  (typeof STORE_COMMAND_VARIABLES)[number],
  string
>;
export type StoreCategoryInput = {
  groupKey: string;
  slug: string;
  name: string;
  sortOrder: number;
  active: boolean;
};
export type StoreGroupInput = {
  displayName: string;
  sortOrder: number;
  active: boolean;
};
export type StorePackageInput = {
  slug: string;
  name: string;
  description: string;
  groupKey: string;
  priceVnd: number;
  commandTemplate: string;
  accent: StoreAccent;
  sortOrder: number;
  active: boolean;
  categoryId: number | null;
  badge: string | null;
  featured: boolean;
};
export type StoreOrderInput = {
  packageId: number;
  minecraftUsername: string;
  paymentMethod: StorePaymentMethod;
  clientRequestKey: string | null;
};

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
const GROUP = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const MINECRAFT_USERNAME = /^[A-Za-z0-9_]{1,16}$/;
const PLACEHOLDER = /\{([^{}]+)\}/g;

function text(value: unknown, max: number) {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= max
    ? value.trim()
    : null;
}

export function parseStoreCategoryInput(
  value: unknown,
): Parsed<StoreCategoryInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Du lieu danh muc khong hop le." };
  }
  const input = value as Record<string, unknown>;
  const groupKey = text(input.groupKey, 40);
  const slug = text(input.slug, 50);
  const name = text(input.name, 80);
  const sortOrder = Number(input.sortOrder ?? 0);
  if (!groupKey || !GROUP.test(groupKey) || !slug || !SLUG.test(slug) || !name) {
    return { ok: false, error: "Ten hoac slug danh muc khong hop le." };
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 65_535) {
    return { ok: false, error: "Thu tu hien thi khong hop le." };
  }
  if (typeof input.active !== "boolean") {
    return { ok: false, error: "Trang thai danh muc khong hop le." };
  }
  return { ok: true, value: { groupKey, slug, name, sortOrder, active: input.active } };
}

export function parseStoreGroupInput(value: unknown): Parsed<StoreGroupInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Dữ liệu cụm Store không hợp lệ." };
  }
  const input = value as Record<string, unknown>;
  const displayName = text(input.displayName, 80);
  const sortOrder = Number(input.sortOrder ?? 0);
  if (!displayName || /[\r\n\0]/.test(displayName)) {
    return { ok: false, error: "Tên hiển thị cụm không hợp lệ." };
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 65_535) {
    return { ok: false, error: "Thứ tự hiển thị không hợp lệ." };
  }
  if (typeof input.active !== "boolean") {
    return { ok: false, error: "Trạng thái cụm Store không hợp lệ." };
  }
  return { ok: true, value: { displayName, sortOrder, active: input.active } };
}

export function isStoreGroupKey(value: unknown): value is string {
  return typeof value === "string" && GROUP.test(value);
}

export function parseStorePackageInput(
  value: unknown,
): Parsed<StorePackageInput> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ok: false, error: "Dữ liệu gói không hợp lệ." };
  const input = value as Record<string, unknown>;
  const slug = text(input.slug, 50);
  const name = text(input.name, 80);
  const description = text(input.description, 500);
  const groupKey = text(input.groupKey, 40);
  const commandTemplate =
    text(input.commandTemplate, 512)?.replace(/^\/+/, "") ?? null;
  const priceVnd = Number(input.priceVnd);
  const sortOrder = Number(input.sortOrder ?? 0);
  const categoryId =
    input.categoryId === undefined ||
    input.categoryId === null ||
    input.categoryId === ""
      ? null
      : Number(input.categoryId);
  const badge =
    input.badge === undefined || input.badge === null || input.badge === ""
      ? null
      : text(input.badge, 20);
  const featured = input.featured ?? false;
  const accent = input.accent;
  if (
    !slug ||
    !SLUG.test(slug) ||
    !name ||
    !description ||
    !groupKey ||
    !GROUP.test(groupKey)
  )
    return { ok: false, error: "Tên, slug hoặc cụm của gói không hợp lệ." };
  if (
    !Number.isSafeInteger(priceVnd) ||
    priceVnd < 1_000 ||
    priceVnd > 100_000_000
  )
    return { ok: false, error: "Giá gói phải từ 1.000 đến 100.000.000 VNĐ." };
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 65_535)
    return { ok: false, error: "Thứ tự hiển thị không hợp lệ." };
  if (!STORE_ACCENTS.includes(accent as StoreAccent))
    return { ok: false, error: "Màu gói không hợp lệ." };
  if (categoryId !== null && (!Number.isSafeInteger(categoryId) || categoryId < 1))
    return { ok: false, error: "Danh muc goi khong hop le." };
  if (
    input.badge !== undefined &&
    input.badge !== null &&
    input.badge !== "" &&
    (!badge || /[\r\n\0]/.test(badge))
  )
    return { ok: false, error: "Nhan goi khong hop le." };
  if (typeof featured !== "boolean")
    return { ok: false, error: "Trang thai noi bat khong hop le." };
  if (!commandTemplate || /[\r\n\0]/.test(commandTemplate))
    return { ok: false, error: "Lệnh console phải nằm trên một dòng." };
  const variables = [...commandTemplate.matchAll(PLACEHOLDER)].map(
    (match) => match[1],
  );
  if (
    variables.some(
      (variable) =>
        !STORE_COMMAND_VARIABLES.includes(
          variable as keyof StoreCommandVariables,
        ),
    )
  )
    return { ok: false, error: "Lệnh chứa biến không được hỗ trợ." };
  if (typeof input.active !== "boolean")
    return { ok: false, error: "Trạng thái gói không hợp lệ." };
  return {
    ok: true,
    value: {
      slug,
      name,
      description,
      groupKey,
      priceVnd,
      commandTemplate,
      accent: accent as StoreAccent,
      sortOrder,
      active: input.active,
      categoryId,
      badge,
      featured,
    },
  };
}

export function parseStoreOrderInput(value: unknown): Parsed<StoreOrderInput> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ok: false, error: "Dữ liệu đơn hàng không hợp lệ." };
  const input = value as Record<string, unknown>;
  const packageId = Number(input.packageId);
  const minecraftUsername =
    typeof input.minecraftUsername === "string"
      ? input.minecraftUsername.trim()
      : "";
  const clientRequestKey =
    typeof input.clientRequestKey === "string"
      ? input.clientRequestKey.trim()
      : null;
  if (!Number.isSafeInteger(packageId) || packageId < 1)
    return { ok: false, error: "Vui lòng chọn gói nạp." };
  if (!MINECRAFT_USERNAME.test(minecraftUsername))
    return {
      ok: false,
      error: "Tên Minecraft chỉ gồm chữ, số, dấu gạch dưới và tối đa 16 ký tự.",
    };
  if (
    !STORE_PAYMENT_METHODS.includes(input.paymentMethod as StorePaymentMethod)
  )
    return { ok: false, error: "Phương thức thanh toán không hợp lệ." };
  if (clientRequestKey && !/^[A-Za-z0-9_-]{16,80}$/.test(clientRequestKey))
    return { ok: false, error: "Mã yêu cầu thanh toán không hợp lệ." };
  return {
    ok: true,
    value: {
      packageId,
      minecraftUsername,
      paymentMethod: input.paymentMethod as StorePaymentMethod,
      clientRequestKey,
    },
  };
}

export function renderStoreCommand(
  template: string,
  variables: StoreCommandVariables,
) {
  const normalized = template.trim().replace(/^\/+/, "");
  if (!normalized || normalized.length > 512 || /[\r\n\0]/.test(normalized))
    throw new Error("Store command template is invalid.");
  const unknown = [...normalized.matchAll(PLACEHOLDER)]
    .map((match) => match[1])
    .find(
      (name) =>
        !STORE_COMMAND_VARIABLES.includes(name as keyof StoreCommandVariables),
    );
  if (unknown)
    throw new Error("Store command template contains an unsupported variable.");
  const rendered = STORE_COMMAND_VARIABLES.reduce(
    (command, name) => command.split(`{${name}}`).join(variables[name]),
    normalized,
  );
  if (rendered.length > 512) {
    throw new Error("Store rendered command exceeds 512 characters.");
  }
  return rendered;
}
