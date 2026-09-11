import { cookies } from "next/headers";
import { Storefront } from "@/components/store/storefront";
import { getUserBySession } from "@/lib/auth/service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { listStoreCatalog, listUserStoreOrders } from "@/lib/store/service";

export const dynamic = "force-dynamic";
export default async function StorePage({
  searchParams,
}: {
  searchParams?: {
    resume?: string;
    username?: string;
    group?: string;
    package?: string;
    payment?: string;
  };
}) {
  const user = await getUserBySession(
    cookies().get(SESSION_COOKIE_NAME)?.value,
  ).catch(() => null);
  const [catalog, orders] = await Promise.all([
    listStoreCatalog().catch(() => null),
    user ? listUserStoreOrders(user.id).catch(() => []) : Promise.resolve([]),
  ]);
  return (
    <main className="store-page">
      <Storefront
        groups={catalog?.groups ?? []}
        packages={catalog?.packages ?? []}
        initialOrders={orders}
        signedIn={Boolean(user)}
        catalogAvailable={catalog !== null}
        resume={{
          resume: searchParams?.resume,
          username: searchParams?.username,
          group: searchParams?.group,
          packageId: searchParams?.package,
          payment: searchParams?.payment,
        }}
      />
    </main>
  );
}
