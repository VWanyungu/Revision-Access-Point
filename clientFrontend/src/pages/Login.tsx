import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { supabase } from "@/database/supabase";
import {
  AuthPage, Heading, Field, AuthButton, GoogleButton, OrDivider, SwitchLine,
  TextLink, IconBadge, Tip, Spacer, useCooldown,
} from "@/components/auth/AuthKit";

type Policy = "privacy-policy" | "terms-of-use" | "";
type View = "form" | "confirm";

const MIN_PASSWORD = 8;

const Login = () => {
  const [view, setView] = useState<View>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPolicy, setShowPolicy] = useState<Policy>("");
  const cooldown = useCooldown(60);
  const navigate = useNavigate();
  const isSignUp = useLocation().pathname === "/signup";

  const goTo = (v: View | "/login" | "/signup") => {
    setErrors({});
    if (v === "confirm" || v === "form") return setView(v);
    setView("form");
    navigate(v);
  };

  const sendConfirmation = async () => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: import.meta.env.VITE_FRONTEND_URL },
    });
    return error;
  };

  const showConfirm = () => {
    cooldown.restart();
    goTo("confirm");
  };

  const handleResend = async () => {
    const error = await sendConfirmation();
    if (error) {
      setErrors({ email: "We couldn’t send the email. Try again in a moment." });
      return;
    }
    cooldown.restart();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) return; // AuthContext sees the session and GuestRoute redirects

      if (error.code === "email_not_confirmed") {
        await sendConfirmation();
        return showConfirm();
      }
      setErrors({
        password:
          error.code === "invalid_credentials"
            ? "That email and password don’t match. Check for typos or reset your password."
            : "We couldn’t sign you in. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setErrors({ password: `Use at least ${MIN_PASSWORD} characters. You have ${password.length}.` });
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: import.meta.env.VITE_FRONTEND_URL,
        },
      });
      if (error) {
        setErrors(
          error.code === "weak_password"
            ? { password: "That password is too easy to guess. Try a longer or less common one." }
            : { email: "We couldn’t create your account. Please try again." },
        );
        return;
      }
      // Supabase hides existing accounts by returning a user with no identities.
      if (data.user && data.user.identities?.length === 0) {
        setErrors({ email: "There is already an account with this email. Sign in instead." });
        return;
      }
      showConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: import.meta.env.VITE_FRONTEND_URL },
    });
    if (error) {
      setErrors({ email: "Google sign-in didn’t start. Please try again." });
      setIsLoading(false);
    }
  };

  // Opens in the page flow under the sign-up line, not over it.
  const policyPanel = showPolicy !== "" && (
    <section className="rounded-[10px] border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-medium">{showPolicy === "privacy-policy" ? "Privacy policy" : "Terms of use"}</h2>
        <button type="button" className="text-sm font-medium text-ink-muted hover:text-ink" onClick={() => setShowPolicy("")}>Close</button>
      </div>
      <div className="max-h-[50vh] overflow-auto rounded-[8px] bg-field p-3 text-sm text-ink-muted">
        {showPolicy === "privacy-policy" ? <PrivacyPolicy /> : <TermsOfUse />}
      </div>
    </section>
  );

  if (view === "confirm") {
    return (
      <AuthPage topGap="lg">
        <IconBadge><EnvelopeSimple size={28} /></IconBadge>
        <Heading title="Confirm your email">
          We sent a link to {email}. Open it on this device to finish creating your account.
        </Heading>
        <Tip title="Can’t find it?">Check Spam and Promotions. The email comes from no-reply@rap.co.ke.</Tip>
        {errors.email && <p role="alert" className="text-sm text-danger">{errors.email}</p>}
        <Spacer />
        <AuthButton type="button" variant="outline" disabled={cooldown.left > 0} onClick={handleResend}>
          {cooldown.left > 0 ? `Resend email in ${cooldown.label}` : "Resend email"}
        </AuthButton>
        <SwitchLine text="Wrong email?" action="Change it" onClick={() => goTo("/signup")} />
      </AuthPage>
    );
  }

  return (
    <AuthPage>
      {isSignUp ? (
        <Heading title="Create your account">Takes a minute. You choose your semester next.</Heading>
      ) : (
        <Heading title="Sign in" />
      )}

      <GoogleButton onClick={handleGoogleAuth} disabled={isLoading} />
      <OrDivider />

      <form onSubmit={isSignUp ? handleSignUpSubmit : handleLoginSubmit} className="flex flex-col gap-5">
        {isSignUp && (
          <Field
            id="name" label="Full name" autoComplete="name" required
            value={name} onChange={setName}
          />
        )}
        <Field
          id="email" label="Email" type="email" autoComplete="email" required
          placeholder="student@university.edu"
          value={email} onChange={setEmail} error={errors.email}
        />
        <Field
          id="password" label="Password" type="password" required
          autoComplete={isSignUp ? "new-password" : "current-password"}
          value={password} onChange={setPassword} error={errors.password}
          helper={isSignUp ? `At least ${MIN_PASSWORD} characters.` : undefined}
        />
        {!isSignUp && <TextLink onClick={() => navigate("/forgot-password")}>Forgot password?</TextLink>}
        <AuthButton type="submit" disabled={isLoading}>
          {isLoading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </AuthButton>
      </form>

      {isSignUp && (
        <p className="text-sm text-ink-muted">
          By creating an account you agree to the{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => setShowPolicy("terms-of-use")}>
            Terms of use
          </button>{" "}
          and the{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => setShowPolicy("privacy-policy")}>
            Privacy policy
          </button>.
        </p>
      )}

      {policyPanel}

      {isSignUp ? (
        <SwitchLine text="Already have an account?" action="Sign in" onClick={() => goTo("/login")} />
      ) : (
        <SwitchLine text="New to RAP?" action="Create an account" onClick={() => goTo("/signup")} />
      )}
    </AuthPage>
  );
};

