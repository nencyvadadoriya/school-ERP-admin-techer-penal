const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

// Mark / Create Attendance
const markAttendance = async (req, res) => {
  try {
    const { class_code, subject_code, teacher_code, date, records } = req.body;
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Upsert for the day
    const existing = await Attendance.findOne({ class_code, date: attendanceDate, is_delete: false });
    if (existing) {
      existing.records = records;
      existing.subject_code = subject_code;
      existing.teacher_code = teacher_code;
      await existing.save();
      return res.json({ success: true, message: 'Attendance updated', data: existing });
    }

    const attendance = await Attendance.create({ class_code, subject_code, teacher_code, date: attendanceDate, records });
    res.status(201).json({ success: true, message: 'Attendance marked', data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance by class & date range
const getAttendance = async (req, res) => {
  try {
    const { class_code, from, to } = req.query;
    const filter = { is_delete: false };
    if (class_code) filter.class_code = class_code;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const data = await Attendance.find(filter).sort({ date: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance summary for a student
const getStudentAttendance = async (req, res) => {
  try {
    const { student_id, gr_number } = req.query;
    const records = await Attendance.find({ is_delete: false });
    let present = 0, absent = 0, total = 0;
    records.forEach(att => {
      const rec = att.records.find(r => r.gr_number === gr_number || String(r.student_id) === student_id);
      if (rec) {
        total++;
        if (rec.status === 'Present' || rec.status === 'Late') present++;
        else absent++;
      }
    });
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    res.json({ success: true, data: { present, absent, total, percentage } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
const deleteAttendance = async (req, res) => {
  try {
    await Attendance.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { markAttendance, getAttendance, getStudentAttendance, deleteAttendance };
