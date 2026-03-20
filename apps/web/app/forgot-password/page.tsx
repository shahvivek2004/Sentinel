import ForgotPasswordForm from "../../components/auth/ForgotPasswordForm";
import AuthLayout from "../../components/auth/AuthLayout";

export const metadata = {
  title: "Reset password — Sentinel",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
