import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, BookOpen, ArrowRight, GraduationCap, Brain, Timer, PersonStanding, User, User2, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/database/supabase";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LoginProps {
  onLogin: () => void;
  defaultSignUp?: boolean;
}

type Policy = 'privacy-policy' | 'terms-of-use' | ''

const features = [
  { icon: GraduationCap, title: "Structured Learning", description: "Access notes, CATs, and exams organized by unit" },
  { icon: Brain, title: "AI-Powered Quizzes", description: "Generate custom quizzes from your study materials" },
  { icon: Timer, title: "Focus Timer", description: "Stay productive with Pomodoro technique" },
];

const Login = ({ onLogin, defaultSignUp = false }: LoginProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSignUp, setShowSignUp] = useState(defaultSignUp);
  const [showPolicy, setShowPolicy] = useState<Policy>('')

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      toast({
        title: "Error",
        description: "An error occurred during login. Please try again.",
      });
      setIsLoading(false);
      return null
    }

    setIsLoading(false);
    onLogin();
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: import.meta.env.VITE_FRONTEND_URL,
      }
    })

    if (error) {
      toast({
        title: "Error",
        description: "An error occurred during sign up. Please try again.",
      });
      return null
    }

    toast({
      title: "Sign Up Successful",
      description: "Please check your email to confirm your account before logging in.",
    });

    setIsLoading(false);
    setShowSignUp(false);
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: import.meta.env.VITE_FRONTEND_URL,
      }
    })

    if (error) {
      toast({
        title: "Error",
        description: "An error occurred during Google authentication. Please try again.",
      });
      setIsLoading(false);
      return null
    }

    toast({
      title: "Redirecting to Google",
      description: "You will be redirected to Google to complete the authentication process.",
    });

    setIsLoading(false);
    setShowSignUp(false);
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      {/* <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-primary-foreground/5" />
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/10 backdrop-blur">
                <BookOpen className="h-7 w-7" />
              </div>
              <span className="text-2xl font-bold">StudyHub</span>
            </div>

            <h1 className="text-4xl font-bold mb-4 leading-tight">
              Your Academic<br />Success Partner
            </h1>
            <p className="text-lg text-primary-foreground/80 mb-12 max-w-md">
              A focused study platform designed for serious students. Access resources, generate quizzes, and track your progress.
            </p>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 backdrop-blur">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-primary-foreground/70">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div> */}

      {/* Right side - Login form */}
      {!showSignUp && (<div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            {/* <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div> */}
            <span className="text-xl font-bold">Revision Access Point</span>
          </div>

          <Card className="shadow-elevated border-border/50 pt-6 md:pt-0">
            <CardHeader className="space-y-1 text-center pb-6 hidden md:block">
              <CardTitle className="text-2xl font-bold ">Revision Access Point</CardTitle>
              <CardDescription>
                Sign in to continue your study session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@university.edu"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-card px-3 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button type="button" variant="outline" className="w-full" size="lg" onClick={handleGoogleAuth}>
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <a href="#" className="text-primary font-medium hover:underline" onClick={() => { setShowSignUp(true) }}>
                  Sign up
                </a>
              </p>

              <div className="flex items-center justify-center mt-2">
                {/* <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded border-input" />
                    Remember me
                  </label> */}
                <a href="/forgot-password" className="text-sm text-primary hover:underline text-center">
                  Forgot password?
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>)}

      {showSignUp && (<div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            {/* <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div> */}
            <span className="text-xl font-bold">Revision Access Point</span>
          </div>

          <Card className="shadow-elevated border-border/50 pt-6 md:pt-0">
            <CardHeader className="space-y-1 text-center pb-6 hidden md:block">
              <CardTitle className="text-2xl font-bold ">Revision Access Point</CardTitle>
              <CardDescription>
                Sign Up
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@university.edu"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Sign up
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-card px-3 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button type="button" variant="outline" className="w-full" size="lg" onClick={handleGoogleAuth}>
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign up with Google
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <a href="#" className="text-primary font-medium hover:underline" onClick={() => { setShowSignUp(false) }}>
                  Sign in
                </a>
              </p>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                By signing up, you agree to our{" "}
                <a href="#" className="text-primary font-medium hover:underline" onClick={() => { setShowPolicy('privacy-policy') }}>
                  Privacy policy
                </a>
                {" "} and {""}
                <a href="#" className="text-primary font-medium hover:underline" onClick={() => { setShowPolicy('terms-of-use') }}>
                  Terms of use
                </a>
              </p>

            </CardContent>
          </Card>
        </motion.div>
      </div>)}

      
      <Dialog open={showPolicy != '' ? true : false} onOpenChange={() => setShowPolicy('')}>
        <DialogContent className="w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-auto">
          <AnimatePresence mode="wait">
            
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="mb-6">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  {showPolicy == 'privacy-policy' ? 'Privacy Policy' : 'Terms of use'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-secondary/50 p-3 text-sm text-muted-foreground">
                  {showPolicy == 'privacy-policy' ? <PrivacyPolicy/> : <TermsOfUse/>}
                </div>
              </div>
            </motion.div>

          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
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
