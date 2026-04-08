# Admin & Teacher Panel - School ERP (TypeScript)

## 📁 Structure
```
admin-teacher-panel/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/      # Admin pages
│   │   │   ├── teacher/    # Teacher pages
│   │   │   └── auth/       # 4 Auth pages ✅
│   │   ├── components/
│   │   ├── context/
│   │   ├── services/
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
└── backend/           # Node.js + Express API
    ├── controllers/
    ├── models/
    ├── routes/
    └── server.js
```

## 🚀 Installation

### 1. Frontend Setup
```bash
cd admin-teacher-panel/frontend
npm install
```

### 2. Backend Setup
```bash
cd ../backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URL
```

### 3. Start Backend
```bash
cd backend
npm start
# Runs on http://localhost:5000
```

### 4. Start Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

## 🔐 Login Credentials

**Admin:**
- Email: `admin@school.com`
- Password: `admin123`

**Teacher:**
- Email/Code: `teacher@school.com` or `TECH001`
- Password: `teacher123`

## ✨ Features

### Admin Features
- Students Management
- Teachers Management
- Classes & Subjects
- Attendance Tracking
- Exam Management
- Fee Management
- Notice Board
- Events & Timetable
- Leave Management

### Teacher Features
- Mark Attendance
- Homework Management
- Enter Results
- Leave Application

### Authentication Pages (4)
1. **Login** - Admin/Teacher login
2. **Forgot Password** - `/auth/forgot-password`
3. **Verify Email** - `/auth/verify-email`
4. **Change Password** - `/auth/change-password`

## 🎨 Original Theme Maintained
- Uses your original color scheme
- Primary colors preserved
- Tailwind CSS classes as-is
- No theme changes

## 📝 TypeScript Features
- Full type safety
- .tsx file extensions
- React.FC types
- Type-safe API calls

## 🌐 Routes

### Admin
- `/admin/dashboard`
- `/admin/students`
- `/admin/teachers`
- `/admin/classes`
- `/admin/subjects`
- `/admin/attendance`
- `/admin/exams`
- `/admin/fees`
- `/admin/notices`
- `/admin/events`
- `/admin/timetable`
- `/admin/leaves`

### Teacher
- `/teacher/dashboard`
- `/teacher/attendance`
- `/teacher/homework`
- `/teacher/results`
- `/teacher/leave`
