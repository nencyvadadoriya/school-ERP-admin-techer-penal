import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9005/api';

const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const adminAPI = {
  register: (data) => api.post('/admin/register', data),
  login: (data) => api.post('/admin/login', data),
  getAll: () => api.get('/admin'),
  getById: (id) => api.get(`/admin/${id}`),
  update: (id, data) => api.patch(`/admin/${id}`, data),
  updateImage: (id, formData) => api.patch(`/admin/${id}`, formData),
  delete: (id) => api.delete(`/admin/${id}`),
};

export const teacherAPI = {
  register: (data) => api.post('/teacher/register', data),
  login: (data) => api.post('/teacher/login', data),
  getAll: () => api.get('/teacher'),
  getById: (id) => api.get(`/teacher/${id}`),
  update: (id, data) => api.patch(`/teacher/${id}`, data),
  updateImage: (id, formData) => api.patch(`/teacher/${id}`, formData),
  delete: (id) => api.delete(`/teacher/${id}`),
};

export const studentAPI = {
  register: (data) => api.post('/student/register', data),
  login: (data) => api.post('/student/login', data),
  getAll: () => api.get('/student'),
  getById: (id) => api.get(`/student/${id}`),
  update: (id, data) => api.patch(`/student/${id}`, data),
  updateImage: (id, formData) => api.patch(`/student/${id}`, formData),
  delete: (id) => api.delete(`/student/${id}`),
};

// Class API
export const classAPI = {
  create: (data) => api.post('/class', data),
  getAll: (params?: any) => api.get('/class', { params }),
  getById: (id) => api.get(`/class/${id}`),
  getByCode: (class_code) => api.get(`/class/code/${class_code}`),
  update: (id, data) => api.patch(`/class/${id}`, data),
  delete: (id) => api.delete(`/class/${id}`),
  assignTeacher: (id, data) => api.patch(`/class/${id}/assign-teacher`, data),
};

export const attendanceAPI = {
  mark: (data) => api.post('/attendance', data),
  getAll: (params?: any) => api.get('/attendance', { params }),
  getStudentSummary: (params?: any) => api.get('/attendance/student', { params }),
  delete: (id) => api.delete(`/attendance/${id}`),
};

export const homeworkAPI = {
  create: (data) => api.post('/homework', data),
  getAll: (params?: any) => api.get('/homework', { params }),
  getById: (id) => api.get(`/homework/${id}`),
  update: (id, data) => api.patch(`/homework/${id}`, data),
  delete: (id) => api.delete(`/homework/${id}`),
};

export const examAPI = {
  create: (data) => api.post('/exam', data),
  getAll: (params?: any) => api.get('/exam', { params }),
  getById: (id) => api.get(`/exam/${id}`),
  update: (id, data) => api.patch(`/exam/${id}`, data),
  delete: (id) => api.delete(`/exam/${id}`),
  submitResult: (data) => api.post('/exam/results/submit', data),
  getResults: (params) => api.get('/exam/results/all', { params }),
};

export const feesAPI = {
  create: (data) => api.post('/fees', data),
  getAll: (params?: any) => api.get('/fees', { params }),
  getById: (id) => api.get(`/fees/${id}`),
  update: (id, data) => api.patch(`/fees/${id}`, data),
  delete: (id) => api.delete(`/fees/${id}`),
  getSummary: () => api.get('/fees/summary'),
};

export const noticeAPI = {
  create: (data) => api.post('/notice', data),
  getAll: (params?: any) => api.get('/notice', { params }),
  update: (id, data) => api.patch(`/notice/${id}`, data),
  delete: (id) => api.delete(`/notice/${id}`),
};

export const eventAPI = {
  create: (data) => api.post('/event', data),
  getAll: () => api.get('/event'),
  update: (id, data) => api.patch(`/event/${id}`, data),
  delete: (id) => api.delete(`/event/${id}`),
};

export const leaveAPI = {
  applyStudent: (data) => api.post('/leave/student', data),
  getStudentLeaves: (params?: any) => api.get('/leave/student', { params }),
  updateStudentLeave: (id, data) => api.patch(`/leave/student/${id}`, data),
  applyTeacher: (data) => api.post('/leave/teacher', data),
  getTeacherLeaves: (params?: any) => api.get('/leave/teacher', { params }),
  updateTeacherLeave: (id, data) => api.patch(`/leave/teacher/${id}`, data),
};

export const timetableAPI = {
  save: (data) => api.post('/timetable', data),
  getAll: () => api.get('/timetable'),
  getByClass: (class_code) => api.get(`/timetable/${class_code}`),
};

export const dashboardAPI = {
  admin: () => api.get('/dashboard/admin'),
  teacher: () => api.get('/dashboard/teacher'),
  student: () => api.get('/dashboard/student'),
};

export default api;
