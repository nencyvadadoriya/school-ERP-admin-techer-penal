const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const { uploadToCloudinary } = require('../config/cloudinary');

// Generate GR Number
const generateGRNumber = async () => {
  const count = await Student.countDocuments();
  const year = new Date().getFullYear();
  return `GR${year}${String(count + 1).padStart(5, '0')}`;
};

// Register Student
const registerStudent = async (req, res) => {
  try {
    const {
      std,
      roll_no,
      first_name,
      middle_name,
      last_name,
      gender,
      phone1,
      phone2,
      address,
      pin,
      class_code,
      password,
      fees,
      shift,
      stream,
    } = req.body;


    // Generate GR number
    const gr_number = await generateGRNumber();

    // Ensure password exists; if not provided, auto-generate a temporary one
    let plainPassword = password;
    if (!plainPassword) {
      plainPassword = Math.random().toString(36).slice(-8);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Handle profile image upload
    let profileImageUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/students');
      profileImageUrl = uploadResult.url;
    }

    // Create student
    const student = await Student.create({
      gr_number,
      std,
      roll_no,
      first_name,
      middle_name,
      last_name,
      gender,
      phone1,
      phone2,
      address,
      pin,
      class_code,
      password: hashedPassword,
      profile_image: profileImageUrl,
      fees: fees || 0,
      shift,
      stream,
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: student._id, gr_number: student.gr_number, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    const studentResponse = student.toObject();
    delete studentResponse.password;

    const responsePayload = {
      success: true,
      message: 'Student registered successfully',
      data: studentResponse,
      token,
    };

    if (!password) {
      responsePayload.generated_password = plainPassword;
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error('Error in registerStudent:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    if (error.code === 11000) {
      const dupKey = Object.keys(error.keyValue || {}).join(', ');
      return res.status(400).json({ success: false, message: `Duplicate value for field(s): ${dupKey}` });
    }

    res.status(500).json({
      success: false,
      message: 'Error registering student',
      error: error.message,
    });
  }
};

// Login Student
const loginStudent = async (req, res) => {
  try {
    const { gr_number, password } = req.body;

    // Find student
    const student = await Student.findOne({ gr_number, is_delete: false });

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid GR number or password',
      });
    }

    // Check if account is active
    if (!student.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, student.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid GR number or password',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: student._id, gr_number: student.gr_number, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: studentResponse,
      token,
    });
  } catch (error) {
    console.error('Error in loginStudent:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

// Get All Students
const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find({ is_delete: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message,
    });
  }
};

// Get Single Student
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findOne({ _id: id, is_delete: false }).select('-password');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error('Error in getStudentById:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student',
      error: error.message,
    });
  }
};

// Update Student
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      std,
      roll_no,
      first_name,
      middle_name,
      last_name,
      gender,
      phone1,
      phone2,
      address,
      pin,
      class_code,
      fees,
      shift,
      stream,
      is_active,
    } = req.body;

    // Check if student exists
    const student = await Student.findOne({ _id: id, is_delete: false });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Handle profile image upload
    let profileImageUrl = student.profile_image;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/students');
      profileImageUrl = uploadResult.url;
    }

    // Update student
    student.std = std;
    student.roll_no = roll_no;
    student.first_name = first_name;
    student.middle_name = middle_name;
    student.last_name = last_name;
    student.gender = gender;
    student.phone1 = phone1;
    student.phone2 = phone2;
    student.address = address;
    student.pin = pin;
    student.class_code = class_code;
    student.profile_image = profileImageUrl;
    student.fees = fees;
    student.shift = shift;
    student.stream = stream;
    student.is_active = is_active;

    await student.save();

    // Remove password from response
    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: studentResponse,
    });
  } catch (error) {
    console.error('Error in updateStudent:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: error.message,
    });
  }
};

// Delete Student (Soft Delete)
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if student exists
    const student = await Student.findOne({ _id: id, is_delete: false });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Soft delete
    student.is_delete = true;
    await student.save();

    res.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteStudent:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message,
    });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};
