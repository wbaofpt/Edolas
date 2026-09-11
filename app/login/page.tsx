import { LoginForm } from "@/components/auth/login-form";
import { normalizeLoginRedirect } from "@/lib/auth/login-redirect";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { registered?: string; next?: string };
}) {
  return (
    <LoginForm
      registered={searchParams?.registered === "1"}
      redirectTo={normalizeLoginRedirect(searchParams?.next)}
    />
  );
}
