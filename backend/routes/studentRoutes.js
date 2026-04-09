const express = require('express');
const router = express.Router();
const {
  registerStudent,
  bulkCreateStudents,
  loginStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.post('/login', loginStudent);

// Admin only routes
router.post('/register', auth, adminAuth, upload.single('profile_image'), registerStudent);
router.post('/bulk', auth, adminAuth, bulkCreateStudents);
router.delete('/:id', auth, adminAuth, deleteStudent);

// Protected routes
router.get('/', auth, getAllStudents);
router.get('/:id', auth, getStudentById);
router.patch('/:id', auth, upload.single('profile_image'), updateStudent);

module.exports = router;
