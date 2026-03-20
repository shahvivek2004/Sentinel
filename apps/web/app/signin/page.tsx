import AuthLayout from "../../components/auth/AuthLayout";
import SignInForm from "../../components/auth/SignInForm";

export const metadata = {
  title: "Sign in — Sentinel",
  description: "Sign in to your Sentinel account.",
};

export default function SignInPage() {
  return (
    <AuthLayout>
      <SignInForm />
    </AuthLayout>
  );
}
