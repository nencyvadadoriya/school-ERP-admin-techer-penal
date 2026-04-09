const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Class = require('../models/Class');
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

const bulkCreateStudents = async (req, res) => {
  try {
    const { classId, medium, std, class_code, shift, stream, default_password, students } = req.body;

    let resolvedStd = std;
    let resolvedClassCode = class_code;
    let resolvedShift = shift;
    let resolvedStream = stream;

    if (classId) {
      const classDoc = await Class.findOne({ _id: classId, is_delete: false });
      if (!classDoc) {
        return res.status(400).json({ success: false, message: 'Invalid classId' });
      }

      if (medium && String(medium) !== String(classDoc.medium)) {
        return res.status(400).json({ success: false, message: 'Invalid medium for selected class' });
      }

      resolvedStd = String(classDoc.standard);
      resolvedClassCode = `${classDoc.standard}${classDoc.division}-${classDoc.medium}`;
      resolvedShift = resolvedShift || classDoc.shift;
      resolvedStream = resolvedStream || classDoc.stream;
    }

    if (!resolvedStd) {
      return res.status(400).json({ success: false, message: 'std is required' });
    }
    if (!resolvedClassCode) {
      return res.status(400).json({ success: false, message: 'class_code is required' });
    }
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'students array is required' });
    }

    const year = new Date().getFullYear();
    const baseCount = await Student.countDocuments();

    const errors = [];
    const docs = [];
    const generatedCredentials = [];
    const inputIndexByDocIndex = [];

    for (let i = 0; i < students.length; i++) {
      const row = students[i] || {};
      const first_name = typeof row.first_name === 'string' ? row.first_name.trim() : row.first_name;
      const middle_name = typeof row.middle_name === 'string' ? row.middle_name.trim() : row.middle_name;
      const last_name = typeof row.last_name === 'string' ? row.last_name.trim() : row.last_name;
      const roll_no = typeof row.roll_no === 'string' ? row.roll_no.trim() : row.roll_no;

      if (!first_name) {
        errors.push({ index: i, message: 'first_name is required' });
        continue;
      }
      if (!last_name) {
        errors.push({ index: i, message: 'last_name is required' });
        continue;
      }

      const gr_number = `GR${year}${String(baseCount + docs.length + 1).padStart(5, '0')}`;

      let plainPassword = row.password || default_password;
      if (!plainPassword) {
        plainPassword = Math.random().toString(36).slice(-8);
        generatedCredentials.push({ index: i, gr_number, password: plainPassword });
      }

      const hashedPassword = await bcrypt.hash(String(plainPassword), 10);

      inputIndexByDocIndex.push(i);
      docs.push({
        gr_number,
        std: String(resolvedStd),
        roll_no,
        first_name,
        middle_name,
        last_name,
        gender: row.gender,
        phone1: row.phone1,
        phone2: row.phone2,
        address: row.address,
        pin: row.pin,
        class_code: String(resolvedClassCode),
        password: hashedPassword,
        profile_image: null,
        fees: typeof row.fees !== 'undefined' ? Number(row.fees) : 0,
        shift: row.shift || resolvedShift,
        stream: row.stream || resolvedStream,
      });
    }

    if (docs.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid students to create', errors });
    }

    let created = [];
    try {
      created = await Student.insertMany(docs, { ordered: false });
    } catch (error) {
      if (error?.writeErrors && Array.isArray(error.writeErrors)) {
        error.writeErrors.forEach((we) => {
          const inputIndex = typeof we.index === 'number' ? (inputIndexByDocIndex[we.index] ?? we.index) : we.index;
          errors.push({
            index: inputIndex,
            message: we?.errmsg || we?.error?.message || 'Duplicate value / validation failed',
          });
        });
        created = error.insertedDocs || [];
      } else {
        throw error;
      }
    }

    const createdSanitized = created.map((s) => {
      const obj = s.toObject ? s.toObject() : s;
      if (obj && obj.password) delete obj.password;
      return obj;
    });

    return res.status(201).json({
      success: true,
      message: 'Bulk students created',
      count: createdSanitized.length,
      data: createdSanitized,
      errors,
      generated_credentials: generatedCredentials,
    });
  } catch (error) {
    console.error('Error in bulkCreateStudents:', error);
    res.status(500).json({ success: false, message: error.message });
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
    const { class_code } = req.query;
    const filter = { is_delete: false };
    if (class_code) filter.class_code = String(class_code);

    const students = await Student.find(filter)
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
  bulkCreateStudents,
  loginStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};
