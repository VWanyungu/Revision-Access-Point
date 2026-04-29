export interface School {
  id: number;
  name: string;
  code: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  schools?: {name: string, id: number};
  createdAt: string;
}

export interface Unit {
  id: string;
  name: string;
  code: string;
  departments?: {name: string, id: string, schools?: {name: string, id: number}};
  year_of_study: number;
  semester_of_study: number;
  createdAt: string;
}

export interface Resource {
  id: string;
  resource_types: { id: number; name: string };
  units: {name: string, id: string};
  departments: {name: string, id: string};
  schools: {name:string, id: number};
  name: string;
  description?: string;
  created_at: string;
  uploaded_by: string;
  public_access_url: string;
  resource_type_id: number;
  unit_id: string;
  department_id: string;
  school_id: number;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'school_admin' | 'course_admin';
  scope: string;
  createdAt: string;
  lastActive: string;
}

export interface Activity {
  id: string;
  action: 'upload' | 'edit' | 'delete' | 'create';
  resource: string;
  user: string;
  timestamp: string;
}

export const schools: School[] = [
  { id: 1, code: 'SCI', name: 'School of Engineering'},
  { id: 2, code: 'SCI', name: 'School of Business'},
  { id: 3, code: 'SCI', name: 'School of Medicine'},
  { id: 4, code: 'SCI', name: 'School of Arts & Sciences'},
  { id: 5, code: 'SCI', name: 'School of Law'},
];

export const departments: Department[] = [
  { id: 'course-1', name: 'Computer Science', code: 'CS', schools: {name: 'Engineering', id: 1}, createdAt: '2024-01-20' },
  { id: 'course-2', name: 'Electrical Engineering', code: 'EE', schools: {name: 'Engineering', id: 1}, createdAt: '2024-01-20' },
  { id: 'course-3', name: 'Business Administration', code: 'BA', schools: {name: 'Business', id: 2}, createdAt: '2024-01-25' },
  { id: 'course-4', name: 'Finance', code: 'FIN', schools: {name: 'Business', id: 2}, createdAt: '2024-01-25' },
  { id: 'course-5', name: 'General Medicine', code: 'GM', schools: {name: 'Medicine', id: 3}, createdAt: '2024-02-05' },
  { id: 'course-6', name: 'Mechanical Engineering', code: 'ME', schools: {name: 'Engineering', id: 1}, createdAt: '2024-02-10' },
];

export const units: Unit[] = [          
  { id: 'unit-1', name: 'Data Structures & Algorithms', code: 'CS201', departments: {name: 'Computer Science', id: 'course-1'}, year_of_study: 2, semester_of_study: 2, createdAt: '2024-02-15' },
  { id: 'unit-2', name: 'Database Systems', code: 'CS301', departments: {name: 'Computer Science', id: 'course-1'}, year_of_study:3, semester_of_study: 3, createdAt: '2024-02-20' },
  { id: 'unit-3', name: 'Operating Systems', code: 'CS302', departments: {name: 'Computer Science', id: 'course-1'}, year_of_study:3, semester_of_study: 3, createdAt: '2024-02-25'},
  { id: 'unit-4', name: 'Circuit Analysis', code: 'EE101', departments: {name: 'Electrical Engineering', id: 'course-2'}, year_of_study:1, semester_of_study: 1, createdAt: '2024-02-26'},
  { id: 'unit-5', name: 'Financial Accounting', code: 'BA201', departments: {name: 'Business Administration', id: 'course-3'}, year_of_study:2, createdAt: '2024-03-27', semester_of_study: 2},
  { id: 'unit-6', name: 'Corporate Finance', code: 'FIN301', departments: {name: 'Finance', id: 'course-4'}, year_of_study: 3, createdAt: '2024-04-20', semester_of_study: 3},
];

