import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Loader2, CheckCircle2, XCircle, ArrowLeft, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/database/supabase";

type PaymentStep = "phone" | "processing" | "success" | "error";

interface MpesaPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semesterName: string;
  price: string;
  departmentId: string;
  year: string;
  semester: string;
  onPaymentSuccess?: () => void;
}

const MpesaPaymentDialog = ({
  open,
  onOpenChange,
  semesterName,
  price,
  departmentId,
  year,
  semester,
  onPaymentSuccess,
}: MpesaPaymentDialogProps) => {
  const [step, setStep] = useState<PaymentStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false)

  const resetDialog = () => {
    setStep("phone");
    setPhoneNumber("");
    setPhoneError("");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetDialog();
    }
    onOpenChange(isOpen);
  };

  const validatePhone = (value: string): boolean => {
    // Kenyan phone: 07XXXXXXXX or 01XXXXXXXX or 254XXXXXXXXX
    const cleaned = value.replace(/\s+/g, "");
    const kenyanRegex = /^(07\d{8}|01\d{8}|254[71]\d{8})$/;
    return kenyanRegex.test(cleaned);
  };

  const handleSubmit = async () => {
    setLoading(true)
    const cleaned = phoneNumber.replace(/\s+/g, "");
    if (!cleaned) {
      setPhoneError("Phone number is required");
      return;
    }
    if (!validatePhone(cleaned)) {
      setPhoneError("Enter a valid Safaricom number (e.g. 0712345678)");
      return;
    }
    setPhoneError("");
    setStep("processing");

    try {
      const amount = parseFloat(price.replace(/[^\d.]/g, ''));
      const { data, error } = await supabase.functions.invoke("mpesa-initiate-payment", {
        body: {
          phone_number: cleaned,
          amount: amount,
          department_id: Number(departmentId),
          year_of_study: Number(year),
          semester_of_study: Number(semester)
        }
      });

      if (error) throw error;

      // Simulate polling or callback success for display purposes
      setTimeout(() => {
        setStep("success");
        onPaymentSuccess?.();
        setLoading(false)
      }, 5000);

    } catch (e) {
      console.error("Payment failed", e);
      setStep("error");
      setLoading(false)
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-lg md:max-w-2xl max-h-[90vh] overflow-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: Phone number entry */}
          {step === "phone" && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="mb-6">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  M-Pesa Payment
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    {/* <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /> */}
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0712345678"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (phoneError) setPhoneError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      className=""
                      maxLength={13}
                    />
                  </div>
                  {phoneError && (
                    <p className="text-sm text-destructive">{phoneError}</p>
                  )}
                </div>

                <div className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
                  An STK prompt will be sent to your phone. Enter your M-Pesa PIN to complete the payment.
                </div>

                <Button className="w-full" size="lg" onClick={handleSubmit}>
                  {loading ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (<> Pay {price}</>)}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Processing */}
          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="py-10 text-center"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Check your phone</h3>
                  <p className="text-muted-foreground text-sm">
                    An M-Pesa prompt has been sent to{" "}
                    <span className="font-medium text-foreground">{phoneNumber}</span>.
                    <br />
                    Enter your PIN to complete payment.
                  </p>
                </div>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-2 w-2 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, type: "spring" }}
              className="py-10 text-center"
            >
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                >
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                </motion.div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Payment Successful!</h3>
                  <p className="text-muted-foreground text-sm">
                    Your {semesterName} subscription is now active.
                    <br />
                    {price} has been deducted from your M-Pesa.
                  </p>
                </div>
                <Button className="mt-2" onClick={() => handleClose(false)}>
                  Continue to App
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Error */}
          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="py-10 text-center"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Payment Failed</h3>
                  <p className="text-muted-foreground text-sm">
                    The transaction could not be completed. This could be due to
                    insufficient funds, a cancelled request, or a timeout.
                  </p>
                </div>
                <div className="flex gap-3 mt-2">
                  <Button variant="outline" onClick={() => setStep("phone")}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Try Again
                  </Button>
                  <Button variant="ghost" onClick={() => handleClose(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default MpesaPaymentDialog;
