const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
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
      class_name,
      password,
      fees,
      shift,
      medium,
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
      class_name,
      class_code: class_code ? String(class_code).trim() : null,
      password: hashedPassword,
      profile_image: profileImageUrl,
      fees: fees || 0,
      shift,
      medium,
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
    
    console.log('Bulk Create Request Body:', JSON.stringify(req.body, null, 2));

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'students array is required' });
    }

    const year = new Date().getFullYear();
    const baseCount = await Student.countDocuments();

    const errors = [];
    const docs = [];
    const generatedCredentials = [];
    const inputIndexByDocIndex = [];

    // Fetch all classes to find matching class_code based on std
    const allClasses = await Class.find({ is_delete: false }).lean();

    for (let i = 0; i < students.length; i++) {
      const row = students[i] || {};
      const first_name = typeof row.first_name === 'string' ? row.first_name.trim() : row.first_name;
      const middle_name = typeof row.middle_name === 'string' ? row.middle_name.trim() : row.middle_name;
      const last_name = typeof row.last_name === 'string' ? row.last_name.trim() : row.last_name;
      const roll_no = typeof row.roll_no === 'string' ? row.roll_no.trim() : row.roll_no;
      const rowStd = row.std || std;
      const rowMedium = row.medium || medium;

      if (!first_name) {
        errors.push({ index: i, message: 'first_name is required' });
        continue;
      }
      if (!last_name) {
        errors.push({ index: i, message: 'last_name is required' });
        continue;
      }
      if (!rowStd) {
        errors.push({ index: i, message: 'std is required' });
        continue;
      }

      // Try to find a matching class for this student's standard AND division (class_name)
      const matchingClass = allClasses.find(c => 
        String(c.standard) === String(rowStd) && 
        String(c.division || '').toUpperCase() === String(row.class_name || '').toUpperCase()
      );
      
      const resolvedClassCode = matchingClass ? matchingClass.class_code : (class_code || `${rowStd}-${row.class_name || 'A'}-English`);

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
        std: String(rowStd),
        roll_no: String(row.roll_no || '').trim(),
        first_name,
        middle_name,
        last_name,
        gender: row.gender || 'Other',
        phone1: row.phone1,
        phone2: row.phone2,
        address: row.address,
        pin: row.pin,
        class_name: row.class_name,
        class_code: String(resolvedClassCode),
        medium: rowMedium || matchingClass?.medium || 'English',
        password: hashedPassword,
        profile_image: null,
        fees: typeof row.fees !== 'undefined' ? Number(row.fees) : (matchingClass?.fees || 0),
        shift: row.shift || shift || matchingClass?.shift || 'Morning',
        stream: row.stream || stream || matchingClass?.stream || 'Primary',
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

    // Role-aware filtering:
    // - admin: can see all students (optionally by class_code)
    // - teacher: can only see students whose class_code is within teacher.assigned_class
    const role = req.user?.role;
    console.log('getAllStudents request:', { role, class_code, user: req.user });
    if (role === 'teacher') {
      const teacherId = req.user?.id;
      const teacher = teacherId
        ? await Teacher.findOne({ _id: teacherId, is_delete: false }).select('assigned_class').lean()
        : null;
      const assigned = Array.isArray(teacher?.assigned_class) ? teacher.assigned_class.filter(Boolean) : [];

      if (assigned.length === 0) {
        console.log('Teacher has no assigned classes');
        return res.json({ success: true, count: 0, data: [] });
      }

      const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const assignedNormalized = assigned.map(normalize);

      // Only allow teacher to query within their own assigned classes
      if (class_code) {
        const requested = String(class_code);
        const requestedNormalized = normalize(requested);
        
      const isAuthorized = assignedNormalized.includes(requestedNormalized) || assigned.includes(requested) || assigned.some(a => {
            const normalizedA = normalize(a);
            if (normalizedA.includes(requestedNormalized) || requestedNormalized.includes(normalizedA)) return true;
            
            const parts = requested.split('-');
            if (parts.length >= 3) {
              const std = parts[1];
              const div = parts[2];
              return a.includes(`${std}-${div}`) || a.includes(`${std}${div}`);
            }
            return false;
        });

        if (!isAuthorized) {
          console.log(`Teacher not authorized for class ${requested}. Assigned:`, assigned);
          return res.json({ success: true, count: 0, data: [] });
        }
        
        // Find students with normalized class_code OR matching components
        const allStudents = await Student.find({ is_delete: false, is_active: true }).select('-password').lean();
        
        let requestedStd = '';
        let requestedDiv = '';
        const parts = requested.split('-');
        if (parts.length >= 3) {
          requestedStd = String(parts[1]); // "1"
          requestedDiv = String(parts[2]); // "A"
        }

        const students = allStudents.filter(s => {
          const sc = normalize(s.class_code);
          // 1. Exact or normalized match
          if (sc === requestedNormalized || s.class_code === requested) return true;

          // 2. Component matching (Standard & Division)
          const sStd = String(s.std || s.standard || '');
          const sDiv = String(s.division || '');
          if (requestedStd && requestedDiv) {
            if (sStd === requestedStd && sDiv === requestedDiv) return true;
          }

          // 3. Fallback: Substring matching
          if (sc && requestedNormalized && (sc.includes(requestedNormalized) || requestedNormalized.includes(sc))) return true;

          return false;
        });

        return res.json({
          success: true,
          count: students.length,
          data: students,
        });
      } else {
        filter.class_code = { $in: assigned };
      }
    } else {
      // default/admin behavior
      if (class_code) filter.class_code = String(class_code);
    }

    const students = await Student.find(filter)
      .select('-password')
      .sort({ roll_no: 1, createdAt: 1 });

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

    let classDetails = null;
    if (student?.class_code) {
      const studentClassCode = String(student.class_code).trim();

      // 1) Exact match
      classDetails = await Class.findOne({ class_code: studentClassCode, is_delete: false })
        .select('class_code standard division medium shift stream')
        .lean();

      // 2) If student stores only short code like "1-A", try matching any class starting with "1-A-"
      if (!classDetails) {
        const m = studentClassCode.match(/^(\d+)\s*-?\s*([A-Za-z])\b/);
        if (m) {
          const std = String(m[1]);
          const div = String(m[2]).toUpperCase();
          classDetails = await Class.findOne({ standard: std, division: div, is_delete: false })
            .select('class_code standard division medium shift stream')
            .lean();
        }
      }

      // 3) Final fallback: normalized compare against all classes
      if (!classDetails) {
        const all = await Class.find({ is_delete: false })
          .select('class_code standard division medium shift stream')
          .lean();
        const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = normalize(studentClassCode);
        classDetails = all.find((c) => normalize(c.class_code) === target) || null;
      }
    }

    const payload = student.toObject ? student.toObject() : student;
    if (classDetails) {
      payload.class_details = classDetails;
      if (!payload.shift && classDetails.shift) payload.shift = classDetails.shift;
      if (!payload.stream && classDetails.stream) payload.stream = classDetails.stream;
    }

    res.json({
      success: true,
      data: payload,
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
      class_name,
      fees,
      shift,
      medium,
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
    student.class_name = class_name;
    student.profile_image = profileImageUrl;
    student.fees = fees;
    student.shift = shift;
    student.medium = medium;
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
