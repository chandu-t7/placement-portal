
import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Constants & Secret ---
const JWT_SECRET = process.env.JWT_SECRET || 'campus-placement-super-secret-key';
const PORT = 3000;

// --- Custom Exceptions ---
class IneligibleStudentException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IneligibleStudentException';
  }
}

class DuplicateRegistrationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateRegistrationException';
  }
}

// --- OOP Models (Academic Requirements) ---
interface Eligible {
  checkEligibility(minCGPA: number, requiredSkills: string[]): boolean;
}

abstract class Person {
  public id: string;
  public name: string;
  public email: string;
  public role: 'ADMIN' | 'STUDENT' | 'COMPANY';

  constructor(
    id: string,
    name: string,
    email: string,
    role: 'ADMIN' | 'STUDENT' | 'COMPANY'
  ) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
  }
  
  abstract getProfileSummary(): string;
}

class Student extends Person implements Eligible {
  public cgpa: number;
  public skills: string[];
  public branch: string;
  public resumeUrl?: string;

  constructor(
    id: string,
    name: string,
    email: string,
    cgpa: number,
    skills: string[],
    branch: string,
    resumeUrl?: string
  ) {
    super(id, name, email, 'STUDENT');
    this.cgpa = cgpa;
    this.skills = skills;
    this.branch = branch;
    this.resumeUrl = resumeUrl;
  }

  getProfileSummary(): string {
    return `Student: ${this.name} (${this.branch}) - CGPA: ${this.cgpa}`;
  }

  checkEligibility(minCGPA: number, requiredSkills: string[]): boolean {
    if (this.cgpa < minCGPA) return false;
    // Check if at least one required skill is present (or all, depending on logic)
    // For this implementation, we check if student has ALL required skills
    return requiredSkills.every(skill => this.skills.includes(skill));
  }
}

class JobRole {
  public id: string;
  public companyId: string;
  public title: string;
  public minCGPA: number;
  public requiredSkills: string[];
  public packageAmount: number;
  public type: 'TECHNICAL' | 'NON_TECHNICAL';

  constructor(
    id: string,
    companyId: string,
    title: string,
    minCGPA: number,
    requiredSkills: string[],
    packageAmount: number,
    type: 'TECHNICAL' | 'NON_TECHNICAL'
  ) {
    this.id = id;
    this.companyId = companyId;
    this.title = title;
    this.minCGPA = minCGPA;
    this.requiredSkills = requiredSkills;
    this.packageAmount = packageAmount;
    this.type = type;
  }
}

class TechnicalRole extends JobRole {
  constructor(id: string, companyId: string, title: string, minCGPA: number, requiredSkills: string[], packageAmount: number) {
    super(id, companyId, title, minCGPA, requiredSkills, packageAmount, 'TECHNICAL');
  }
}

class NonTechnicalRole extends JobRole {
  constructor(id: string, companyId: string, title: string, minCGPA: number, requiredSkills: string[], packageAmount: number) {
    super(id, companyId, title, minCGPA, requiredSkills, packageAmount, 'NON_TECHNICAL');
  }
}

// --- Database Helper ---
let db: Database;

