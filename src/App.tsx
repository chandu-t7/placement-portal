import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  Link, 
  useNavigate,
  useLocation
} from 'react-router-dom';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Briefcase, 
  GraduationCap, 
  Bell, 
  LogOut, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Clock,
  Menu,
  FileText,
  Search,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types & Context ---
interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STUDENT' | 'COMPANY';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Components ---

const Navbar = () => {
  const { user, logout } = useContext(AuthContext)!;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (user) {
      axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(res => setNotifications(res.data));
    }
  }, [user]);

  return (
    <nav className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <GraduationCap className="text-white w-5 h-5" />
        </div>
        <span className="font-bold text-xl tracking-tight text-gray-900">PlacementHub</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <button 
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 hover:bg-gray-50 rounded-full relative"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {notifications.some(n => !n.is_read) && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          
          <AnimatePresence>
            {showNotifs && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2"
              >
                <div className="px-4 py-2 border-b border-gray-50 font-semibold text-sm">Notifications</div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">No new notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="px-4 py-3 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0">
                        {n.message}
                        <div className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-px bg-gray-100"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-gray-900">{user?.name}</div>
            <div className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">{user?.role}</div>
          </div>
          <button 
            onClick={logout}
            className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

const Sidebar = () => {
  const { user } = useContext(AuthContext)!;
  const location = useLocation();

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/students', icon: Users, label: 'Students' },
    { to: '/admin/companies', icon: Building2, label: 'Companies' },
    { to: '/admin/jobs', icon: Briefcase, label: 'Job Roles' },
  ];

  const studentLinks = [
    { to: '/student', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/jobs', icon: Briefcase, label: 'Available Jobs' },
    { to: '/student/applications', icon: FileText, label: 'My Applications' },
  ];

  const companyLinks = [
    { to: '/company', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/company/post-job', icon: Plus, label: 'Post Job' },
    { to: '/company/applications', icon: Users, label: 'Applications' },
  ];

  const links = user?.role === 'ADMIN' ? adminLinks : user?.role === 'STUDENT' ? studentLinks : companyLinks;

  return (
    <aside className="w-64 border-r border-gray-100 bg-white h-[calc(100vh-64px)] fixed left-0 top-16 hidden md:block">
      <div className="p-4 space-y-1">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              location.pathname === link.to 
                ? 'bg-blue-50 text-blue-600 font-medium' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <link.icon className="w-5 h-5" />
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
};

// --- Pages ---

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'COMPANY' | 'ADMIN'>('STUDENT');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext)!;
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { email, password, role });
      login(res.data.token, res.data.user);
      navigate(`/${role.toLowerCase()}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
      >
        <div className="p-8 pb-0 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <GraduationCap className="text-white w-7 h-7" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-500 mt-2">Sign in to your portal account</p>
        </div>

        <div className="p-8">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-xl text-sm border border-red-100">{error}</div>}
          
          <div className="flex gap-2 mb-8 bg-gray-50 p-1 rounded-xl">
            {(['STUDENT', 'COMPANY', 'ADMIN'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  role === r ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@college.edu"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200"
            >
              Sign In
            </button>
          </form>

          <div className="mt-8 text-center bg-blue-50 p-4 rounded-xl">
            <p className="text-xs text-blue-600 font-medium mb-1 uppercase tracking-wider">Sample Credentials</p>
            <p className="text-sm text-gray-600 font-mono">admin@placement.edu / admin123</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    axios.get('/api/admin/stats', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setStats(res.data));
  }, []);

  if (!stats) return <div className="p-8 text-center text-gray-500">Loading metrics...</div>;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Command Center</h1>
          <p className="text-gray-500">Real-time placement and academic metrics</p>
        </div>
        <div className="flex gap-4">
           {/* Report Generation Placeholders */}
           <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 flex items-center gap-2">
             <FileText className="w-4 h-4" /> Export CSV
           </button>
           <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md">
             Fresh Report
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Students', value: stats.summary.totalStudents, icon: Users, color: 'blue' },
          { label: 'Active Companies', value: stats.summary.totalCompanies, icon: Building2, color: 'emerald' },
          { label: 'Placed Students', value: stats.summary.totalPlaced, icon: CheckCircle, color: 'purple' },
          { label: 'Avg Package', value: `${(stats.summary.averagePackage / 100000).toFixed(1)} LPA`, icon: Briefcase, color: 'orange' },
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1 lowercase tracking-tight">{item.label}</p>
              <h3 className="text-2xl font-bold text-gray-900">{item.value}</h3>
            </div>
            <div className={`p-4 bg-${item.color}-50 text-${item.color}-600 rounded-xl`}>
              <item.icon className="w-6 h-6" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Placement by Branch</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.branchPlacements}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="branch" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Company Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.companyPlacements}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="name"
                >
                  {stats.companyPlacements.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentJobs = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [applied, setApplied] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('/api/jobs').then(res => setJobs(res.data));
    axios.get('/api/applications/student', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setApplied(res.data));
  }, []);

  const apply = async (jobId: string) => {
    try {
      await axios.post('/api/applications/apply', { jobId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage('Successfully applied!');
      // Refresh apps
      axios.get('/api/applications/student', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(res => setApplied(res.data));
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Application failed');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Career Opportunities</h1>
        <p className="text-gray-500">Explore and apply for roles that match your skill set</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium ${message.includes('Success') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobs.map(job => {
          const hasApplied = applied.some(a => a.job_role_id === job.id);
          return (
            <motion.div 
              key={job.id} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{(job.package_amount / 100000).toFixed(1)} LPA</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{job.job_type}</div>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1">{job.title}</h3>
              <p className="text-blue-600 font-medium text-sm mb-4">{job.company_name}</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <GraduationCap className="w-4 h-4 text-gray-400" />
                  <span>Min CGPA: <b>{job.min_cgpa}</b></span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((s: string) => (
                    <span key={s} className="px-2 py-1 bg-gray-50 text-gray-500 text-[10px] font-bold uppercase rounded-md">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <button
                disabled={hasApplied}
                onClick={() => apply(job.id)}
                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  hasApplied 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-200'
                }`}
              >
                {hasApplied ? <><CheckCircle className="w-4 h-4" /> Applied</> : 'Apply Now'}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const CompanyPostJob = () => {
  const [formData, setFormData] = useState({
    title: '',
    minCGPA: 6.5,
    requiredSkills: '',
    packageAmount: 500000,
    jobType: 'TECHNICAL' as any
  });
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/jobs', {
        ...formData,
        requiredSkills: formData.requiredSkills.split(',').map(s => s.trim())
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccess(true);
      setTimeout(() => navigate('/company'), 1500);
    } catch (err) {}
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Job Opening</h2>
        
        {success && (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Job posted successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2 lowercase tracking-tight">Job Title</label>
              <input
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Software Engineer (Full Stack)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 lowercase tracking-tight">Min CGPA</label>
              <input
                type="number"
                step="0.1"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.minCGPA}
                onChange={e => setFormData({ ...formData, minCGPA: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 lowercase tracking-tight">Package (Annual)</label>
              <input
                type="number"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.packageAmount}
                onChange={e => setFormData({ ...formData, packageAmount: parseInt(e.target.value) })}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2 lowercase tracking-tight">Required Skills (Comma separated)</label>
              <input
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.requiredSkills}
                onChange={e => setFormData({ ...formData, requiredSkills: e.target.value })}
                placeholder="React, Node.js, Python, SQL"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2 lowercase tracking-tight">Job Category</label>
              <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
                {['TECHNICAL', 'NON_TECHNICAL'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, jobType: t })}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      formData.jobType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-100"
          >
            Publish Job Role
          </button>
        </form>
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const { user } = useContext(AuthContext)!;
  const [stats, setStats] = useState<any>({ applied: 0, placed: false });

  useEffect(() => {
    axios.get('/api/applications/student', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => {
      setStats({ 
        applied: res.data.length, 
        placed: res.data.some((a: any) => a.status === 'PLACED') 
      });
    });
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}!</h1>
        <p className="opacity-90">You have {stats.applied} active applications. Keep going!</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-tighter">Application Status</h3>
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-xl ${stats.placed ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
              {stats.placed ? <CheckCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.placed ? 'Placed' : 'In Progress'}</div>
              <div className="text-sm text-gray-500">{stats.placed ? 'Congratulations!' : 'Keep applying for jobs'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentApplications = () => {
  const [apps, setApps] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/applications/student', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setApps(res.data));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">My Applications</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100 italic font-serif text-[11px] opacity-50 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Company</th>
              <th className="px-6 py-4">Job Title</th>
              <th className="px-6 py-4">Applied Date</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {apps.map(app => (
              <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-semibold">{app.company_name}</td>
                <td className="px-6 py-4">{app.title}</td>
                <td className="px-6 py-4 text-gray-500">{new Date(app.applied_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    app.status === 'APPROVED' ? 'bg-blue-50 text-blue-600' : 
                    app.status === 'REJECTED' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {app.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CompanyDashboard = () => {
  const { user } = useContext(AuthContext)!;
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="bg-gray-900 rounded-3xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome {user?.name}</h1>
        <p className="text-gray-400">Manage your recruitment drives and candidate pool.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/company/post-job" className="bg-blue-600 p-8 rounded-3xl text-white hover:scale-[1.02] transition-transform">
          <Plus className="mb-4" />
          <h3 className="text-xl font-bold">Post New Job</h3>
          <p className="text-sm opacity-80 mt-1">Start a new recruitment drive</p>
        </Link>
        <Link to="/company/applications" className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-md transition-shadow">
          <Users className="mb-4 text-blue-600" />
          <h3 className="text-xl font-bold">View Candidates</h3>
          <p className="text-sm text-gray-500 mt-1">Review applications and skills</p>
        </Link>
      </div>
    </div>
  );
};

const CompanyApplications = () => {
  const [apps, setApps] = useState<any[]>([]);

  useEffect(() => {
    refreshApps();
  }, []);

  const refreshApps = () => {
    axios.get('/api/applications/company', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setApps(res.data));
  };

  const updateStatus = async (appId: string, status: string) => {
    try {
      await axios.post(`/api/applications/update-status`, { appId, status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      refreshApps();
    } catch (err) {}
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
       <h2 className="text-2xl font-bold mb-6">Candidate Applications</h2>
       <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
         <table className="w-full text-left">
           <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold uppercase tracking-widest text-gray-400">
             <tr>
               <th className="px-6 py-4">Student</th>
               <th className="px-6 py-4">Branch</th>
               <th className="px-6 py-4">CGPA</th>
               <th className="px-6 py-4">Status</th>
               <th className="px-6 py-4">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-50">
             {apps.map(app => (
               <tr key={app.id}>
                 <td className="px-6 py-4 font-bold">{app.student_name}</td>
                 <td className="px-6 py-4 text-gray-600">{app.branch}</td>
                 <td className="px-6 py-4 text-blue-600 font-bold">{app.cgpa}</td>
                 <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      app.status === 'APPROVED' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}>{app.status}</span>
                 </td>
                 <td className="px-6 py-4 flex gap-2">
                   <button 
                    onClick={() => updateStatus(app.id, 'APPROVED')}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700"
                   >
                     Approve
                   </button>
                   <button 
                    onClick={() => updateStatus(app.id, 'REJECTED')}
                    className="px-3 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold hover:bg-red-100"
                   >
                     Reject
                   </button>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
    </div>
  );
};

// Generic Management Components for Admin
const StudentManagement = () => <div className="p-8"><h2 className="text-2xl font-bold">Student Directory</h2><div className="bg-white p-12 text-center rounded-3xl text-gray-400 border border-dashed mt-6">Administrative Table View for all students. Filter by CGPA/Branch.</div></div>;
const CompanyManagement = () => <div className="p-8"><h2 className="text-2xl font-bold">Company Partners</h2><div className="bg-white p-12 text-center rounded-3xl text-gray-400 border border-dashed mt-6">Manage partnered corporations and contact info.</div></div>;
const JobManagement = () => <div className="p-8"><h2 className="text-2xl font-bold">Role Master</h2><div className="bg-white p-12 text-center rounded-3xl text-gray-400 border border-dashed mt-6">Global list of all job roles posted across campus.</div></div>;

// --- Auth HOC ---
const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: string }) => {
  const { user, loading } = useContext(AuthContext)!;
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <Navbar />
        <main>{children}</main>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute role="ADMIN"><StudentManagement /></ProtectedRoute>} />
          <Route path="/admin/companies" element={<ProtectedRoute role="ADMIN"><CompanyManagement /></ProtectedRoute>} />
          <Route path="/admin/jobs" element={<ProtectedRoute role="ADMIN"><JobManagement /></ProtectedRoute>} />
          
          <Route path="/student" element={<ProtectedRoute role="STUDENT"><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/jobs" element={<ProtectedRoute role="STUDENT"><StudentJobs /></ProtectedRoute>} />
          <Route path="/student/applications" element={<ProtectedRoute role="STUDENT"><StudentApplications /></ProtectedRoute>} />
          
          <Route path="/company" element={<ProtectedRoute role="COMPANY"><CompanyDashboard /></ProtectedRoute>} />
          <Route path="/company/post-job" element={<ProtectedRoute role="COMPANY"><CompanyPostJob /></ProtectedRoute>} />
          <Route path="/company/applications" element={<ProtectedRoute role="COMPANY"><CompanyApplications /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to={user ? `/${user.role.toLowerCase()}` : "/login"} />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}
