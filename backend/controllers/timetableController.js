const TimeTable = require('../models/TimeTable');

const createOrUpdateTimetable = async (req, res) => {
  try {
    const { class_code, schedule, old_day, old_period_number } = req.body;
    if (!class_code || !schedule || !schedule.length) {
      return res.status(400).json({ success: false, message: 'Class code and schedule are required' });
    }

    const newDayEntry = schedule[0];
    const newPeriod = newDayEntry.periods[0];
    const targetDay = newDayEntry?.day;
    const targetPeriodNumber = newPeriod?.period_number;

    if (!targetDay) {
      return res.status(400).json({ success: false, message: 'Day is required' });
    }
    if (targetPeriodNumber === undefined || targetPeriodNumber === null || Number.isNaN(Number(targetPeriodNumber))) {
      return res.status(400).json({ success: false, message: 'period_number is required' });
    }

    let tt = await TimeTable.findOne({ class_code, is_delete: false });

    if (!tt) {
      tt = new TimeTable({
        class_code,
        schedule: [newDayEntry],
      });
    } else {
      const dayIndex = tt.schedule.findIndex(s => s.day === newDayEntry.day);
      if (dayIndex > -1) {
        const periodIndex = tt.schedule[dayIndex].periods.findIndex(p => Number(p.period_number) === Number(targetPeriodNumber));
        if (periodIndex > -1) tt.schedule[dayIndex].periods[periodIndex] = newPeriod;
        else tt.schedule[dayIndex].periods.push(newPeriod);

        tt.schedule[dayIndex].periods.sort((a, b) => Number(a.period_number) - Number(b.period_number));
      } else {
        tt.schedule.push(newDayEntry);
      }
    }

    // If this is an edit that moved the slot, remove old slot to avoid duplicates
    if (
      old_day &&
      (String(old_day) !== String(targetDay) || (old_period_number !== undefined && old_period_number !== null && Number(old_period_number) !== Number(targetPeriodNumber)))
    ) {
      const oldDayIdx = tt.schedule.findIndex((s) => s.day === old_day);
      if (oldDayIdx > -1) {
        tt.schedule[oldDayIdx].periods = (tt.schedule[oldDayIdx].periods || []).filter(
          (p) => Number(p.period_number) !== Number(old_period_number)
        );
        if (tt.schedule[oldDayIdx].periods.length === 0) {
          tt.schedule.splice(oldDayIdx, 1);
        }
      }
    }

    await tt.save();
    res.status(201).json({ success: true, message: 'Timetable saved', data: tt });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
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

const deleteTimetableEntry = async (req, res) => {
  try {
    const { class_code, day, period_number } = req.body;
    const tt = await TimeTable.findOne({ class_code, is_delete: false });
    if (!tt) return res.status(404).json({ success: false, message: 'Timetable not found' });

    const dayIndex = tt.schedule.findIndex(s => s.day === day);
    if (dayIndex > -1) {
      tt.schedule[dayIndex].periods = tt.schedule[dayIndex].periods.filter(
        p => String(p.period_number) !== String(period_number)
      );
      if (tt.schedule[dayIndex].periods.length === 0) {
        tt.schedule.splice(dayIndex, 1);
      }
      await tt.save();
      return res.json({ success: true, message: 'Entry deleted' });
    }
    res.status(404).json({ success: false, message: 'Day not found in schedule' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { createOrUpdateTimetable, getTimetableByClass, getAllTimetables, deleteTimetableEntry };
