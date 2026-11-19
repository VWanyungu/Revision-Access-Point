import { EarningsPanel } from '@/components/shared/EarningsPanel';
import { useProfile } from '@/hooks/useProfile';

const Dashboard = () => {
  const { data: me } = useProfile();
  if (!me) return null;

  const scope =
    me.role === 'super_admin' ? 'Platform-wide'
    : me.role === 'institution_admin' ? 'Your institution'
    : me.role === 'course_admin' ? `${me.courseIds.length} ${me.courseIds.length === 1 ? 'course' : 'courses'}`
    : 'Your school';

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold">Welcome back, {me.name.split(' ')[0]}</h1>
        <p className="text-sm text-muted-foreground"><span className="capitalize">{me.role.replace('_', ' ')}</span> · {scope}</p>
      </div>
      <EarningsPanel role={me.role} />
    </div>
  );
};

export default Dashboard;
