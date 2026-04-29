import { motion } from "framer-motion";
import { BookOpen, Brain, Timer, FileText, ArrowRight, Check, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import MpesaPaymentDialog from "@/components/payment/MpesaPaymentDialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Input } from "@/components/ui/input";

interface LandingPageProps {
  onNavigateLogin: () => void;
  onNavigateSignUp: () => void;
}

const semesters = [
  { id: 2, name: "Semester Pass", range: "4 month access", price: "KSH 150", recommended: true },
];

const LandingPage = ({ onNavigateLogin, onNavigateSignUp }: LandingPageProps) => {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<typeof semesters[0] | null>(null);
  const [email, setEmail] = useState("");
  const [stepCounter, setStepCounter] = useState<1 | 2>(1);

  const handleNextStep = () => {
    if (email) {
      setStepCounter(2);
    }
  };

  const handleGetStarted = (sem: typeof semesters[0]) => {
    setSelectedSemester(sem);
    setPaymentOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 w-full">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-3">
            {/* <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div> */}
            {/* <span className="font-semibold text-lg tracking-tight">Revision Access Point</span> */}
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <ModeToggle />
            <div className="sm:flex items-center gap-2">
              <Button variant="ghost" onClick={onNavigateLogin} className="text-muted-foreground hover:text-foreground">Log In</Button>
              <Button onClick={onNavigateSignUp} className="shadow-sm hidden md:block ">Sign Up</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[calc(100vh-4rem)] flex flex-col justify-center item-center overflow-hidden pt-24 pb-32 md:pt-36 md:pb-48">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="relative max-w-7xl mx-auto px-6 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <Badge className="mb-8 bg-primary/10 text-primary border-primary/20 backdrop-blur-md text-xs md:text-sm px-4 py-1.5 font-medium">
              Revision Access Point
            </Badge>
            <h1 className="text-4xl md:text-7xl font-bold mb-8 tracking-tight leading-[1.1] text-balance">
              Your Unfair <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark dark:from-primary dark:to-primary-light">
                Competitive Advantage
              </span>
            </h1>
            <p className="md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 text-balance leading-relaxed">
              Master your coursework with precision. Elite access to structured notes, rigorous CATs, past exams, and curated video tutorials designed for top-tier performance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* <Button
                size="xl"
                onClick={() => document.getElementById('conversion-path')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-8 gap-2 shadow-sm text-base h-14"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button> */}
              <Button
                size="xl"
                onClick={onNavigateSignUp}
                className="w-full sm:w-auto px-4 md:px-8 gap-2 shadow-sm text-sm md:text-base h-10 md:h-14"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Showcase ("Bento Grid") */}
      <section className="py-12 md:py-24 relative bg-secondary/50">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold mb-4 tracking-tight">Engineered for Mastery</h2>
            <p className="text-sm text-muted-foreground md:text-lg max-w-xl mx-auto">
              Everything required to dominate your exams, meticulously organized.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ">
            {/* Notes Section - Minimalist document previews */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="md:col-span-2 glass-card rounded-3xl p-8 relative overflow-hidden group"
            >
              <div className="relative z-10 w-full md:w-1/2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold">Structured Notes</h3>
                </div>
                <p className="text-sm md:text-base text-muted-foreground mb-6">
                  No fluff, just the core concepts you need to succeed.
                </p>
                <Button variant="secondary" onClick={onNavigateSignUp} className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Explore Library
                </Button>
              </div>
              {/* Decorative document previews */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:block select-none pointer-events-none">
                <div className="absolute right-10 top-10 w-64 h-80 bg-background rounded-xl border border-border/50 shadow-lg transform rotate-6 scale-90 opacity-90 transition-transform group-hover:rotate-12 group-hover:scale-95 duration-500 ease-out p-6 flex flex-col gap-3">
                  <div className="w-1/2 h-4 bg-muted/50 rounded" />
                  <div className="w-full h-3 bg-muted/30 rounded mt-4" />
                  <div className="w-5/6 h-3 bg-muted/30 rounded" />
                  <div className="w-4/5 h-3 bg-muted/30 rounded" />
                </div>
                <div className="absolute right-24 top-20 w-64 h-80 bg-background rounded-xl border border-border/50 shadow-xl transform -rotate-3 transition-transform group-hover:-rotate-6 group-hover:scale-105 duration-500 ease-out p-6 flex flex-col gap-3">
                  <div className="w-2/3 h-5 bg-primary/20 rounded" />
                  <div className="w-full h-3 bg-muted/40 rounded mt-4" />
                  <div className="w-11/12 h-3 bg-muted/40 rounded" />
                  <div className="w-full h-3 bg-muted/40 rounded" />
                  <div className="w-4/5 h-3 bg-muted/40 rounded" />
                </div>
              </div>
            </motion.div>

            {/* CATs & Exams Section - Pulse effect */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-card rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-accent-dark/10 relative">
                    <Timer className="h-6 w-6 text-accent-dark dark:text-accent-light" />
                    <motion.div
                      className="absolute inset-0 rounded-xl border border-accent-dark/30 dark:border-accent-light/30"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold">CATs & Exams</h3>
                </div>
                <p className="text-sm md:text-base text-muted-foreground">
                  Get access to past papers and assessment tests.
                </p>
              </div>
              <div className="mt-8 flex justify-end">
                <Brain className="h-24 w-24 text-primary/5 translate-x-4 translate-y-4" />
              </div>
            </motion.div>

            {/* Tutorials Section - Blurred video player UI */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="md:col-span-3 h-[400px] glass-card rounded-3xl p-8 relative overflow-hidden flex items-center justify-center group"
            >
              {/* Background abstract imagery */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-3xl" />

              <div className="relative z-20 text-center max-w-lg">
                <Badge className="mb-4 bg-background/50 backdrop-blur text-foreground border-border/50">Exclusive Tutorials</Badge>
                <h3 className="text-xl md:text-3xl font-bold mb-4">Visual Learning, Distilled.</h3>
                <p className="text-sm md:text-base text-muted-foreground mb-8 text-balance">
                  Complex topics broken down by top students and lecturers in high-definition video breakdowns.
                </p>
                <Button size="lg" className="rounded-full w-16 h-16 p-0 group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                  <PlayCircle className="h-8 w-8 ml-1" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Conversion Path - 2-Step Flow */}
      {/* <section id="conversion-path" className="py-32 bg-background relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="max-w-4xl mx-auto px-6 md:px-8 relative z-10">
          
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Secure Your Access</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join the elite tier of students today. Choose your path.
            </p>
            
            
            <div className="flex items-center justify-center gap-4 mb-12">
              <div className={`flex items-center gap-2 ${stepCounter === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${stepCounter === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
                <span className="font-medium hidden sm:inline">Account Creation</span>
              </div>
              <div className="w-16 h-px bg-border/50" />
              <div className={`flex items-center gap-2 ${stepCounter === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${stepCounter === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
                <span className="font-medium hidden sm:inline">Choose Pass</span>
              </div>
            </div>
          </div>

          <div className="relative min-h-[400px]">
            
            <motion.div
              initial={false}
              animate={{ opacity: stepCounter === 1 ? 1 : 0, scale: stepCounter === 1 ? 1 : 0.95, pointerEvents: stepCounter === 1 ? "auto" : "none" }}
              transition={{ duration: 0.4 }}
              className={`absolute inset-0 glass-card rounded-3xl p-8 md:p-12 shadow-lg flex flex-col items-center justify-center text-center max-w-lg mx-auto w-full`}
            >
              <h3 className="text-2xl font-bold mb-2">Create Your Profile</h3>
              <p className="text-muted-foreground mb-8">Enter your student email to begin.</p>
              
              <form className="w-full max-w-sm" onSubmit={(e) => { e.preventDefault(); handleNextStep(); }}>
                <div className="space-y-4 mb-6">
                  <Input 
                    type="email" 
                    placeholder="student@university.edu" 
                    className="h-12 bg-background/50 text-center"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button size="xl" type="submit" className="w-full h-12 text-base shadow-md group">
                  Continue Form
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            </motion.div>

            
            <motion.div
              initial={false}
              animate={{ opacity: stepCounter === 2 ? 1 : 0, scale: stepCounter === 2 ? 1 : 0.95, pointerEvents: stepCounter === 2 ? "auto" : "none" }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 w-full"
            >
              <div className="grid sm:grid-cols-3 gap-6">
                {semesters.map((sem, i) => (
                  <motion.div
                    key={sem.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: stepCounter === 2 ? 1 : 0, y: stepCounter === 2 ? 0 : 20 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <Card
                      className={`relative h-full flex flex-col text-center transition-all duration-300 hover:shadow-xl bg-card/60 backdrop-blur-md ${
                        sem.recommended
                          ? "border-primary/50 shadow-lg scale-105 shadow-primary/10"
                          : "border-border/40 hover:border-primary/30"
                      }`}
                    >
                      {sem.recommended && (
                        <div className="absolute -top-3 inset-x-0 flex justify-center">
                          <Badge className="bg-primary hover:bg-primary shadow-sm text-primary-foreground font-medium px-3 tracking-wide">
                            Platinum Level
                          </Badge>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />

                      <CardHeader className="pb-4 pt-8">
                        <CardTitle className="text-xl font-bold">{sem.name}</CardTitle>
                        <CardDescription className="text-muted-foreground font-medium">{sem.range}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 flex-grow flex flex-col">
                        <div className="py-2">
                          <span className="text-4xl font-extrabold tracking-tight">{sem.price}</span>
                        </div>
                        <ul className="text-sm space-y-3 text-left flex-grow font-medium text-foreground/80">
                          <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary shrink-0" /> Full Library Access</li>
                          <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary shrink-0" /> Exclusive Video Tutorials</li>
                          <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary shrink-0" /> Priority Support</li>
                        </ul>
                        <Button
                          className="w-full mt-4 h-12 shadow-sm font-semibold"
                          variant={sem.recommended ? "default" : "secondary"}
                          onClick={() => handleGetStarted(sem)}
                        >
                          Unlock Pass
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section> */}

      {/* Footer */}
      <footer className="relative border-t border-border/40 bg-background/50 backdrop-blur py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold tracking-tight">Revision Access Point</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground font-medium">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              © {new Date().getFullYear()} Revision Access Point. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {selectedSemester && (
        <MpesaPaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          semesterName={selectedSemester.name}
          price={selectedSemester.price}
        />
      )}
    </div>
  );
};

export default LandingPage;
