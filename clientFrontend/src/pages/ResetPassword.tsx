import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { supabase } from "@/database/supabase";
import { AuthPage, Heading, Field, AuthButton, IconBadge, Spacer } from "@/components/auth/AuthKit";

type Stage = "checking" | "form" | "expired" | "done";
const MIN_PASSWORD = 8;

const ResetPassword = () => {
  const [stage, setStage] = useState<Stage>("checking");
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check the link as soon as the page loads, so an expired link never reaches the form.
  useEffect(() => {
    const check = async () => {
      const token_hash = searchParams.get("token_hash");
      if (token_hash && searchParams.get("type") === "recovery") {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type: "recovery" });
        if (error) return setStage("expired");
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) return setStage("expired");
      setAccountEmail(data.session.user.email ?? "");
      setStage("form");
    };
    check();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      return setErrors({ password: `Use at least ${MIN_PASSWORD} characters. You have ${password.length}.` });
    }
    if (password !== confirm) return setErrors({ confirm: "The passwords don’t match." });

    setErrors({});
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      return setErrors({
        password:
          error.code === "same_password"
            ? "Choose a password you haven’t used before."
            : "We couldn’t save your password. Please try again.",
      });
    }
    setStage("done");
  };

  if (stage === "checking") return <AuthPage><span className="sr-only" role="status">Checking your link</span></AuthPage>;

  if (stage === "expired") {
    return (
      <AuthPage back={{ label: "Sign in", onClick: () => navigate("/login") }} topGap="md">
        <IconBadge><WarningCircle size={28} /></IconBadge>
        <Heading title="This reset link has expired">
          Reset links work once and for 1 hour. If you asked more than once, only the newest email works.
        </Heading>
        <Spacer />
        <AuthButton type="button" onClick={() => navigate("/forgot-password")}>Send a new link</AuthButton>
        <AuthButton type="button" variant="ghost" onClick={() => navigate("/login")}>Back to sign in</AuthButton>
      </AuthPage>
    );
  }

  if (stage === "done") {
    return (
      <AuthPage topGap="lg">
        <CheckCircle size={40} />
        <Heading title="Password updated">
          You are signed in on this device. Use the new password next time you sign in elsewhere.
        </Heading>
        <Spacer />
        <AuthButton type="button" onClick={() => navigate("/app")}>Continue to your units</AuthButton>
      </AuthPage>
    );
  }

  return (
    <AuthPage>
      <Heading title="Choose a new password">{accountEmail && `For ${accountEmail}`}</Heading>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field
          id="password" label="New password" type="password" autoComplete="new-password" required
          value={password} onChange={setPassword} error={errors.password}
          helper={`At least ${MIN_PASSWORD} characters.`}
        />
        <Field
          id="confirm" label="Confirm new password" type="password" autoComplete="new-password" required
          value={confirm} onChange={setConfirm} error={errors.confirm}
        />
        <AuthButton type="submit" disabled={isLoading}>
          {isLoading ? "Please wait…" : "Save new password"}
        </AuthButton>
      </form>
    </AuthPage>
  );
};

export default ResetPassword;