export const resources: Resource[] = [
//   { id: 'res-1', title: 'Introduction to DSA', type: 'notes', unitId: 'unit-1', unitName: 'Data Structures & Algorithms', fileName: 'dsa_intro.pdf', uploadedAt: '2024-03-01', uploadedBy: 'Dr. Smith' },
//   { id: 'res-2', title: 'DSA CAT 1 2024', type: 'cats', unitId: 'unit-1', unitName: 'Data Structures & Algorithms', fileName: 'dsa_cat1.pdf', uploadedAt: '2024-03-15', uploadedBy: 'Dr. Smith' },
//   { id: 'res-3', title: 'Final Exam 2023', type: 'exams', unitId: 'unit-1', unitName: 'Data Structures & Algorithms', fileName: 'dsa_exam_2023.pdf', uploadedAt: '2024-02-01', uploadedBy: 'Dr. Smith' },
//   { id: 'res-4', title: 'Linked Lists Tutorial', type: 'tutorials', unitId: 'unit-1', unitName: 'Data Structures & Algorithms', fileName: 'linked_lists.pdf', uploadedAt: '2024-03-10', uploadedBy: 'TA Johnson' },
//   { id: 'res-5', title: 'SQL Fundamentals', type: 'notes', unitId: 'unit-2', unitName: 'Database Systems', fileName: 'sql_basics.pdf', uploadedAt: '2024-03-05', uploadedBy: 'Prof. Davis' },
//   { id: 'res-6', title: 'Process Management', type: 'notes', unitId: 'unit-3', unitName: 'Operating Systems', fileName: 'process_mgmt.pdf', uploadedAt: '2024-03-08', uploadedBy: 'Dr. Wilson' },
//   { id: 'res-7', title: 'Kirchhoff Laws', type: 'notes', unitId: 'unit-4', unitName: 'Circuit Analysis', fileName: 'kirchhoff.pdf', uploadedAt: '2024-03-12', uploadedBy: 'Prof. Lee' },
//   { id: 'res-8', title: 'Balance Sheet Analysis', type: 'tutorials', unitId: 'unit-5', unitName: 'Financial Accounting', fileName: 'balance_sheet.pdf', uploadedAt: '2024-03-18', uploadedBy: 'Dr. Brown' },
];

export const admins: Admin[] = [
  { id: 'admin-1', name: 'John Administrator', email: 'john.admin@university.edu', role: 'super_admin', scope: 'Platform', createdAt: '2024-01-01', lastActive: '2024-03-20' },
  { id: 'admin-2', name: 'Sarah Engineering', email: 'sarah.eng@university.edu', role: 'school_admin', scope: 'School of Engineering', createdAt: '2024-01-15', lastActive: '2024-03-19' },
  { id: 'admin-3', name: 'Mike Business', email: 'mike.bus@university.edu', role: 'school_admin', scope: 'School of Business', createdAt: '2024-01-20', lastActive: '2024-03-18' },
  { id: 'admin-4', name: 'Emily CS Admin', email: 'emily.cs@university.edu', role: 'course_admin', scope: 'Computer Science', createdAt: '2024-02-01', lastActive: '2024-03-20' },
  { id: 'admin-5', name: 'David Finance', email: 'david.fin@university.edu', role: 'course_admin', scope: 'Finance', createdAt: '2024-02-15', lastActive: '2024-03-17' },
];

export const recentActivity: Activity[] = [
  // { id: 'act-1', action: 'upload', resource: 'DSA CAT 1 2024', user: 'Dr. Smith', timestamp: '2024-03-20T14:30:00' },
  // { id: 'act-2', action: 'edit', resource: 'Computer Science Course', user: 'Sarah Engineering', timestamp: '2024-03-20T12:15:00' },
  // { id: 'act-3', action: 'create', resource: 'New Unit: Machine Learning', user: 'John Administrator', timestamp: '2024-03-20T10:00:00' },
  // { id: 'act-4', action: 'delete', resource: 'Outdated Exam 2020', user: 'Emily CS Admin', timestamp: '2024-03-19T16:45:00' },
  // { id: 'act-5', action: 'upload', resource: 'SQL Fundamentals Notes', user: 'Prof. Davis', timestamp: '2024-03-19T14:20:00' },
  // { id: 'act-6', action: 'edit', resource: 'Circuit Analysis Unit', user: 'Prof. Lee', timestamp: '2024-03-19T11:30:00' },
  // { id: 'act-7', action: 'create', resource: 'New Admin: David Finance', user: 'John Administrator', timestamp: '2024-03-18T09:00:00' },
];
