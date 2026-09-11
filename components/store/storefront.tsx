"use client";

import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Gamepad2,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { startTransition, useEffect, useRef, useState } from "react";
import type { PublicStoreGroup, PublicStoreOrder, PublicStorePackage } from "@/lib/store/service";
import type { PublicPayment } from "@/lib/store/payments/service";
import type { StorePaymentMethod } from "@/lib/store/validation";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const statusLabel: Record<string, string> = {
  pending_payment: "Chờ xác nhận",
  approved: "Đã duyệt",
  delivering: "Đang giao",
  fulfilled: "Hoàn tất",
  failed: "Giao thất bại",
  needs_review: "Cần kiểm tra",
  cancelled: "Đã hủy",
};

const steps = ["Nhân vật", "Gói nạp", "Thanh toán", "Hoàn tất"];
type StoreErrorField = "username" | "cluster" | "package" | "submit";
type StoreResume = {
  resume?: string;
  username?: string;
  group?: string;
  packageId?: string;
  payment?: string;
};

function formatGroup(groups: PublicStoreGroup[], value: string) {
  return groups.find((group) => group.key === value)?.displayName ?? (value ? value.replaceAll("-", " ") : "Chưa chọn");
}

export function Storefront({
  groups,
  packages,
  initialOrders,
  signedIn,
  catalogAvailable,
  resume,
}: {
  groups: PublicStoreGroup[];
  packages: PublicStorePackage[];
  initialOrders: PublicStoreOrder[];
  signedIn: boolean;
  catalogAvailable: boolean;
  resume?: StoreResume;
}) {
  const resumedUsername = /^[A-Za-z0-9_]{1,16}$/.test(resume?.username ?? "")
    ? resume?.username ?? ""
    : "";
  const resumedGroup = groups.some((item) => item.key === resume?.group)
    ? resume?.group ?? ""
    : "";
  const resumedPackage = packages.find(
    (item) =>
      item.id === Number(resume?.packageId) && item.groupKey === resumedGroup,
  );
  const resumedPackageId = resumedPackage?.id ?? 0;
  const resumedPayment: StorePaymentMethod =
    resume?.payment === "bank" ? "bank" : "momo";
  const canResume =
    resume?.resume === "1" &&
    Boolean(resumedUsername) &&
    Boolean(resumedGroup) &&
    Boolean(resumedPackage) &&
    groups.some((item) => item.key === resumedGroup && item.online);
  const [step, setStep] = useState(canResume ? 3 : 0);
  const [username, setUsername] = useState(resumedUsername);
  const [group, setGroup] = useState(resumedGroup);
  const [packageId, setPackageId] = useState(resumedPackageId);
  const [payment, setPayment] = useState<StorePaymentMethod>(resumedPayment);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<StoreErrorField | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentSession, setPaymentSession] = useState<PublicPayment | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const requestKeyRef = useRef("");
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef(canResume ? -1 : step);

  const available = packages.filter((item) => item.groupKey === group);
  const categories = [
    ...new Map(
      available.map((item) => [
        item.categorySlug,
        { slug: item.categorySlug, name: item.categoryName },
      ]),
    ).values(),
  ];
  const featuredPackages = available.filter((item) => item.featured);
  const filteredPackages = available.filter(
    (item) => categoryFilter === "all" || item.categorySlug === categoryFilter,
  );
  const selected =
    packages.find((item) => item.id === packageId && item.groupKey === group);
  const online = groups.find((item) => item.key === group)?.online ?? false;
  const selectedGroupKey = group;
  const paymentLabel = payment === "momo" ? "Ví MoMo" : "Ngân hàng";

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    const frame = window.requestAnimationFrame(() => stageHeadingRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    if (!paymentSession) return;
    const terminalAttempts = ["paid", "simulated", "expired", "cancelled", "failed"];
    const terminalOrders = ["approved", "delivering", "fulfilled", "failed", "needs_review", "cancelled"];
    if (terminalAttempts.includes(paymentSession.status) || terminalOrders.includes(paymentSession.orderStatus)) return;
    const poll = window.setInterval(async () => {
      const response = await fetch(`/api/store/orders/${encodeURIComponent(paymentSession.reference)}/payment`, { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) return;
      setPaymentSession(body.payment);
      setOrders((current) => current.map((order) => order.reference === body.payment.reference ? { ...order, status: body.payment.orderStatus } : order));
    }, 3_000);
    return () => window.clearInterval(poll);
  }, [paymentSession]);

  useEffect(() => {
    if (!paymentSession?.expiresAt) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [paymentSession?.expiresAt]);

  function clearError() {
    setError("");
    setErrorField(null);
  }

  function showError(field: StoreErrorField, message: string) {
    setError(message);
    setErrorField(field);
  }

  function next() {
    clearError();
    if (step === 0 && !/^[A-Za-z0-9_]{1,16}$/.test(username)) {
      showError(
        "username",
        "Tên Minecraft chỉ gồm chữ, số, dấu gạch dưới và tối đa 16 ký tự.",
      );
      return;
    }
    if (step === 0 && !group) {
      showError("cluster", "Vui lòng chọn cụm máy chủ nhận gói.");
      return;
    }
    if (step === 0 && !online) {
      showError("cluster", "Cụm này đang offline nên chưa thể nhận đơn mới.");
      return;
    }
    if (step === 1 && !selected) {
      showError("package", "Vui lòng chọn một gói nạp.");
      return;
    }
    if (
      step === 0 &&
      selected &&
      window.matchMedia("(min-width: 1100px)").matches
    ) {
      setStep(2);
      return;
    }
    setStep((value) => Math.min(3, value + 1));
  }

  function selectGroup(value: string) {
    setGroup(value);
    setPackageId(0);
    setCategoryFilter("all");
    clearError();
  }

  async function submit() {
    if (!signedIn) {
      showError("submit", "Bạn cần đăng nhập trước khi tạo đơn.");
      return;
    }
    if (!selected) return;
    if (!requestKeyRef.current) requestKeyRef.current = crypto.randomUUID();
    setPending(true);
    clearError();
    try {
      const response = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          packageId: selected.id,
          minecraftUsername: username,
          paymentMethod: payment,
          clientRequestKey: requestKeyRef.current,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Không thể tạo đơn.");
      }
      startTransition(() => {
        setOrders((current) => [body.order, ...current]);
        setPaymentSession(body.payment ?? null);
        setStep(4);
      });
    } catch (submitError) {
      showError(
        "submit",
        submitError instanceof Error
          ? submitError.message
          : "Không thể tạo đơn.",
      );
    } finally {
      setPending(false);
    }
  }

  const latest = orders[0];
  const remainingSeconds = paymentSession?.expiresAt
    ? Math.max(0, Math.ceil((new Date(paymentSession.expiresAt).getTime() - clock) / 1_000))
    : 0;
  const resumeParams = new URLSearchParams({
    resume: "1",
    username,
    group,
    package: selected ? String(selected.id) : "",
    payment,
  });
  const resumeTarget = `/store?${resumeParams.toString()}`;
  const loginHref = `/login?next=${encodeURIComponent(resumeTarget)}`;

  return (
    <div className="store-shell">
      <section className="store-intro" aria-labelledby="store-title">
        <span>NẠP THẺ EDOLAS</span>
        <h1 id="store-title">Nạp thẻ Edolas, nhận gói đúng nhân vật.</h1>
        <p>
          Chọn nhân vật, gói nạp và cách thanh toán. Đội ngũ Edolas sẽ xác nhận
          đơn trước khi gửi quyền lợi vào cụm máy chủ bạn đã chọn.
        </p>
        <div aria-label="Quyền lợi khi nạp thẻ">
          <span>
            <ShieldCheck aria-hidden="true" />
            Xác nhận an toàn
          </span>
          <span>
            <PackageCheck aria-hidden="true" />
            Giao đúng nhân vật
          </span>
          <span>
            <ReceiptText aria-hidden="true" />
            Theo dõi trạng thái
          </span>
        </div>
      </section>

      {!catalogAvailable ? (
        <p className="store-unavailable" role="status">
          Danh sách gói đang tạm gián đoạn. Đơn cũ vẫn hiển thị, nhưng chưa thể
          tạo đơn mới lúc này.
        </p>
      ) : null}

      <div className="store-layout">
        <section
          className="store-checkout"
          aria-labelledby="store-checkout-title"
          aria-busy={pending}
        >
          <header>
            <div>
              <span>TẠO ĐƠN NẠP MỚI</span>
              <h2 id="store-checkout-title">
                {step < 4 ? steps[Math.min(step, 3)] : "Đơn đã được tạo"}
              </h2>
            </div>
            <b>{step < 4 ? `Bước ${step + 1}/4` : "Xong"}</b>
          </header>

          <ol className="store-progress" aria-label="Tiến trình tạo đơn">
            {steps.map((label, index) => (
              <li
                key={label}
                aria-current={index === step ? "step" : undefined}
                className={
                  index === step
                    ? "is-current"
                    : index < step || step === 4
                      ? "is-complete"
                      : ""
                }
              >
                <span>
                  {index < step || step === 4 ? (
                    <Check aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <small>{label}</small>
              </li>
            ))}
          </ol>

          <div className="store-stage" aria-live="polite">
            {step === 0 ? (
              <div className="store-form-stage">
                <span className="store-stage-kicker">
                  <Gamepad2 aria-hidden="true" />
                  THÔNG TIN NHẬN GÓI
                </span>
                <h3 ref={stageHeadingRef} tabIndex={-1}>
                  Chọn nhân vật nhận gói
                </h3>
                <p>Nhập đúng tên trong game và cụm máy chủ bạn đang chơi.</p>

                <label className="store-field">
                  <span>Tên Minecraft</span>
                  <input
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      if (errorField === "username") clearError();
                    }}
                    maxLength={16}
                    autoComplete="off"
                    placeholder="Ví dụ: QuocBaooo"
                    aria-invalid={errorField === "username"}
                    aria-describedby={
                      errorField === "username"
                        ? "store-error username-help"
                        : "username-help"
                    }
                  />
                  <small id="username-help">
                    Tối đa 16 ký tự, gồm chữ, số và dấu gạch dưới.
                  </small>
                </label>

                <fieldset
                  className="store-cluster-grid"
                  aria-invalid={errorField === "cluster"}
                  aria-describedby={
                    errorField === "cluster" ? "store-error" : undefined
                  }
                >
                  <legend>Cụm máy chủ nhận gói</legend>
                  {groups.map((group) => (
                    <button
                      key={group.key}
                      type="button"
                      className={selectedGroupKey === group.key ? "is-selected" : ""}
                      aria-pressed={selectedGroupKey === group.key}
                      onClick={() => selectGroup(group.key)}
                    >
                      <span>
                        <i
                          aria-hidden="true"
                          className={group.online ? "is-online" : ""}
                        />
                        {group.online ? "ĐANG MỞ" : "TẠM ĐÓNG"}
                      </span>
                      <strong className="store-cluster-name">{group.displayName}</strong>
                      <small>
                        {
                          packages.filter((pack) => pack.groupKey === group.key)
                            .length
                        }{" "}
                        gói đang có
                      </small>
                    </button>
                  ))}
                </fieldset>
              </div>
            ) : null}

            {step === 1 || (step === 0 && group) ? (
              <div
                className={`store-form-stage ${step === 0 ? "store-desktop-catalog" : ""}`}
              >
                <span className="store-stage-kicker">
                  <Sparkles aria-hidden="true" />
                  CHỌN QUYỀN LỢI
                </span>
                <h3 ref={stageHeadingRef} tabIndex={-1}>
                  Gói nào phù hợp với bạn?
                </h3>
                <p>
                  Gói sẽ được gửi cho <strong>{username}</strong> tại cụm{" "}
                  <strong>{formatGroup(groups, group)}</strong>.
                </p>

                {featuredPackages.length > 0 ? (
                  <section className="store-featured-rail" aria-labelledby="store-featured-title">
                    <header>
                      <span><Sparkles aria-hidden="true" /> GỢI Ý NỔI BẬT</span>
                      <h4 id="store-featured-title">Gói được chọn nhiều</h4>
                    </header>
                    <div>
                      {featuredPackages.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`store-catalog-card is-featured is-${item.accent} ${selected?.id === item.id ? "is-selected" : ""}`}
                          aria-pressed={selected?.id === item.id}
                          onClick={() => { setPackageId(item.id); clearError(); }}
                        >
                          <span
                            className="store-catalog-art"
                            style={item.imagePath ? { backgroundImage: `url(${item.imagePath})` } : undefined}
                          >
                            {item.badge ? <b>{item.badge}</b> : null}
                            <i>{item.categoryName}</i>
                          </span>
                          <span className="store-catalog-copy">
                            <small>Đã bán {item.soldCount.toLocaleString("vi-VN")} gói</small>
                            <strong>{item.name}</strong>
                            <em>{money.format(item.priceVnd)}</em>
                          </span>
                          <span className="store-catalog-check" aria-hidden="true">
                            {selected?.id === item.id ? <Check /> : <ChevronRight />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                <div className="store-category-tabs" role="group" aria-label="Lọc danh mục gói">
                  <button type="button" className={categoryFilter === "all" ? "is-active" : ""} aria-pressed={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>Tất cả</button>
                  {categories.map((category) => (
                    <button key={category.slug} type="button" className={categoryFilter === category.slug ? "is-active" : ""} aria-pressed={categoryFilter === category.slug} onClick={() => setCategoryFilter(category.slug)}>{category.name}</button>
                  ))}
                </div>

                <fieldset
                  className="store-package-grid store-catalog-grid"
                  aria-label="Chọn gói nạp"
                  aria-invalid={errorField === "package"}
                  aria-describedby={errorField === "package" ? "store-error" : undefined}
                >
                  {filteredPackages.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`store-catalog-card is-${item.accent} ${selected?.id === item.id ? "is-selected" : ""}`}
                      aria-pressed={selected?.id === item.id}
                      onClick={() => { setPackageId(item.id); clearError(); }}
                    >
                      <span
                        className="store-catalog-art"
                        style={item.imagePath ? { backgroundImage: `url(${item.imagePath})` } : undefined}
                      >
                        {item.badge ? <b>{item.badge}</b> : null}
                        <i>{item.categoryName}</i>
                      </span>
                      <span className="store-catalog-copy">
                        <small>Đã bán {item.soldCount.toLocaleString("vi-VN")} gói</small>
                        <strong>{item.name}</strong>
                        <p>{item.description}</p>
                        <em>{money.format(item.priceVnd)}</em>
                      </span>
                      <span className="store-catalog-check" aria-hidden="true">
                        {selected?.id === item.id ? <Check /> : <ChevronRight />}
                      </span>
                    </button>
                  ))}
                </fieldset>

                {available.length === 0 ? (
                  <p className="store-empty">
                    Cụm này chưa có gói nạp đang bật.
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="store-form-stage">
                <span className="store-stage-kicker">
                  <ReceiptText aria-hidden="true" />
                  CÁCH THANH TOÁN
                </span>
                <h3 ref={stageHeadingRef} tabIndex={-1}>
                  Chọn cách bạn muốn thanh toán
                </h3>
                <p>
                  Đơn sẽ chờ xác nhận sau khi được tạo. Bạn luôn có thể xem lại
                  trạng thái ở lịch sử bên dưới.
                </p>

                <div className="store-payment-grid">
                  <button
                    type="button"
                    className={payment === "momo" ? "is-selected" : ""}
                    aria-pressed={payment === "momo"}
                    onClick={() => setPayment("momo")}
                  >
                    <span>
                      <Smartphone aria-hidden="true" />
                    </span>
                    <strong>Ví MoMo</strong>
                    <small>Quét mã hoặc chuyển theo mã đơn</small>
                    <i aria-hidden="true">
                      {payment === "momo" ? <Check /> : null}
                    </i>
                  </button>
                  <button
                    type="button"
                    className={payment === "bank" ? "is-selected" : ""}
                    aria-pressed={payment === "bank"}
                    onClick={() => setPayment("bank")}
                  >
                    <span>
                      <Building2 aria-hidden="true" />
                    </span>
                    <strong>Ngân hàng</strong>
                    <small>Chuyển khoản với nội dung mã đơn</small>
                    <i aria-hidden="true">
                      {payment === "bank" ? <Check /> : null}
                    </i>
                  </button>
                </div>

                <div className="store-demo-payment">
                  <span>THÔNG TIN MẪU</span>
                  <strong>Thông tin thanh toán minh họa</strong>
                  <p>
                    Số nhận: <b>0900 000 000</b>
                  </p>
                  <p>
                    Chủ tài khoản: <b>EDOLAS NETWORK</b>
                  </p>
                  <small>Không chuyển tiền thật vào thông tin mẫu này.</small>
                </div>
              </div>
            ) : null}

            {step === 3 && selected ? (
              <div className="store-form-stage">
                <span className="store-stage-kicker">
                  <Check aria-hidden="true" />
                  KIỂM TRA ĐƠN
                </span>
                <h3 ref={stageHeadingRef} tabIndex={-1}>
                  Kiểm tra và hoàn tất
                </h3>
                <p>
                  Hãy chắc chắn tên nhân vật và cụm máy chủ đều chính xác trước
                  khi tạo đơn.
                </p>
                <dl className="store-review">
                  <div>
                    <dt>Nhân vật</dt>
                    <dd>{username}</dd>
                  </div>
                  <div>
                    <dt>Cụm nhận gói</dt>
                    <dd>{formatGroup(groups, group)}</dd>
                  </div>
                  <div>
                    <dt>Gói nạp</dt>
                    <dd>{selected.name}</dd>
                  </div>
                  <div>
                    <dt>Thanh toán</dt>
                    <dd>{paymentLabel}</dd>
                  </div>
                  <div className="is-total">
                    <dt>Tổng thanh toán</dt>
                    <dd>{money.format(selected.priceVnd)}</dd>
                  </div>
                </dl>
                <p className="store-review-notice">
                  <ShieldCheck aria-hidden="true" />
                  Đơn chỉ được giao sau khi đội ngũ Edolas xác nhận thanh toán.
                </p>
                {!signedIn ? (
                  <Link href={loginHref} className="store-login-gate">
                    Đăng nhập để tiếp tục <ChevronRight aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            ) : null}

            {step === 4 && latest ? (
              <div className="store-payment-receipt">
                <div className="store-payment-heading">
                  <span><Check aria-hidden="true" /></span>
                  <div>
                    <p>PHIÊN THANH TOÁN ĐÃ SẴN SÀNG</p>
                    <h3 ref={stageHeadingRef} tabIndex={-1}>{latest.reference}</h3>
                  </div>
                  {paymentSession?.provider === "sandbox" ? (
                    <b className="store-sandbox-badge">SANDBOX · KHÔNG CHUYỂN TIỀN</b>
                  ) : null}
                </div>
                {paymentSession?.qrContent ? (
                  <div className="store-payment-board">
                    <div className="store-payment-qr" aria-label="Mã QR thanh toán">
                      <QRCodeSVG value={paymentSession.qrContent} size={224} level="M" marginSize={2} />
                    </div>
                    <div className="store-payment-details">
                      <span>{paymentSession.provider === "payos" ? "VietQR / Ngân hàng" : paymentSession.provider === "momo" ? "MoMo" : "Sandbox"}</span>
                      <strong>{money.format(paymentSession.amountVnd)}</strong>
                      <dl>
                        <div><dt>Nhân vật</dt><dd>{latest.minecraftUsername}</dd></div>
                        <div><dt>Cụm</dt><dd>{formatGroup(groups, latest.groupKey)}</dd></div>
                        <div><dt>Gói</dt><dd>{latest.packageName}</dd></div>
                        <div><dt>Còn lại</dt><dd>{Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}</dd></div>
                      </dl>
                      <p aria-live="polite">
                        {paymentSession.status === "simulated"
                          ? "Đã mô phỏng thành công, không có tiền thật được nhận."
                          : statusLabel[paymentSession.orderStatus] ?? "Đang chờ thanh toán"}
                      </p>
                      <div className="store-payment-actions">
                        <button type="button" onClick={async () => { await navigator.clipboard.writeText(latest.reference); setCopied(true); }}>
                          <Copy aria-hidden="true" /> {copied ? "Đã sao chép" : "Sao chép mã đơn"}
                        </button>
                        {paymentSession.provider === "sandbox" && paymentSession.checkoutUrl && paymentSession.status === "awaiting_payment" ? (
                          <button type="button" className="is-primary" disabled={pending} onClick={async () => {
                            setPending(true);
                            try {
                              const response = await fetch(paymentSession.checkoutUrl!, { method: "POST" });
                              const body = await response.json();
                              if (!response.ok || !body.ok) throw new Error(body.error || "Không thể mô phỏng thanh toán.");
                              setPaymentSession((current) => current ? { ...current, status: "simulated" } : current);
                            } catch (simulationError) {
                              showError("submit", simulationError instanceof Error ? simulationError.message : "Không thể mô phỏng thanh toán.");
                            } finally { setPending(false); }
                          }}>Mô phỏng đã thanh toán</button>
                        ) : paymentSession.checkoutUrl ? (
                          <a href={paymentSession.checkoutUrl} target="_blank" rel="noreferrer">Mở ứng dụng thanh toán</a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="store-error">Không tải được thông tin QR. Đơn chưa được thanh toán.</p>
                )}
              </div>
            ) : null}

            {error ? (
              <p id="store-error" className="store-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          {step < 4 ? (
            <footer>
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setStep((value) => Math.max(0, value - 1));
                }}
                disabled={step === 0 || pending}
              >
                <ChevronLeft aria-hidden="true" />
                Quay lại
              </button>
              {step < 3 ? (
                <button type="button" className="is-primary" onClick={next}>
                  Tiếp tục
                  <ChevronRight aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className="is-primary"
                  disabled={pending || !signedIn}
                  onClick={() => void submit()}
                >
                  {pending ? "Đang tạo đơn..." : "Hoàn tất tạo đơn"}
                  <ChevronRight aria-hidden="true" />
                </button>
              )}
            </footer>
          ) : (
            <footer>
              <button
                type="button"
                className="is-primary"
                onClick={() => {
                  setStep(0);
                  setCopied(false);
                  setPaymentSession(null);
                  requestKeyRef.current = "";
                }}
              >
                Tạo đơn khác
                <Sparkles aria-hidden="true" />
              </button>
            </footer>
          )}
        </section>

        <aside
          className="store-friendly-summary"
          aria-labelledby="store-summary-title"
        >
          <header>
            <span>ĐƠN CỦA BẠN</span>
            <h2 id="store-summary-title">Tóm tắt đơn</h2>
          </header>
          <div className="store-summary-player">
            <span aria-hidden="true">
              <Gamepad2 />
            </span>
            <div>
              <small>Nhân vật nhận gói</small>
              <strong>{username || "Chưa nhập"}</strong>
            </div>
          </div>
          <dl className="store-summary-list">
            <div>
              <dt>Cụm máy chủ</dt>
              <dd>{formatGroup(groups, group)}</dd>
            </div>
            <div>
              <dt>Gói nạp</dt>
              <dd>{selected?.name ?? "Chưa chọn"}</dd>
            </div>
            <div>
              <dt>Thanh toán</dt>
              <dd>{paymentLabel}</dd>
            </div>
          </dl>
          <div className="store-summary-payment" aria-label="Chọn phương thức thanh toán nhanh">
            <span>Phương thức thanh toán</span>
            <button
              type="button"
              className={payment === "momo" ? "is-selected" : ""}
              aria-pressed={payment === "momo"}
              onClick={() => setPayment("momo")}
            >
              <Smartphone aria-hidden="true" />
              <strong>MoMo</strong>
              {payment === "momo" ? <Check aria-hidden="true" /> : null}
            </button>
            <button
              type="button"
              className={payment === "bank" ? "is-selected" : ""}
              aria-pressed={payment === "bank"}
              onClick={() => setPayment("bank")}
            >
              <Building2 aria-hidden="true" />
              <strong>Ngân hàng</strong>
              {payment === "bank" ? <Check aria-hidden="true" /> : null}
            </button>
          </div>
          <div className="store-summary-total">
            <span>Tổng cộng</span>
            <strong>
              {selected ? money.format(selected.priceVnd) : money.format(0)}
            </strong>
          </div>
          <p>
            <ShieldCheck aria-hidden="true" />
            Quyền lợi được gửi sau khi thanh toán được xác nhận.
          </p>
        </aside>
      </div>

      <section id="orders" className="store-history" aria-labelledby="orders-title">
        <header>
          <div>
            <span>LỊCH SỬ NẠP THẺ</span>
            <h2 id="orders-title">Đơn gần đây</h2>
          </div>
          <b>{orders.length} đơn</b>
        </header>
        {signedIn ? (
          <div className="store-order-list">
            {orders.slice(0, 8).map((order) => (
              <article key={order.id}>
                <div>
                  <strong>{order.reference}</strong>
                  <span className={`is-${order.status}`}>
                    {statusLabel[order.status] ?? order.status}
                  </span>
                </div>
                <p>
                  {order.packageName}
                  <small>
                    {order.minecraftUsername} · {formatGroup(groups, order.groupKey)}
                  </small>
                </p>
                <b>{money.format(order.priceVnd)}</b>
              </article>
            ))}
            {orders.length === 0 ? (
              <p className="store-empty">Bạn chưa có đơn nạp nào.</p>
            ) : null}
          </div>
        ) : (
          <div className="store-order-login">
            <ReceiptText aria-hidden="true" />
            <strong>Lịch sử của riêng bạn</strong>
            <p>Đăng nhập để tạo và theo dõi các đơn nạp.</p>
            <Link href="/login?next=/store">Đăng nhập</Link>
          </div>
        )}
      </section>
    </div>
  );
}
