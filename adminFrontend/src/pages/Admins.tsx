import { useState } from 'react';
import { Plus, Pencil, Trash2, Shield, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { FormModal } from '@/components/shared/FormModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InstitutionSelect } from '@/components/shared/InstitutionSelect';
import { InstitutionFilter } from '@/components/shared/InstitutionFilter';
import { admins as initialAdmins, schools, departments, Admin } from '@/data/mockData';
import { useQuery } from '@tanstack/react-query';
import { getRecords } from '@/data/db';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const roleConfig = {
  super_admin: { label: 'Super Admin', color: 'bg-action/10 text-action border-action/20' },
  institution_admin: { label: 'Institution Admin', color: 'bg-field text-ink border-line' },
  school_admin: { label: 'School Admin', color: 'bg-primary/10 text-primary border-primary/20' },
  course_admin: { label: 'Course Admin', color: 'bg-info/10 text-info border-info/20' },
};

const Admins = () => {
  const [allAdmins, setAdmins] = useState(initialAdmins);
  const [institutionId, setInstitutionId] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'course_admin' as Admin['role'],
    scopeType: 'platform',
    scopeId: '',
    institutionId: 0,
  });
  const { toast } = useToast();
  const { data: instData } = useQuery({ queryKey: ['institutions', 'all'], queryFn: () => getRecords('institutions', { pageSize: 100 }) });
  const institutions = instData?.data ?? [];
  // Admins are still mock rows; only an institution admin's scope names its institution, so that is what the filter can match.
  const picked = institutions.find((i: any) => i.id === institutionId);
  const admins = institutionId ? allAdmins.filter((a) => a.scope === picked?.short_name || a.scope === picked?.name || a.scope.startsWith(`${picked?.short_name} · `)) : allAdmins;

  const getScopeLabel = (admin: Admin) => {
    return admin.scope;
  };

  const handleOpenCreate = () => {
    setEditingAdmin(null);
    setFormData({ name: '', email: '', role: 'course_admin', scopeType: 'platform', scopeId: '', institutionId: 0 });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      role: admin.role,
      scopeType: admin.role === 'super_admin' ? 'platform' : admin.role === 'institution_admin' ? 'institution' : admin.role === 'school_admin' ? 'school' : 'course',
      scopeId: '',
      institutionId: 0,
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (admin: Admin) => {
    setDeletingAdmin(admin);
    setIsDeleteOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let scope = 'Platform';
    if (formData.role === 'institution_admin' && formData.scopeId) {
      scope = institutions.find((i: any) => String(i.id) === formData.scopeId)?.short_name || 'Unknown Institution';
    } else if (formData.role === 'school_admin' && formData.scopeId) {
      scope = `${institutions.find((i: any) => i.id === formData.institutionId)?.short_name ?? ''} · ${schools.find(s => s.id === formData.scopeId)?.name || 'Unknown School'}`.replace(/^ · /, '');
    } else if (formData.role === 'course_admin' && formData.scopeId) {
      scope = `${institutions.find((i: any) => i.id === formData.institutionId)?.short_name ?? ''} · ${departments.find(c => c.id === formData.scopeId)?.name || 'Unknown Course'}`.replace(/^ · /, '');
    }
    
    if (editingAdmin) {
      setAdmins(allAdmins.map(a => 
        a.id === editingAdmin.id 
          ? { ...a, name: formData.name, email: formData.email, role: formData.role, scope }
          : a
      ));
      toast({ title: 'Admin updated successfully' });
    } else {
      const newAdmin: Admin = {
        id: `admin-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        scope,
        createdAt: new Date().toISOString().split('T')[0],
        lastActive: new Date().toISOString().split('T')[0],
      };
      setAdmins([...allAdmins, newAdmin]);
      toast({ title: 'Admin created successfully' });
    }
    
    setIsFormOpen(false);
  };

  const handleDelete = () => {
    if (deletingAdmin) {
      setAdmins(allAdmins.filter(a => a.id !== deletingAdmin.id));
      toast({ title: 'Admin removed successfully', variant: 'destructive' });
    }
    setIsDeleteOpen(false);
    setDeletingAdmin(null);
  };

  const columns: Column<Admin>[] = [
    {
      key: 'name',
      header: 'Admin',
      render: (admin) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {admin.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-medium">{admin.name}</p>
            <p className="text-xs text-muted-foreground">{admin.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (admin) => {
        const config = roleConfig[admin.role];
        return (
          <Badge variant="outline" className={cn("border", config.color)}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (admin) => (
        <span className="context-badge">{getScopeLabel(admin)}</span>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      render: (admin) => (
        <span className="text-muted-foreground">
          {new Date(admin.lastActive).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (admin) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenEdit(admin)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => handleOpenDelete(admin)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Admins & Permissions"
        description="Manage administrator access and permissions"
        actions={
          <Button onClick={handleOpenCreate} className="action-button">
            <Plus className="h-4 w-4 mr-2" />
            Add Admin
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-3xl ring-1 ring-line p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-action/10">
            <Shield className="h-5 w-5 text-action" />
          </div>
          <div>
            <p className="text-2xl font-semibold">
              {admins.filter(a => a.role === 'super_admin').length}
            </p>
            <p className="text-sm text-muted-foreground">Super Admins</p>
          </div>
        </div>
        <div className="bg-surface rounded-3xl ring-1 ring-line p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-field">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold">
              {admins.filter(a => a.role === 'school_admin').length}
            </p>
            <p className="text-sm text-muted-foreground">School Admins</p>
          </div>
        </div>
        <div className="bg-surface rounded-3xl ring-1 ring-line p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-info/10">
            <Users className="h-5 w-5 text-info" />
          </div>
          <div>
            <p className="text-2xl font-semibold">
              {admins.filter(a => a.role === 'course_admin').length}
            </p>
            <p className="text-sm text-muted-foreground">Course Admins</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <InstitutionFilter value={institutionId} onChange={setInstitutionId} />
      </div>

      <DataTable
        columns={columns}
        data={admins}
        keyExtractor={(admin) => admin.id}
        emptyMessage="No admins found. Add your first administrator to get started."
      />

      {/* Form Modal */}
      <FormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={editingAdmin ? 'Edit Admin' : 'Add Admin'}
        description={editingAdmin ? 'Update administrator information' : 'Create a new administrator'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="e.g., John Smith"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., john.smith@university.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as Admin['role'], scopeId: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="institution_admin">Institution Admin</SelectItem>
                <SelectItem value="school_admin">School Admin</SelectItem>
                <SelectItem value="course_admin">Course Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {formData.role === 'institution_admin' && (
            <div className="space-y-2">
              <Label>Assign to Institution</Label>
              <Select value={formData.scopeId} onValueChange={(value) => setFormData({ ...formData, scopeId: value })}>
                <SelectTrigger><SelectValue placeholder="Select an institution" /></SelectTrigger>
                <SelectContent>
                  {institutions.map((i: any) => <SelectItem key={i.id} value={String(i.id)}>{i.short_name} - {i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {(formData.role === 'school_admin' || formData.role === 'course_admin') && (
            <InstitutionSelect value={formData.institutionId} onChange={(id) => setFormData({ ...formData, institutionId: id, scopeId: '' })} />
          )}

          {formData.role === 'school_admin' && (
            <div className="space-y-2">
              <Label htmlFor="scope">Assign to School</Label>
              <Select
                value={formData.scopeId}
                onValueChange={(value) => setFormData({ ...formData, scopeId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {formData.role === 'course_admin' && (
            <div className="space-y-2">
              <Label htmlFor="scope">Assign to Course</Label>
              <Select
                value={formData.scopeId}
                onValueChange={(value) => setFormData({ ...formData, scopeId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="action-button">
              {editingAdmin ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Remove Admin"
        description={`Are you sure you want to remove "${deletingAdmin?.name}" as an administrator? They will lose access to the admin panel.`}
        confirmText="Remove"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
};

export default Admins;
