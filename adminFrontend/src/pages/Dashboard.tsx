import { Building2, BookOpen, Layers, FileText, Upload, Edit, Trash2, PlusCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { schools, departments, units, resources, recentActivity } from '@/data/mockData';
import { cn } from '@/lib/utils';

const activityIcons = {
  upload: Upload,
  edit: Edit,
  delete: Trash2,
  create: PlusCircle,
};

const activityColors = {
  upload: 'bg-info/10 text-info',
  edit: 'bg-warning/10 text-warning',
  delete: 'bg-destructive/10 text-destructive',
  create: 'bg-success/10 text-success',
};

const Dashboard = () => {
  const { user } = useAuth();

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="animate-fade-in">
      {/* <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        description="Here's what's happening in your platform today"
      /> */}

      {/* Stats Grid */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 mb-8">
        {user?.role === 'super_admin' && (
          <StatCard
            title="Total Schools"
            value={schools.length}
            icon={<Building2 className="h-5 w-5" />}
            trend={{ value: 12, isPositive: true }}
          />
        )}
        <StatCard
          title="Total Departments"
          value={departments.length}
          icon={<BookOpen className="h-5 w-5" />}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Total Units"
          value={units.length}
          icon={<Layers className="h-5 w-5" />}
          trend={{ value: 15, isPositive: true }}
        />
      </div> */}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        {/* <div className="lg:col-span-2 bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = activityIcons[activity.action];
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    activityColors[activity.action]
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.action === 'upload' && 'Uploaded '}
                      {activity.action === 'edit' && 'Edited '}
                      {activity.action === 'delete' && 'Deleted '}
                      {activity.action === 'create' && 'Created '}
                      <span className="text-foreground">{activity.resource}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {activity.user}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        </div> */}

        {/* Quick Stats Sidebar */}
        <div className="space-y-6">
          {/* Role Info */}
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Your Access</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Role</span>
                <span className="text-sm font-medium capitalize">
                  {user?.role.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Scope</span>
                <span className="text-sm font-medium">
                  {user?.role === 'super_admin' ? 'Platform-wide' : 
                   user?.role === 'school_admin' ? 'School of Engineering' : 
                   'Computer Science'}
                </span>
              </div>
            </div>
          </div>

          {/* Top Resources */}
          {/* <div className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Top Units by Resources</h2>
            <div className="space-y-3">
              {[].map((unit) => (
                <div key={unit.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{unit.name}</p>
                    <p className="text-xs text-muted-foreground">{unit.code}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {unit.resourcesCount}
                  </span>
                </div>
              ))}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
