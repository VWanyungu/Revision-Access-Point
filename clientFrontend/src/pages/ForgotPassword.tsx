import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { supabase } from "@/database/supabase";
import {
  AuthPage, Heading, Field, AuthButton, SwitchLine, TextLink, IconBadge, Tip, Spacer, useCooldown,
} from "@/components/auth/AuthKit";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const cooldown = useCooldown(60);
  const navigate = useNavigate();
  const toSignIn = () => navigate("/login");

  const sendLink = async () => {
    setError("");
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_FRONTEND_URL}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      setError("We couldn’t send the link. Check the address and try again.");
      return false;
    }
    cooldown.restart();
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await sendLink()) setSent(true);
  };

  if (sent) {
    return (
      <AuthPage back={{ label: "Sign in", onClick: toSignIn }} topGap="md">
        <IconBadge><EnvelopeSimple size={28} /></IconBadge>
        <Heading title="Check your email">
          If there is an account for {email}, a reset link is on its way. It works once, for 1 hour.
        </Heading>
        <Tip title="Can’t find it?">
          Check Spam and Promotions. If you signed up with Google, use Continue with Google instead; there is no password to reset.
        </Tip>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Spacer />
        <AuthButton type="button" variant="outline" disabled={cooldown.left > 0 || isLoading} onClick={sendLink}>
          {cooldown.left > 0 ? `Resend link in ${cooldown.label}` : "Resend link"}
        </AuthButton>
        <TextLink onClick={() => setSent(false)}>Use a different email</TextLink>
      </AuthPage>
    );
  }

  return (
    <AuthPage back={{ label: "Sign in", onClick: toSignIn }}>
      <Heading title="Reset your password">
        Enter the email you signed up with. We will send a link to choose a new password.
      </Heading>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field
          id="email" label="Email" type="email" autoComplete="email" required
          placeholder="student@university.edu"
          value={email} onChange={setEmail} error={error}
        />
        <AuthButton type="submit" disabled={isLoading}>
          {isLoading ? "Please wait…" : "Send reset link"}
        </AuthButton>
      </form>
      <SwitchLine text="Remembered it?" action="Sign in" onClick={toSignIn} />
    </AuthPage>
  );
};

export default ForgotPassword;