const PrivacyPolicy = () => {
  return (
    <p>
      At Revision Access Point ("we," "our," or "us"), we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our web application.

      <br/><br/>1. Information We Collect
      Account Data: When you sign up via standard email/password or Google Authentication, we collect your name, email address, and profile picture (if using Google Auth).

      Payment Data: We process payments via the Safaricom Daraja API (M-Pesa). We collect transaction data required to verify payment (such as your phone number, transaction amount, and M-Pesa transaction code). We do not store your raw mobile money PINs or sensitive credentials.

      Usage Data: We may collect basic information about how you interact with our platform, such as the resources you view and access timestamps.

      <br/><br/>2. How We Use Your Information
      We use the collected data to:

      Authenticate your identity and provide access to your account.

      Process and verify M-Pesa payments via the Daraja API to unlock premium resources.

      Provide data to the ChatPDF API strictly to enable interactive features with the notes you are viewing (your account credentials are never shared with this API).

      Ensure compliance with our Terms of Use and prevent unauthorized sharing or scraping of content.

      <br/><br/>3. Data Storage & Security
      Cloud Storage: The resources and notes are hosted securely on cloud object storage.

      Third-Party Processing: We utilize trusted third-party authentication and API providers to handle login mechanics and document interactions securely.

      Data Retention: We retain your account and subscription history for as long as your account is active or as needed to provide you services and comply with statutory financial record-keeping laws.

      <br/><br/>4. Your Rights
      Depending on your location (including under the Kenya Data Protection Act), you have the right to access the personal data we hold about you, request corrections, or ask for the deletion of your account data. To exercise these rights, please contact us at vwanyungu254@gmail.com.
    </p>
  )
}

const TermsOfUse = () => {
  return (
    <p>
      Welcome to Revision Access Point. By accessing or using our web application, you agree to be bound by these Terms of Use. If you do not agree, please do not use the service.

      <br/><br/>1. Description of Service
      Revision Access Point provides a platform for users to view curated, watermarked educational or professional notes and resources.

      View-Only Access: Users are granted a limited, non-exclusive, non-transferable right to view content. Users cannot upload their own notes to the platform.

      Admin-Generated Content: All content is uploaded and managed exclusively by the platform administrators.

      <br/><br/>2. Subscriptions, Paywalls, and Payments
      Paywall Requirements: Access to specific resources requires payment of a fee before access is granted.

      Access Duration: Payments grant access to the specified resources for a strict, set period of time (e.g., daily, monthly, or semester-based access) as indicated at the time of purchase.

      Payment Processor: All local payments are processed securely through Safaricom M-Pesa (Daraja API). You agree to provide accurate phone and transaction details.

      Refund Policy: Due to the digital nature of the content, all purchases are final and non-refundable once access to the resources has been granted.

      <br/><br/>3. Intellectual Property & Acceptable Use

      Prohibited Activities: You explicitly agree NOT to:

      Attempt to download, scrape, screenshot, print, or extract text from the resources unless an explicit download feature is provided by the admin.

      Share your account credentials with third parties to bypass the paywall.

      Remove, alter, or obscure any watermarks visible on the content.

      Use automated scripts, bots, or browser extensions to scrape or systematically view the content.

      Termination: We reserve the right to suspend or terminate your account immediately, without a refund, if we detect suspicious activity, account sharing, or attempts to circumvent our content security measures.

      <br/><br/>4. Limitation of Liability
      The resources provided on this platform are for informational and educational purposes. While we strive for accuracy, Revision Access Point and its admins are not liable for any errors, omissions, or outcomes resulting from the use of these notes. The service is provided on an "as-is" and "as-available" basis.

      <br/><br/>5. Governing Law
      These Terms are governed by and construed in accordance with the laws of Kenya, without regard to its conflict of law principles.

      <br/><br/>6. Changes to Terms
      We may update these terms from time to time. Continued use of the platform after updates indicates your acceptance of the revised Terms.
    </p>
  )
}

export default Login;
