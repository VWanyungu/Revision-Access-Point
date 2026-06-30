import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Calendar as CalendarIcon, CheckCircle2, Building2, BookOpen, Clock, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/database/supabase";
import PricingGate from "@/pages/PricingGate";
import { useQuery } from '@tanstack/react-query';

interface SubscriptionsPageProps {
  onNavigate: (page: string) => void;
}

const SubscriptionsPage = ({ onNavigate }: SubscriptionsPageProps) => {
  const [isInitiating, setIsInitiating] = useState(false);

  const { data: subs = [], isLoading, refetch } = useQuery({
    queryKey: ['user-subscriptions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const sbTokenStr = localStorage.getItem("sb-ptktlornnngqvzbbisaq-auth-token");
      const sbToken = sbTokenStr ? JSON.parse(sbTokenStr) : null;
      const targetUserId = sbToken?.user?.id || user?.id;

      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, departments(school_id, name)")
        .eq("user_uuid", targetUserId)
        .order("end_date", { ascending: false });

      if (error) {
        console.error(error);
        return [];
      }

      const { data: schools } = await supabase.from("schools").select("id, name");

      return data.map((sub: any) => {
        const school = schools?.find(s => s.id === sub.departments?.school_id);
        return {
          ...sub,
          department_name: sub.departments?.name,
          school_name: school?.name
        };
      });
    }
  });

  if (isInitiating) {
    return (
      <PricingGate
        onLogout={() => { }}
        onCancel={() => setIsInitiating(false)}
        onSubscribed={() => {
          setIsInitiating(false);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="w-full h-full  max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Subscriptions</h1>
        </div>
        <Button onClick={() => setIsInitiating(true)} className="gap-2">
          New Subscription
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-12 h-full w-full">
          <Loader className="h-5 w-5 text-primary animate-spin" />
        </div>
      ) : subs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Active Subscriptions</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            You don't have any subscription history yet. Get an active plan to access unit resources.
          </p>
          <Button onClick={() => setIsInitiating(true)}>View Plans</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {subs.map((sub: any, index: number) => {
            const isActive = new Date(sub.end_date) >= new Date();
            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`overflow-hidden transition-all ${isActive ? 'border-primary/50 shadow-sm' : 'opacity-75'}`}>
                  <CardHeader className={`border-b border-border/50 pb-4 ${isActive ? 'bg-primary/5' : 'bg-muted/30'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                        <CardTitle className="text-lg flex items-center gap-2">
                          Semester Pass
                          <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-600 hover:bg-red-500/20"}>
                            {isActive ? "Active" : "Expired"}
                          </Badge>
                        </CardTitle>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1.5 ">
                        <CalendarIcon className="h-4 w-4" />
                        {isActive ? "Valid until" : "Expired on"} {new Date(sub.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          {/* <p className="text-sm font-medium text-muted-foreground mb-1">Institution</p> */}
                          <p className="font-medium">{sub.school_name || "Unknown School"}</p>
                          <p className="text-sm text-muted-foreground">{sub.department_name || "Unknown Department"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <BookOpen className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          {/* <p className="text-sm font-medium text-muted-foreground mb-1">Period</p> */}
                          <p className="font-medium">Year {sub.year_of_study} • Semester {sub.semester_of_study}</p>
                          <p className="text-sm text-muted-foreground">Access to all resources</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
