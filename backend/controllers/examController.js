const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Notification = require('../models/Notification');

const createExam = async (req, res) => {
  try {
    const exam = await Exam.create(req.body);
    
    // Add Notification for Teachers and Students
    try {
      // 1. Notify all Teachers
      await Notification.create({
        title: 'New Exam Added',
        message: `A new exam "${exam.exam_name}" has been scheduled for class ${exam.class_code} on ${new Date(exam.exam_date).toLocaleDateString()}.`,
        recipient_type: 'Teacher'
      });

      // 2. Notify Students of the specific class
      await Notification.create({
        title: 'New Exam Scheduled',
        message: `Your exam "${exam.exam_name}" for subject ${exam.subject_code} is scheduled for ${new Date(exam.exam_date).toLocaleDateString()}.`,
        recipient_type: 'Class',
        recipient_id: exam.class_code
      });
    } catch (notificationError) {
      console.error('Failed to create notifications:', notificationError);
      // We don't want to fail the exam creation if notification fails
    }

    res.status(201).json({ success: true, message: 'Exam created', data: exam });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAllExams = async (req, res) => {
  try {
    const { class_code, teacher_code } = req.query;
    const filter = { is_delete: false };
    if (class_code) filter.class_code = class_code;
    if (teacher_code) filter.teacher_code = teacher_code;
    const data = await Exam.find(filter).sort({ exam_date: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getExamById = async (req, res) => {
  try {
    const data = await Exam.findOne({ _id: req.params.id, is_delete: false });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateExam = async (req, res) => {
  try {
    const data = await Exam.findOneAndUpdate({ _id: req.params.id, is_delete: false }, req.body, { new: true });
    res.json({ success: true, message: 'Updated', data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteExam = async (req, res) => {
  try {
    await Exam.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Results
const submitResult = async (req, res) => {
  try {
    const { exam_id, student_id, gr_number, class_code, subject_code, marks_obtained, total_marks, remarks } = req.body;
    const percentage = (marks_obtained / total_marks) * 100;
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';
    else if (percentage >= 35) grade = 'E';

    const result = await ExamResult.findOneAndUpdate(
      { exam_id, student_id, is_delete: false },
      { exam_id, student_id, gr_number, class_code, subject_code, marks_obtained, total_marks, grade, remarks },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, message: 'Result saved', data: result });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getResults = async (req, res) => {
  try {
    const { exam_id, student_id, gr_number, class_code } = req.query;
    const filter = { is_delete: false };
    if (exam_id) filter.exam_id = exam_id;
    if (student_id) filter.student_id = student_id;
    if (gr_number) filter.gr_number = gr_number;
    if (class_code) filter.class_code = class_code;
    const data = await ExamResult.find(filter).populate('exam_id').populate('student_id', '-password');
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { createExam, getAllExams, getExamById, updateExam, deleteExam, submitResult, getResults };
