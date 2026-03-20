import AuthLayout from "../../components/auth/AuthLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export const metadata = {
  title: "Create account — Sentinel",
  description: "Start monitoring for free. No credit card required.",
};

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUpForm />
    </AuthLayout>
  );
}
