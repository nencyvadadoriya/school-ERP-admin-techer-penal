const TimeTable = require('../models/TimeTable');

const createOrUpdateTimetable = async (req, res) => {
  try {
    const { class_code } = req.body;
    const tt = await TimeTable.findOneAndUpdate(
      { class_code, is_delete: false },
      req.body,
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, message: 'Timetable saved', data: tt });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getTimetableByClass = async (req, res) => {
  try {
    const { class_code } = req.params;
    const data = await TimeTable.findOne({ class_code, is_delete: false });
    if (!data) return res.status(404).json({ success: false, message: 'Timetable not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAllTimetables = async (req, res) => {
  try {
    const data = await TimeTable.find({ is_delete: false });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { createOrUpdateTimetable, getTimetableByClass, getAllTimetables };
