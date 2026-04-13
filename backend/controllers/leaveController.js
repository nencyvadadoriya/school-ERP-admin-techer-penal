const StudentLeave = require('../models/StudentLeave');
const TeacherLeave = require('../models/TeacherLeave');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');

// Normalize: remove all non-alphanumeric chars and lowercase
const normalizeCode = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Check if two class codes refer to the same class using multiple strategies
// Handles: "1A-English" vs "STD-1-A-English-Primary-Morning" vs "1-A-English"
const classCodesMatch = (codeA, codeB) => {
  if (!codeA || !codeB) return false;

  const a = String(codeA).trim();
  const b = String(codeB).trim();

  // 1. Exact match
  if (a === b) return true;

  // 2. Normalized full match
  if (normalizeCode(a) === normalizeCode(b)) return true;

  // Helper: strip STD- prefix and get segments
  const getSegments = (code) => {
    const stripped = code.replace(/^STD-/i, '');
    return stripped.split('-').filter(Boolean);
  };

  // 3. First 3 segments match (standard-division-medium)
  const segA = getSegments(a);
  const segB = getSegments(b);
  const shortA = segA.slice(0, 3).join('-').toLowerCase();
  const shortB = segB.slice(0, 3).join('-').toLowerCase();
  if (shortA && shortB && shortA === shortB) return true;

  // 4. Normalized first-3 segments match
  if (normalizeCode(shortA) === normalizeCode(shortB)) return true;

  // 5. One code contains the other (substring — handles prefix mismatches)
  const normA = normalizeCode(a);
  const normB = normalizeCode(b);
  if (normA.includes(normB) || normB.includes(normA)) return true;

  return false;
};

// Student Leave
const applyStudentLeave = async (req, res) => {
  try {
    const leave = await StudentLeave.create(req.body);
    res.status(201).json({ success: true, message: 'Leave applied', data: leave });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getStudentLeaves = async (req, res) => {
  try {
    const { gr_number, status, class_code } = req.query;
    const filter = { is_delete: false };
    if (gr_number) filter.gr_number = gr_number;
    if (status) filter.status = status;
    if (class_code) filter.class_code = class_code;
    const data = await StudentLeave.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateStudentLeave = async (req, res) => {
  try {
    const existing = await StudentLeave.findOne({ _id: req.params.id, is_delete: false });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    // If status is being changed (approve/reject), check teacher authorization
    const isStatusChange = typeof req.body?.status !== 'undefined' && req.body.status !== existing.status;
    if (isStatusChange) {
      if (req.user?.role !== 'admin') {
        const teacherCode = req.user?.teacher_code;
        if (!teacherCode) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const leaveClassCode = existing.class_code;
        let isAuthorized = false;

        // Check 1: Teacher is set as primary teacher on the Class document
        // Try both exact and fuzzy match on class_code
        const allClasses = await Class.find({ is_delete: false }).select('class_code teacher_code _id').lean();
        const matchedClass = allClasses.find(c => classCodesMatch(c.class_code, leaveClassCode));

        if (matchedClass && matchedClass.teacher_code === teacherCode) {
          isAuthorized = true;
        }

        if (!isAuthorized) {
          // Check 2: Teacher's assigned_class array contains a code that matches leaveClassCode
          const teacher = await Teacher.findOne({ teacher_code: teacherCode, is_delete: false })
            .select('assigned_class subject_assignments')
            .lean();

          const assignedCodes = Array.isArray(teacher?.assigned_class) ? teacher.assigned_class : [];
          const isAssigned = assignedCodes.some(code => classCodesMatch(code, leaveClassCode));

          if (isAssigned) {
            isAuthorized = true;
          }

          if (!isAuthorized) {
            // Check 3: Teacher is assigned via subject_assignments for a class matching leaveClassCode
            const subjectAssignments = Array.isArray(teacher?.subject_assignments) ? teacher.subject_assignments : [];
            if (matchedClass) {
              const isSubjectTeacher = subjectAssignments.some(
                (sa) => String(sa.class_id) === String(matchedClass._id)
              );
              if (isSubjectTeacher) isAuthorized = true;
            }
          }
        }

        if (!isAuthorized) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You are not the class teacher for this class.',
          });
        }
      }
    }

    const data = await StudentLeave.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      req.body,
      { new: true }
    );
    res.json({ success: true, message: 'Updated', data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteStudentLeave = async (req, res) => {
  try {
    await StudentLeave.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Teacher Leave
const applyTeacherLeave = async (req, res) => {
  try {
    const leave = await TeacherLeave.create(req.body);
    res.status(201).json({ success: true, message: 'Leave applied', data: leave });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getTeacherLeaves = async (req, res) => {
  try {
    const { teacher_code, status } = req.query;
    const filter = { is_delete: false };
    if (teacher_code) filter.teacher_code = teacher_code;
    if (status) filter.status = status;
    const data = await TeacherLeave.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateTeacherLeave = async (req, res) => {
  try {
    const data = await TeacherLeave.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      req.body,
      { new: true }
    );
    res.json({ success: true, message: 'Updated', data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = {
  applyStudentLeave, getStudentLeaves, updateStudentLeave, deleteStudentLeave,
  applyTeacherLeave, getTeacherLeaves, updateTeacherLeave,
};