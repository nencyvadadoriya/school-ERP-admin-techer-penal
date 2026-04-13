const StudentLeave = require('../models/StudentLeave');
const TeacherLeave = require('../models/TeacherLeave');
const Class = require('../models/Class');

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

    // If status is being changed (approve/reject), allow only admin or class teacher of that class
    const isStatusChange = typeof req.body?.status !== 'undefined' && req.body.status !== existing.status;
    if (isStatusChange) {
      if (req.user?.role !== 'admin') {
        const teacherCode = req.user?.teacher_code;
        if (!teacherCode) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const cls = await Class.findOne({ class_code: existing.class_code, is_delete: false }).select('teacher_code');
        if (!cls || cls.teacher_code !== teacherCode) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }
    }

    const data = await StudentLeave.findOneAndUpdate({ _id: req.params.id, is_delete: false }, req.body, { new: true });
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
    const data = await TeacherLeave.findOneAndUpdate({ _id: req.params.id, is_delete: false }, req.body, { new: true });
    res.json({ success: true, message: 'Updated', data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = {
  applyStudentLeave, getStudentLeaves, updateStudentLeave, deleteStudentLeave,
  applyTeacherLeave, getTeacherLeaves, updateTeacherLeave,
};
