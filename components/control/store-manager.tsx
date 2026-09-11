"use client";

import {
  AlertTriangle,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Filter,
  ImagePlus,
  Pencil,
  PackagePlus,
  Search,
  ServerCog,
  ShieldCheck,
  ShoppingBag,
  TerminalSquare,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { controlFetch } from "@/lib/control/client";
import type {
  StoreAdminCategory,
  StoreAdminGroup,
  StoreAdminOrder,
  StoreAdminPackage,
  StoreAdminPayment,
} from "@/lib/store/admin-service";

type Data = {
  categories: StoreAdminCategory[];
  packages: StoreAdminPackage[];
  orders: StoreAdminOrder[];
  groups: StoreAdminGroup[];
  payments: StoreAdminPayment[];
};
const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const labels: Record<string, string> = {
  pending_payment: "Chờ thanh toán",
  approved: "Chờ backend",
  delivering: "Đang giao",
  fulfilled: "Hoàn tất",
  failed: "Thất bại",
  needs_review: "Cần kiểm tra",
  cancelled: "Đã hủy",
};
const blank: StoreAdminPackage = {
  id: 0,
  slug: "",
  name: "",
  description: "",
  groupKey: "",
  priceVnd: 50000,
  commandTemplate: "lp user {player} parent add vip",
  accent: "cyan",
  sortOrder: 0,
  active: true,
  categoryId: null,
  imagePath: null,
  badge: null,
  featured: false,
};

const blankCategory: StoreAdminCategory = {
  id: 0,
  groupKey: "",
  slug: "",
  name: "",
  sortOrder: 0,
  active: true,
  packageCount: 0,
};

function preview(
  template: string,
  variables = {
    player: "QuocBaooo",
    package: "vip-sample",
    amount: "50000",
    cluster: "survival",
  },
) {
  return template
    .replaceAll("{player}", variables.player)
    .replaceAll("{package}", variables.package)
    .replaceAll("{amount}", variables.amount)
    .replaceAll("{cluster}", variables.cluster)
    .replace(/^\/+/, "");
}

export function StoreManager({ initialData }: { initialData: Data }) {
  const firstGroupKey = initialData.groups[0]?.key ?? "";
  const [storeGroups, setStoreGroups] = useState(initialData.groups);
  const [selectedGroupKey, setSelectedGroupKey] = useState(firstGroupKey);
  const [catalogCategory, setCatalogCategory] = useState<number | "all">("all");
  const [categories, setCategories] = useState(initialData.categories);
  const [packages, setPackages] = useState(initialData.packages);
  const [orders, setOrders] = useState(initialData.orders);
  const [payments] = useState(initialData.payments ?? []);
  const [editor, setEditor] = useState<StoreAdminPackage | typeof blank | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [orderGroup, setOrderGroup] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [paymentQuery, setPaymentQuery] = useState("");
  const [paymentProvider, setPaymentProvider] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [paymentGroup, setPaymentGroup] = useState("all");
  const [categoryEditor, setCategoryEditor] = useState({
    ...blankCategory,
    groupKey: firstGroupKey,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [groupError, setGroupError] = useState("");
  const [busy, setBusy] = useState(false);
  const [groupEditor, setGroupEditor] = useState<StoreAdminGroup | null>(null);
  const [dialog, setDialog] = useState<{
    order: StoreAdminOrder;
    action: "approve" | "cancel";
  } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editorDialogRef = useRef<HTMLDialogElement>(null);
  const groupDialogRef = useRef<HTMLDialogElement>(null);
  const groupEditTriggerRef = useRef<HTMLButtonElement | null>(null);
  const groupNameRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const selectedGroup =
    storeGroups.find((item) => item.key === selectedGroupKey) ?? null;
  const scopedCategories = categories.filter((category) => category.groupKey === selectedGroupKey);
  const scopedPackages = packages.filter((item) => item.groupKey === selectedGroupKey);
  const visiblePackages = scopedPackages.filter(
    (item) => catalogCategory === "all" || item.categoryId === catalogCategory,
  );
  useEffect(() => {
    const node = dialogRef.current;
    if (dialog && !node?.open) {
      node?.showModal();
      cancelRef.current?.focus();
    }
    if (!dialog && node?.open) node.close();
  }, [dialog]);
  useEffect(() => {
    const node = editorDialogRef.current;
    if (editor && !node?.open) node?.showModal();
    if (!editor && node?.open) node.close();
  }, [editor]);
  useEffect(() => {
    const node = groupDialogRef.current;
    if (groupEditor && !node?.open) {
      node?.showModal();
      groupNameRef.current?.focus();
    }
    if (!groupEditor && node?.open) node.close();
  }, [groupEditor]);
  const filtered = orders.filter(
    (order) =>
      (status === "all" || order.status === status) &&
      (orderGroup === "all" || order.groupKey === orderGroup) &&
      (paymentMethod === "all" || order.paymentMethod === paymentMethod) &&
      `${order.reference} ${order.account} ${order.minecraftUsername} ${order.packageName}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const filteredPayments = payments.filter((payment) =>
    (paymentProvider === "all" || payment.provider === paymentProvider) &&
    (paymentStatus === "all" || payment.attemptStatus === paymentStatus) &&
    (paymentGroup === "all" || payment.groupKey === paymentGroup) &&
    `${payment.reference} ${payment.accountUsername} ${payment.accountEmail} ${payment.minecraftUsername} ${payment.packageName}`
      .toLowerCase()
      .includes(paymentQuery.trim().toLowerCase()),
  );
  const kpis = {
    pending: orders.filter((item) => item.status === "pending_payment").length,
    delivering: orders.filter((item) =>
      ["approved", "delivering"].includes(item.status),
    ).length,
    fulfilled: orders.filter((item) => item.status === "fulfilled").length,
    revenue: orders
      .filter((item) => item.status === "fulfilled")
      .reduce((sum, item) => sum + item.priceVnd, 0),
  };
  function selectStoreGroup(group: StoreAdminGroup) {
    setSelectedGroupKey(group.key);
    setCatalogCategory("all");
    setCategoryEditor({ ...blankCategory, groupKey: group.key });
  }
  function editStoreGroup(
    group: StoreAdminGroup,
    trigger: HTMLButtonElement,
  ) {
    selectStoreGroup(group);
    groupEditTriggerRef.current = trigger;
    setGroupError("");
    setGroupEditor(group);
  }
  function closeGroupEditor() {
    setGroupEditor(null);
    setGroupError("");
    window.requestAnimationFrame(() => groupEditTriggerRef.current?.focus());
  }
  async function saveGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupEditor) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const response = await controlFetch(
        `/api/control/store/groups/${encodeURIComponent(groupEditor.key)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            displayName: String(form.get("displayName") ?? ""),
            sortOrder: Number(form.get("sortOrder") ?? 0),
            active: form.get("active") === "on",
          }),
        },
      );
      const body = await response.json();
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Không thể lưu tên cụm Store.");
      }
      setStoreGroups((current) =>
        current.map((item) =>
          item.key === groupEditor.key
            ? { ...item, ...body.group, categoryCount: item.categoryCount, packageCount: item.packageCount }
            : item,
        ),
      );
      closeGroupEditor();
      setMessage("Đã cập nhật tên và trạng thái cụm trong Store.");
    } catch (error) {
      setGroupError(
        error instanceof Error ? error.message : "Không thể lưu cụm Store.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function savePackage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setBusy(true);
    setMessage("");
    try {
      const endpoint = editor.id
        ? `/api/control/store/packages/${editor.id}`
        : "/api/control/store/packages";
      const response = await controlFetch(endpoint, {
        method: editor.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editor),
      });
      const body = await response.json();
      if (!response.ok || !body.ok)
        throw new Error(body.error || "Không thể lưu gói.");
      const packageId = Number(body.id);
      let next: StoreAdminPackage = { ...editor, id: packageId };
      const nextPackages = editor.id
        ? packages.map((item) => (item.id === editor.id ? next : item))
        : [...packages, next];
      setEditor(next);
      setPackages(nextPackages);
      setCategories((current) =>
        current.map((category) => ({
          ...category,
          packageCount: nextPackages.filter(
            (item) => item.categoryId === category.id,
          ).length,
        })),
      );
      setStoreGroups((current) =>
        current.map((group) => ({
          ...group,
          packageCount: nextPackages.filter(
            (item) => item.groupKey === group.key,
          ).length,
        })),
      );
      if (imageFile) {
        const form = new FormData();
        form.set("file", imageFile);
        const imageResponse = await controlFetch(
          `/api/control/store/packages/${packageId}/image`,
          { method: "POST", body: form },
        );
        const imageBody = await imageResponse.json();
        if (!imageResponse.ok || !imageBody.ok)
          throw new Error(imageBody.error || "Không thể lưu ảnh gói.");
        next = { ...next, imagePath: imageBody.imagePath };
        setEditor(next);
        setPackages((current) =>
          current.map((item) => (item.id === packageId ? next : item)),
        );
      }
      setImageFile(null);
      setEditor(null);
      setMessage("Đã lưu cấu hình gói nạp.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu gói.");
    } finally {
      setBusy(false);
    }
  }
  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await controlFetch(
        categoryEditor.id
          ? `/api/control/store/categories/${categoryEditor.id}`
          : "/api/control/store/categories",
        {
          method: categoryEditor.id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(categoryEditor),
        },
      );
      const body = await response.json();
      if (!response.ok || !body.ok)
        throw new Error(body.error || "Không thể lưu danh mục.");
      const next = { ...categoryEditor, id: Number(body.id) };
      setCategories((current) =>
        categoryEditor.id
          ? current.map((item) =>
              item.id === categoryEditor.id ? next : item,
            )
          : [...current, next],
      );
      setCategoryEditor({ ...blankCategory, groupKey: selectedGroupKey });
      setMessage("Đã lưu danh mục cửa hàng.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể lưu danh mục.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function removeCategory(category: StoreAdminCategory) {
    if (
      !window.confirm(
        `Xóa danh mục ${category.name}? Thao tác này không thể hoàn tác.`,
      )
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      const response = await controlFetch(
        `/api/control/store/categories/${category.id}`,
        { method: "DELETE" },
      );
      const body = await response.json();
      if (!response.ok || !body.ok)
        throw new Error(body.error || "Không thể xóa danh mục.");
      setCategories((current) =>
        current.filter((item) => item.id !== category.id),
      );
      if (categoryEditor.id === category.id) {
        setCategoryEditor({ ...blankCategory, groupKey: selectedGroupKey });
      }
      setMessage("Đã xóa danh mục.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể xóa danh mục.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function removePackageImage() {
    if (!editor?.id || !editor.imagePath) return;
    setBusy(true);
    try {
      const response = await controlFetch(
        `/api/control/store/packages/${editor.id}/image`,
        { method: "DELETE" },
      );
      const body = await response.json();
      if (!response.ok || !body.ok)
        throw new Error(body.error || "Không thể gỡ ảnh gói.");
      setEditor((current) =>
        current ? { ...current, imagePath: null } : current,
      );
      setPackages((current) =>
        current.map((item) =>
          item.id === editor.id ? { ...item, imagePath: null } : item,
        ),
      );
      setMessage("Đã gỡ ảnh gói.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể gỡ ảnh gói.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function removePackage() {
    if (!editor?.id) return;
    if (!window.confirm(`Xóa gói ${editor.name}? Lịch sử đơn hàng vẫn được giữ lại.`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await controlFetch(
        `/api/control/store/packages/${editor.id}`,
        { method: "DELETE" },
      );
      const body = await response.json();
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Không thể xóa gói.");
      }
      const nextPackages = packages.filter((item) => item.id !== editor.id);
      setPackages(nextPackages);
      setCategories((current) =>
        current.map((category) => ({
          ...category,
          packageCount: nextPackages.filter((item) => item.categoryId === category.id).length,
        })),
      );
      setStoreGroups((current) =>
        current.map((group) => ({
          ...group,
          packageCount: nextPackages.filter((item) => item.groupKey === group.key).length,
        })),
      );
      setEditor(null);
      setMessage(body.cleanupPending ? "Đã xóa gói; ảnh cũ đang chờ dọn." : "Đã xóa gói.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xóa gói.");
    } finally {
      setBusy(false);
    }
  }
  async function mutateOrder() {
    if (!dialog || confirmation !== dialog.order.reference) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await controlFetch(
        `/api/control/store/orders/${dialog.order.id}/${dialog.action}`,
        { method: "POST" },
      );
      const body = await response.json();
      if (!response.ok || !body.ok)
        throw new Error(body.error || "Không thể cập nhật đơn.");
      setOrders((current) =>
        current.map((item) =>
          item.id === dialog.order.id
            ? {
                ...item,
                status: dialog.action === "approve" ? "approved" : "cancelled",
                deliveryStatus:
                  dialog.action === "approve" ? "pending" : item.deliveryStatus,
              }
            : item,
        ),
      );
      setMessage(
        dialog.action === "approve"
          ? "Đã duyệt và đưa lệnh vào hàng đợi backend."
          : "Đã hủy đơn hàng.",
      );
      setDialog(null);
      setConfirmation("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể cập nhật đơn.",
      );
    } finally {
      setBusy(false);
    }
  }
  function update<K extends keyof StoreAdminPackage>(
    key: K,
    value: StoreAdminPackage[K],
  ) {
    setEditor((current) => (current ? { ...current, [key]: value } : current));
  }
  function openPackageEditor(value: StoreAdminPackage) {
    setImageFile(null);
    setEditor(value);
  }
  return (
    <div className="control-store-page">
      <header className="control-store-hero">
        <div>
          <p>
            <ShoppingBag aria-hidden="true" />
            STORE OPERATIONS // MANUAL SETTLEMENT
          </p>
          <h1>Điều hành cửa hàng</h1>
          <span>
            Cấu hình gói, kiểm tra thanh toán và giao quyền lợi vào đúng cụm mà
            không để trình duyệt chạm vào console.
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            openPackageEditor({ ...blank, groupKey: selectedGroupKey })
          }
          disabled={!selectedGroupKey}
        >
          <PackagePlus aria-hidden="true" />
          Tạo gói mới
        </button>
      </header>
      <p className="control-store-message" aria-live="polite">
        {message}
      </p>
      <section className="control-store-cluster-workspace" aria-labelledby="store-cluster-title">
        <header>
          <div>
            <span>STORE CLUSTERS</span>
            <h2 id="store-cluster-title">Chọn cụm để quản lý catalog</h2>
          </div>
          <b>{storeGroups.length} cụm</b>
        </header>
        <div className="control-store-cluster-rail" aria-label="Cụm Store">
          {storeGroups.map((group) => {
            const categoryCount = categories.filter((item) => item.groupKey === group.key).length;
            const packageCount = packages.filter((item) => item.groupKey === group.key).length;
            return (
              <article
                key={group.key}
                className={selectedGroupKey === group.key ? "is-selected" : ""}
              >
                <button
                  type="button"
                  className="control-store-cluster-select"
                  aria-pressed={selectedGroupKey === group.key}
                  onClick={() => selectStoreGroup(group)}
                >
                  <span className={group.online ? "is-online" : ""}>
                    <i aria-hidden="true" /> {group.online ? "Online" : "Offline"}
                  </span>
                  <strong className="control-store-cluster-name">{group.displayName}</strong>
                  <small>{group.key}</small>
                  <dl>
                    <div><dt>Danh mục</dt><dd>{categoryCount}</dd></div>
                    <div><dt>Gói</dt><dd>{packageCount}</dd></div>
                  </dl>
                </button>
                <button
                  type="button"
                  className="control-store-cluster-edit"
                  aria-label={`Sửa thông tin cụm ${group.displayName}`}
                  onClick={(event) => editStoreGroup(group, event.currentTarget)}
                >
                  <Pencil aria-hidden="true" />
                  Sửa
                </button>
              </article>
            );
          })}
        </div>
        {selectedGroup ? (
          <div className="control-store-cluster-overview">
            <div>
              <span>CATALOG ĐANG QUẢN LÝ</span>
              <h3 className="control-store-cluster-name">{selectedGroup.displayName}</h3>
              <p><code>{selectedGroup.key}</code> · {scopedCategories.length} danh mục · {scopedPackages.length} gói</p>
            </div>
            <button
              type="button"
              onClick={(event) => editStoreGroup(selectedGroup, event.currentTarget)}
            >
              <Pencil aria-hidden="true" /> Chỉnh tên hiển thị
            </button>
          </div>
        ) : (
          <p className="control-store-empty">Chưa có cụm để cấu hình Store.</p>
        )}
      </section>
      <dialog
        ref={groupDialogRef}
        className="control-store-group-dialog"
        aria-labelledby="store-group-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          closeGroupEditor();
        }}
      >
        {groupEditor ? (
          <form onSubmit={saveGroup}>
            <header>
              <div>
                <span>STORE IDENTITY</span>
                <h2 id="store-group-dialog-title">Sửa tên cụm trong Store</h2>
              </div>
              <button type="button" aria-label="Đóng" onClick={closeGroupEditor}>
                <X aria-hidden="true" />
              </button>
            </header>
            <p>
              Thay đổi chỉ áp dụng cho Store. Khóa kỹ thuật và dữ liệu telemetry
              được giữ nguyên.
            </p>
            <label>
              <span>Tên hiển thị</span>
              <input
                ref={groupNameRef}
                name="displayName"
                required
                maxLength={80}
                defaultValue={groupEditor.displayName}
              />
            </label>
            <label>
              <span>Khóa cụm</span>
              <input value={groupEditor.key} readOnly aria-readonly="true" />
            </label>
            <label>
              <span>Thứ tự</span>
              <input
                name="sortOrder"
                type="number"
                min={0}
                max={65535}
                defaultValue={groupEditor.sortOrder}
              />
            </label>
            <label className="control-store-switch">
              <input name="active" type="checkbox" defaultChecked={groupEditor.active} />
              <span>Hiện cụm trên Store</span>
            </label>
            {groupError ? <p className="control-store-group-error" role="alert">{groupError}</p> : null}
            <footer>
              <button type="button" onClick={closeGroupEditor}>Hủy</button>
              <button type="submit" disabled={busy}>
                <Pencil aria-hidden="true" /> {busy ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </footer>
          </form>
        ) : null}
      </dialog>
      <section className="control-store-kpis" aria-label="Tổng quan cửa hàng">
        <article>
          <Clock3 />
          <span>Chờ xác nhận</span>
          <strong>{kpis.pending}</strong>
        </article>
        <article>
          <ServerCog />
          <span>Đang giao</span>
          <strong>{kpis.delivering}</strong>
        </article>
        <article>
          <Check />
          <span>Hoàn tất</span>
          <strong>{kpis.fulfilled}</strong>
        </article>
        <article>
          <CircleDollarSign />
          <span>Giá trị đã giao</span>
          <strong>{money.format(kpis.revenue)}</strong>
        </article>
      </section>
      <section className="control-store-section control-store-categories">
        <header>
          <div>
            <span>CATEGORY MANAGER</span>
            <h2>Sắp xếp danh mục gói</h2>
          </div>
          <b>{scopedCategories.length} danh mục</b>
        </header>
        <div className="control-store-category-layout">
          <form onSubmit={saveCategory}>
            <label>
              <span>Tên danh mục</span>
              <input
                required
                maxLength={80}
                value={categoryEditor.name}
                onChange={(event) =>
                  setCategoryEditor((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Ví dụ: Gói tháng"
              />
            </label>
            <label>
              <span>Slug</span>
              <input
                required
                pattern="[a-z0-9-]+"
                maxLength={50}
                value={categoryEditor.slug}
                onChange={(event) =>
                  setCategoryEditor((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                placeholder="goi-thang"
              />
            </label>
            <label>
              <span>Thứ tự</span>
              <input
                type="number"
                min={0}
                max={65535}
                value={categoryEditor.sortOrder}
                onChange={(event) =>
                  setCategoryEditor((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="control-store-switch">
              <input
                type="checkbox"
                checked={categoryEditor.active}
                onChange={(event) =>
                  setCategoryEditor((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
              />
              <span>Hiện trên cửa hàng</span>
            </label>
            <div>
              {categoryEditor.id ? (
                <button type="button" onClick={() => setCategoryEditor({ ...blankCategory, groupKey: selectedGroupKey })}>
                  Hủy sửa
                </button>
              ) : null}
              <button type="submit" disabled={busy}>
                <Tags aria-hidden="true" />
                {categoryEditor.id ? "Lưu danh mục" : "Thêm danh mục"}
              </button>
            </div>
          </form>
          <div className="control-store-category-list">
            {scopedCategories.map((category) => (
              <article key={category.id} className={category.active ? "" : "is-disabled"}>
                <span><Tags aria-hidden="true" /></span>
                <div>
                  <strong>{category.name}</strong>
                  <small>{category.slug} · {category.packageCount} gói</small>
                </div>
                <button type="button" onClick={() => setCategoryEditor(category)}>
                  Chỉnh sửa
                </button>
                <button
                  type="button"
                  aria-label={`Xóa danh mục ${category.name}`}
                  disabled={busy || category.packageCount > 0}
                  onClick={() => void removeCategory(category)}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </article>
            ))}
            {scopedCategories.length === 0 ? (
              <p className="control-store-empty">Chưa có danh mục. Gói chưa phân loại sẽ nằm trong mục Khác.</p>
            ) : null}
          </div>
        </div>
      </section>
      <section className="control-store-section">
        <header>
          <div>
            <span>PACKAGE CATALOG</span>
            <h2>Gói nạp đang cấu hình</h2>
          </div>
          <b>{visiblePackages.length}/{scopedPackages.length} gói</b>
        </header>
        <div className="control-store-category-tabs" role="group" aria-label="Lọc gói theo danh mục">
          <button type="button" className={catalogCategory === "all" ? "is-selected" : ""} aria-pressed={catalogCategory === "all"} onClick={() => setCatalogCategory("all")}>Tất cả <b>{scopedPackages.length}</b></button>
          {scopedCategories.map((category) => (
            <button key={category.id} type="button" className={catalogCategory === category.id ? "is-selected" : ""} aria-pressed={catalogCategory === category.id} onClick={() => setCatalogCategory(category.id)}>{category.name} <b>{category.packageCount}</b></button>
          ))}
        </div>
        <div className="control-store-package-list">
          {visiblePackages.map((item) => (
            <article key={item.id} className={item.active ? "" : "is-disabled"}>
              <span
                className={`control-store-package-art is-${item.accent}`}
                style={item.imagePath ? { backgroundImage: `url(${item.imagePath})` } : undefined}
              >
                {!item.imagePath ? <ShoppingBag aria-hidden="true" /> : null}
              </span>
              <div>
                <small>
                  {item.groupKey}
                  {" // "}
                  {item.slug}
                </small>
                <h3>{item.name}</h3>
                <div className="control-store-package-tags">
                  {item.featured ? <b>Nổi bật</b> : null}
                  {item.badge ? <b>{item.badge}</b> : null}
                  <b>{scopedCategories.find((category) => category.id === item.categoryId)?.name ?? "Khác"}</b>
                </div>
                <p>{item.description}</p>
              </div>
              <strong>{money.format(item.priceVnd)}</strong>
              <button type="button" onClick={() => openPackageEditor(item)}>
                Chỉnh sửa
                <ChevronRight aria-hidden="true" />
              </button>
            </article>
          ))}
          {visiblePackages.length === 0 ? (
            <p className="control-store-empty">
              Chưa có gói nào. Tạo gói đầu tiên để mở catalog.
            </p>
          ) : null}
        </div>
      </section>
      <section className="control-store-section control-store-payments">
        <header>
          <div>
            <span>PAYMENT ACTIVITY</span>
            <h2>Giao dịch và đối soát</h2>
          </div>
          <b>{filteredPayments.length}/{payments.length}</b>
        </header>
        <div className="control-store-filters">
          <label>
            <Search aria-hidden="true" />
            <span className="sr-only">Tìm giao dịch</span>
            <input value={paymentQuery} onChange={(event) => setPaymentQuery(event.target.value)} placeholder="Mã đơn, email, tài khoản, player..." />
          </label>
          <label>
            <CircleDollarSign aria-hidden="true" />
            <span className="sr-only">Lọc provider</span>
            <select value={paymentProvider} onChange={(event) => setPaymentProvider(event.target.value)}>
              <option value="all">Tất cả provider</option>
              <option value="sandbox">Sandbox</option>
              <option value="payos">payOS / VietQR</option>
              <option value="momo">MoMo</option>
            </select>
          </label>
          <label>
            <Filter aria-hidden="true" />
            <span className="sr-only">Lọc trạng thái giao dịch</span>
            <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="creating">Đang tạo</option>
              <option value="awaiting_payment">Chờ thanh toán</option>
              <option value="paid">Đã thanh toán</option>
              <option value="simulated">Đã mô phỏng</option>
              <option value="failed">Thất bại</option>
              <option value="expired">Hết hạn</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </label>
          <label>
            <ServerCog aria-hidden="true" />
            <span className="sr-only">Lọc cụm giao dịch</span>
            <select value={paymentGroup} onChange={(event) => setPaymentGroup(event.target.value)}>
              <option value="all">Tất cả cụm</option>
              {storeGroups.map((item) => <option key={item.key} value={item.key}>{item.displayName}</option>)}
            </select>
          </label>
        </div>
        <div className="control-store-table">
          <table>
            <thead><tr><th>Giao dịch</th><th>Tài khoản web</th><th>Player / cụm</th><th>Thanh toán</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td><strong>{payment.reference}</strong><small>{new Date(payment.createdAt).toLocaleString("vi-VN")}</small></td>
                  <td><strong>@{payment.accountUsername}</strong><small>{payment.accountEmail}</small></td>
                  <td><strong>{payment.minecraftUsername}</strong><small>{payment.packageName} · {payment.groupKey}</small></td>
                  <td><strong>{money.format(payment.amountVnd)}</strong><small>{payment.provider.toUpperCase()} · {payment.providerTransactionId ?? "Chưa có transaction ID"}</small></td>
                  <td>
                    <span className={`store-admin-status is-${payment.attemptStatus}`}><i />{payment.attemptStatus}</span>
                    <small>{payment.deliveryStatus ?? payment.orderStatus}</small>
                    {payment.signatureWarning ? <b className="control-payment-warning">Chữ ký lỗi</b> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPayments.length === 0 ? <p className="control-store-empty">Chưa có giao dịch phù hợp bộ lọc.</p> : null}
        </div>
      </section>
      <section className="control-store-section">
        <header>
          <div>
            <span>ORDER QUEUE</span>
            <h2>Đơn hàng và delivery</h2>
          </div>
          <b>
            {filtered.length}/{orders.length}
          </b>
        </header>
        <div className="control-store-filters">
          <label>
            <Search aria-hidden="true" />
            <span className="sr-only">Tìm đơn hàng</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Mã đơn, tài khoản, nhân vật..."
            />
          </label>
          <label>
            <Filter aria-hidden="true" />
            <span className="sr-only">Lọc trạng thái</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <ServerCog aria-hidden="true" />
            <span className="sr-only">Lọc cụm</span>
            <select
              value={orderGroup}
              onChange={(event) => setOrderGroup(event.target.value)}
            >
              <option value="all">Tất cả cụm</option>
              {storeGroups.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <CircleDollarSign aria-hidden="true" />
            <span className="sr-only">Lọc phương thức thanh toán</span>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              <option value="all">Tất cả thanh toán</option>
              <option value="momo">MoMo</option>
              <option value="bank">Ngân hàng</option>
            </select>
          </label>
        </div>
        <div className="control-store-table">
          <table>
            <thead>
              <tr>
                <th>Đơn / tài khoản</th>
                <th>Gói và nhân vật</th>
                <th>Thanh toán</th>
                <th>Trạng thái</th>
                <th>Delivery</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const stale =
                  order.deliveryStatus === "claimed" &&
                  order.claimedAt &&
                  Date.now() - new Date(order.claimedAt).getTime() > 120000;
                return (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.reference}</strong>
                      <small>@{order.account}</small>
                    </td>
                    <td>
                      <strong>{order.packageName}</strong>
                      <small>
                        {order.minecraftUsername} · {order.groupKey}
                      </small>
                    </td>
                    <td>
                      <strong>{money.format(order.priceVnd)}</strong>
                      <small>
                        {order.paymentMethod === "momo" ? "MoMo" : "Ngân hàng"}
                      </small>
                    </td>
                    <td>
                      <span className={`store-admin-status is-${order.status}`}>
                        <i />
                        {labels[order.status] ?? order.status}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {stale
                          ? "Cần kiểm tra"
                          : (order.deliveryStatus ?? "Chưa tạo")}
                      </strong>
                      <small>
                        {order.claimedByServer ?? "Chưa có backend claim"}
                      </small>
                    </td>
                    <td>
                      <div>
                        {order.status === "pending_payment" ? (
                          <>
                            <button
                              type="button"
                              className="is-approve"
                              onClick={() => {
                                setConfirmation("");
                                setDialog({ order, action: "approve" });
                              }}
                            >
                              Duyệt
                            </button>
                            <button
                              type="button"
                              className="is-cancel"
                              onClick={() => {
                                setConfirmation("");
                                setDialog({ order, action: "cancel" });
                              }}
                            >
                              Hủy
                            </button>
                          </>
                        ) : (
                          <span>Đã xử lý</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="control-store-empty">Không có đơn phù hợp bộ lọc.</p>
          ) : null}
        </div>
      </section>
      <dialog
        ref={editorDialogRef}
        className="control-store-editor-backdrop"
        aria-labelledby="store-package-editor-title"
        onCancel={(event) => {
          event.preventDefault();
          if (!busy) setEditor(null);
        }}
      >
        {editor ? (
          <form className="control-store-editor" onSubmit={savePackage}>
            <header>
              <div>
                <span>PACKAGE EDITOR</span>
                <h2 id="store-package-editor-title">
                  {editor.id ? "Chỉnh sửa gói" : "Tạo gói mới"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Đóng trình chỉnh sửa"
                onClick={() => setEditor(null)}
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="control-store-form-grid">
              <label>
                <span>Tên gói</span>
                <input
                  required
                  maxLength={80}
                  value={editor.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </label>
              <label>
                <span>Slug</span>
                <input
                  required
                  pattern="[a-z0-9-]+"
                  maxLength={50}
                  value={editor.slug}
                  onChange={(event) => update("slug", event.target.value)}
                />
              </label>
              <label>
                <span>Cụm</span>
                <select
                  required
                  value={editor.groupKey}
                  onChange={(event) =>
                    setEditor((current) =>
                      current
                        ? { ...current, groupKey: event.target.value, categoryId: null }
                        : current,
                    )
                  }
                >
                  {storeGroups.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Giá VNĐ</span>
                <input
                  required
                  type="number"
                  min={1000}
                  max={100000000}
                  step={1000}
                  value={editor.priceVnd}
                  onChange={(event) =>
                    update("priceVnd", Number(event.target.value))
                  }
                />
              </label>
              <label>
                <span>Danh mục</span>
                <select
                  value={editor.categoryId ?? ""}
                  onChange={(event) =>
                    update(
                      "categoryId",
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                >
                  <option value="">Khác / chưa phân loại</option>
                  {categories
                    .filter((category) => category.groupKey === editor.groupKey)
                    .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                    ))}
                </select>
              </label>
              <label>
                <span>Badge ngắn</span>
                <input
                  maxLength={20}
                  value={editor.badge ?? ""}
                  onChange={(event) => update("badge", event.target.value || null)}
                  placeholder="Hot, Mới, -20%..."
                />
              </label>
              <label className="is-wide">
                <span>Mô tả</span>
                <textarea
                  required
                  maxLength={500}
                  value={editor.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                />
              </label>
              <div className="control-store-image-field is-wide">
                <div
                  className="control-store-image-preview"
                  style={
                    editor.imagePath
                      ? { backgroundImage: `url(${editor.imagePath})` }
                      : undefined
                  }
                >
                  {!editor.imagePath ? <ImagePlus aria-hidden="true" /> : null}
                </div>
                <label>
                  <span>Ảnh đại diện gói</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  />
                  <small>JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh ngang 4:3 cho kết quả tốt nhất.</small>
                </label>
                {editor.id && editor.imagePath ? (
                  <button type="button" disabled={busy} onClick={() => void removePackageImage()}>
                    <Trash2 aria-hidden="true" /> Gỡ ảnh
                  </button>
                ) : null}
              </div>
              <label className="is-wide">
                <span>Lệnh console</span>
                <input
                  required
                  maxLength={512}
                  value={editor.commandTemplate}
                  onChange={(event) =>
                    update("commandTemplate", event.target.value)
                  }
                />
                <small>
                  Biến: {"{player}"}, {"{package}"}, {"{amount}"}, {"{cluster}"}
                </small>
              </label>
              <div className="control-store-command-preview">
                <TerminalSquare aria-hidden="true" />
                <span>COMMAND PREVIEW</span>
                <code>{preview(editor.commandTemplate)}</code>
              </div>
              <label>
                <span>Màu</span>
                <select
                  value={editor.accent}
                  onChange={(event) => update("accent", event.target.value)}
                >
                  <option value="cyan">Cyan</option>
                  <option value="violet">Tím</option>
                  <option value="sapphire">Sapphire</option>
                  <option value="ice">Trắng xanh</option>
                </select>
              </label>
              <label>
                <span>Thứ tự</span>
                <input
                  type="number"
                  min={0}
                  max={65535}
                  value={editor.sortOrder}
                  onChange={(event) =>
                    update("sortOrder", Number(event.target.value))
                  }
                />
              </label>
              <label className="control-store-switch">
                <input
                  type="checkbox"
                  checked={editor.active}
                  onChange={(event) => update("active", event.target.checked)}
                />
                <span>Bật gói trên cửa hàng</span>
              </label>
              <label className="control-store-switch">
                <input
                  type="checkbox"
                  checked={editor.featured}
                  onChange={(event) => update("featured", event.target.checked)}
                />
                <span>Đưa vào khu gói nổi bật</span>
              </label>
            </div>
            <footer>
              {editor.id ? (
                <button type="button" className="is-danger" disabled={busy} onClick={() => void removePackage()}>
                  <Trash2 aria-hidden="true" /> Xóa gói
                </button>
              ) : null}
              <button type="button" onClick={() => setEditor(null)}>
                Hủy
              </button>
              <button type="submit" disabled={busy}>
                <ShieldCheck aria-hidden="true" />
                {busy ? "Đang lưu..." : "Lưu gói"}
              </button>
            </footer>
          </form>
        ) : null}
      </dialog>
      <dialog
        ref={dialogRef}
        className="control-store-dialog"
        aria-labelledby="store-order-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          if (!busy) {
            setDialog(null);
            setConfirmation("");
          }
        }}
      >
        {dialog ? (
          <>
            <header>
              <span
                className={
                  dialog.action === "approve" ? "is-approve" : "is-cancel"
                }
              >
                {dialog.action === "approve" ? (
                  <TerminalSquare aria-hidden="true" />
                ) : (
                  <AlertTriangle aria-hidden="true" />
                )}
              </span>
              <div>
                <small>
                  {dialog.action === "approve"
                    ? "QUEUE CONSOLE COMMAND"
                    : "CANCEL ORDER"}
                </small>
                <h2 id="store-order-dialog-title">
                  {dialog.action === "approve"
                    ? "Duyệt và giao gói?"
                    : "Hủy đơn hàng?"}
                </h2>
              </div>
            </header>
            <p>
              {dialog.action === "approve"
                ? "Thao tác này tạo một lệnh console thật cho backend thuộc cụm đã chọn. Lệnh không tự chạy lại nếu mất kết quả."
                : "Đơn bị hủy sẽ không thể duyệt lại."}
            </p>
            <dl>
              <div>
                <dt>Mã đơn</dt>
                <dd>{dialog.order.reference}</dd>
              </div>
              <div>
                <dt>Nhân vật</dt>
                <dd>{dialog.order.minecraftUsername}</dd>
              </div>
              <div>
                <dt>Cụm</dt>
                <dd>{dialog.order.groupKey}</dd>
              </div>
              <div>
                <dt>Gói</dt>
                <dd>{dialog.order.packageName}</dd>
              </div>
            </dl>
            {dialog.action === "approve" ? (
              <div className="control-store-dialog-command">
                <span>COMMAND PREVIEW</span>
                <code>
                  {preview(
                    dialog.order.commandTemplateSnapshot ??
                      "Không tìm thấy template",
                    {
                      player: dialog.order.minecraftUsername,
                      package: dialog.order.packageSlug,
                      amount: String(dialog.order.priceVnd),
                      cluster: dialog.order.groupKey,
                    },
                  )}
                </code>
              </div>
            ) : null}
            <label>
              <span>
                Nhập <strong>{dialog.order.reference}</strong> để xác nhận
              </span>
              <input
                autoComplete="off"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            <footer>
              <button
                ref={cancelRef}
                type="button"
                disabled={busy}
                onClick={() => {
                  setDialog(null);
                  setConfirmation("");
                }}
              >
                Quay lại
              </button>
              <button
                type="button"
                className={
                  dialog.action === "approve" ? "is-approve" : "is-cancel"
                }
                disabled={busy || confirmation !== dialog.order.reference}
                onClick={() => void mutateOrder()}
              >
                {busy
                  ? "Đang xử lý..."
                  : dialog.action === "approve"
                    ? "Duyệt và xếp hàng"
                    : "Xác nhận hủy"}
              </button>
            </footer>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
