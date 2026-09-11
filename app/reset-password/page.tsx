import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  return <main className="reset-password-page"><div className="control-access-grid" aria-hidden="true" /><ResetPasswordForm token={searchParams.token ?? ""} /></main>;
}