async function initDb() {
  db = await open({
    filename: './placement_management.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      cgpa REAL NOT NULL,
      skills TEXT NOT NULL, -- JSON array
      branch TEXT NOT NULL,
      resume_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      description TEXT,
      website TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS job_roles (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      title TEXT NOT NULL,
      min_cgpa REAL NOT NULL,
      required_skills TEXT NOT NULL, -- JSON array
      package_amount REAL NOT NULL,
      job_type TEXT NOT NULL, -- TECHNICAL or NON_TECHNICAL
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      job_role_id TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
      current_round TEXT DEFAULT 'APPLIED',
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (job_role_id) REFERENCES job_roles(id),
      UNIQUE(student_id, job_role_id)
    );

    CREATE TABLE IF NOT EXISTS interview_rounds (
      id TEXT PRIMARY KEY,
      registration_id TEXT NOT NULL,
      round_name TEXT NOT NULL, -- Aptitude, Technical, HR
      status TEXT DEFAULT 'PENDING', -- PENDING, PASSED, FAILED
      marks REAL,
      feedback TEXT,
      scheduled_at DATETIME,
      FOREIGN KEY (registration_id) REFERENCES registrations(id)
    );

    CREATE TABLE IF NOT EXISTS placement_results (
      id TEXT PRIMARY KEY,
      registration_id TEXT UNIQUE NOT NULL,
      student_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      job_role_id TEXT NOT NULL,
      package_offered REAL NOT NULL,
      placed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin if not exists
  const adminExists = await db.get('SELECT * FROM admins LIMIT 1');
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.run('INSERT INTO admins (id, name, email, password) VALUES (?, ?, ?, ?)', 
      ['admin-1', 'Super Admin', 'admin@placement.edu', hashedPassword]);
  }

  // Seed sample data for testing
  const studentExists = await db.get('SELECT * FROM students LIMIT 1');
  if (!studentExists) {
    const pass = await bcrypt.hash('student123', 10);
    const compPass = await bcrypt.hash('company123', 10);
    
    // Seed Student
    await db.run('INSERT INTO students (id, name, email, password, cgpa, skills, branch) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['std-1', 'John Doe', 'student@placement.edu', pass, 8.5, JSON.stringify(['React', 'Node.js']), 'Computer Science']);
    
    // Seed Company
    await db.run('INSERT INTO companies (id, name, email, password, description, website) VALUES (?, ?, ?, ?, ?, ?)',
      ['comp-1', 'TechCorp', 'hr@techcorp.com', compPass, 'Leading AI Solutions', 'https://techcorp.com']);
    
    // Seed Job
    await db.run('INSERT INTO job_roles (id, company_id, title, min_cgpa, required_skills, package_amount, job_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['job-1', 'comp-1', 'Frontend Architect', 7.5, JSON.stringify(['React']), 1200000, 'TECHNICAL']);
  }
}

// --- Middleware ---
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    (req as any).user = user;
    next();
  });
};

// --- API Routes ---
async function setupRoutes(app: express.Express) {
  // Authentication
  app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;
    let user;
    let table = role.toLowerCase() + 's';
    
    user = await db.get(`SELECT * FROM ${table} WHERE email = ?`, [email]);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role } });
  });

  app.post('/api/auth/register-student', async (req, res) => {
    const { name, email, password, cgpa, skills, branch } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = 'std-' + Math.random().toString(36).substr(2, 9);
      await db.run(
        'INSERT INTO students (id, name, email, password, cgpa, skills, branch) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name, email, hashedPassword, cgpa, JSON.stringify(skills), branch]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/auth/register-company', async (req, res) => {
    const { name, email, password, description, website } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = 'comp-' + Math.random().toString(36).substr(2, 9);
      await db.run(
        'INSERT INTO companies (id, name, email, password, description, website) VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, email, hashedPassword, description, website]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Jobs
  app.get('/api/jobs', async (req, res) => {
    const jobs = await db.all(`
      SELECT jr.*, c.name as company_name 
      FROM job_roles jr 
      JOIN companies c ON jr.company_id = c.id
    `);
    res.json(jobs.map(j => ({ ...j, required_skills: JSON.parse(j.required_skills) })));
  });

  app.post('/api/jobs', authenticateToken, async (req, res) => {
    const { title, minCGPA, requiredSkills, packageAmount, jobType } = req.body;
    const companyId = (req as any).user.id;
    const id = 'job-' + Math.random().toString(36).substr(2, 9);
    
    // Academic OOP requirement usage
    let role;
    if (jobType === 'TECHNICAL') {
      role = new TechnicalRole(id, companyId, title, minCGPA, requiredSkills, packageAmount);
    } else {
      role = new NonTechnicalRole(id, companyId, title, minCGPA, requiredSkills, packageAmount);
    }

    await db.run(
      'INSERT INTO job_roles (id, company_id, title, min_cgpa, required_skills, package_amount, job_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [role.id, role.companyId, role.title, role.minCGPA, JSON.stringify(role.requiredSkills), role.packageAmount, role.type]
    );
    res.json({ id: role.id });
  });

  // Applications
  app.post('/api/applications/apply', authenticateToken, async (req, res) => {
    const { jobId } = req.body;
    const studentId = (req as any).user.id;

    try {
      // Check existing
      const existing = await db.get('SELECT * FROM registrations WHERE student_id = ? AND job_role_id = ?', [studentId, jobId]);
      if (existing) throw new DuplicateRegistrationException('Already registered for this job');

      // Check eligibility (Academic OOP requirement)
      const studentData = await db.get('SELECT * FROM students WHERE id = ?', [studentId]);
      const jobData = await db.get('SELECT * FROM job_roles WHERE id = ?', [jobId]);
      
      const student = new Student(
        studentData.id, 
        studentData.name, 
        studentData.email, 
        studentData.cgpa, 
        JSON.parse(studentData.skills), 
        studentData.branch
      );

      if (!student.checkEligibility(jobData.min_cgpa, JSON.parse(jobData.required_skills))) {
        throw new IneligibleStudentException('You do not meet the minimum criteria');
      }

      const id = 'reg-' + Math.random().toString(36).substr(2, 9);
      await db.run(
        'INSERT INTO registrations (id, student_id, job_role_id) VALUES (?, ?, ?)',
        [id, studentId, jobId]
      );

      // Create initial notification for company (Simulated Multithreading/Async)
      setTimeout(async () => {
         await db.run('INSERT INTO notifications (id, user_id, message) VALUES (?, ?, ?)',
           ['not-' + Math.random().toString(36).substr(2, 9), jobData.company_id, `New application from ${student.name} for ${jobData.title}`]
         );
      }, 0);

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/applications/student', authenticateToken, async (req, res) => {
    const studentId = (req as any).user.id;
    const apps = await db.all(`
      SELECT r.*, jr.title, c.name as company_name, jr.package_amount
      FROM registrations r
      JOIN job_roles jr ON r.job_role_id = jr.id
      JOIN companies c ON jr.company_id = c.id
      WHERE r.student_id = ?
    `, [studentId]);
    res.json(apps);
  });

  app.get('/api/applications/company', authenticateToken, async (req, res) => {
    const companyId = (req as any).user.id;
    const apps = await db.all(`
      SELECT r.*, s.name as student_name, s.cgpa, s.branch, s.skills as student_skills, jr.title as job_title
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      JOIN job_roles jr ON r.job_role_id = jr.id
      WHERE jr.company_id = ?
    `, [companyId]);
    res.json(apps.map(a => ({ ...a, student_skills: JSON.parse(a.student_skills) })));
  });

  app.post('/api/applications/update-status', authenticateToken, async (req, res) => {
    const { appId, status } = req.body;
    try {
      await db.run('UPDATE registrations SET status = ? WHERE id = ?', [status, appId]);
      
      // Notify student
      const app = await db.get('SELECT student_id, job_role_id FROM registrations WHERE id = ?', [appId]);
      const job = await db.get('SELECT title FROM job_roles WHERE id = ?', [app.job_role_id]);
      
      await db.run('INSERT INTO notifications (id, user_id, message) VALUES (?, ?, ?)',
        ['not-' + Math.random().toString(36).substr(2, 9), app.student_id, `Your application for ${job.title} has been updated to ${status}`]
      );

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Update failed' });
    }
  });

  // Admin / Analytics
  app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    if ((req as any).user.role !== 'ADMIN') return res.sendStatus(403);
    
    const totalStudents = await db.get('SELECT COUNT(*) as count FROM students');
    const totalCompanies = await db.get('SELECT COUNT(*) as count FROM companies');
    const totalJobs = await db.get('SELECT COUNT(*) as count FROM job_roles');
    const totalPlaced = await db.get('SELECT COUNT(*) as count FROM placement_results');
    
    const branchPlacements = await db.all(`
      SELECT s.branch, COUNT(pr.id) as count
      FROM students s
      LEFT JOIN placement_results pr ON s.id = pr.student_id
      GROUP BY s.branch
    `);

    const companyPlacements = await db.all(`
      SELECT c.name, COUNT(pr.id) as count
      FROM companies c
      LEFT JOIN placement_results pr ON c.id = pr.company_id
      GROUP BY c.name
    `);

    const packages = await db.get('SELECT MAX(package_offered) as highest, AVG(package_offered) as average FROM placement_results');

    res.json({
      summary: {
        totalStudents: totalStudents.count,
        totalCompanies: totalCompanies.count,
        totalJobs: totalJobs.count,
        totalPlaced: totalPlaced.count,
        highestPackage: packages.highest || 0,
        averagePackage: packages.average || 0
      },
      branchPlacements,
      companyPlacements
    });
  });

  // Notifications
  app.get('/api/notifications', authenticateToken, async (req, res) => {
    const userId = (req as any).user.id;
    const notifs = await db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(notifs);
  });
}

// --- Main Server Setup ---
async function startServer() {
  console.log('Starting server...');
  await initDb();
  console.log('Database initialized.');
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  await setupRoutes(app);
  console.log('Routes setup complete.');

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
