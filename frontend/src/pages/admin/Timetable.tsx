import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { classAPI, subjectAPI, teacherAPI, timetableAPI } from '../../services/api';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';

const EMPTY = { class_code: '', day: 'Monday', periods: [] as number[], subject: '', teacher_code: '' };

// Define time slots - 6 lectures of 45 minutes each
// 3 lectures before break, 3 after break
const TIME_SLOTS = [
  { period_number: 1, start_time: '07:00', end_time: '07:45', label: 'Period 1 (07:00 - 07:45)' },
  { period_number: 2, start_time: '07:45', end_time: '08:30', label: 'Period 2 (07:45 - 08:30)' },
  { period_number: 3, start_time: '08:30', end_time: '09:15', label: 'Period 3 (08:30 - 09:15)' },
  { period_number: 4, start_time: '09:45', end_time: '10:30', label: 'Period 4 (09:45 - 10:30)' },
  { period_number: 5, start_time: '10:30', end_time: '11:15', label: 'Period 5 (10:30 - 11:15)' },
  { period_number: 6, start_time: '11:15', end_time: '12:00', label: 'Period 6 (11:15 - 12:00)' },
];

const BREAK_SLOT = { start_time: '09:15', end_time: '09:45', label: 'Break' };

const Timetable: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [metaLoading, setMetaLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY);

  const handleSubjectChange = (subjectCode: string) => {
    const matchingTeachers = teachers.filter((t) => Array.isArray(t?.subjects) && t.subjects.includes(subjectCode));
    const autoTeacherCode = matchingTeachers.length > 0 ? matchingTeachers[0].teacher_code : '';
    
    setForm((prev) => ({
      ...prev,
      subject: subjectCode,
      teacher_code: autoTeacherCode,
    }));
  };

  const togglePeriod = (pNum: number) => {
    setForm(prev => {
      const isSelected = prev.periods.includes(pNum);
      if (isSelected) {
        return { ...prev, periods: prev.periods.filter(p => p !== pNum) };
      } else {
        return { ...prev, periods: [...prev.periods, pNum] };
      }
    });
  };

  const [viewClassCode, setViewClassCode] = useState<string>('');
  const [viewTimetable, setViewTimetable] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState<boolean>(false);

  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const flattenTimetables = (timetables: any[]) => {
    const rows: any[] = [];
    (timetables || []).forEach((tt) => {
      const class_code = tt?.class_code;
      const schedule = Array.isArray(tt?.schedule) ? tt.schedule : [];
      schedule.forEach((d: any) => {
        const day = d?.day;
        const periods = Array.isArray(d?.periods) ? d.periods : [];
        periods.forEach((p: any) => {
          rows.push({
            _id: `${tt?._id || class_code}-${day}-${p?.period_number || ''}`,
            timetable_id: tt?._id,
            class_code,
            day,
            period: p?.period_number !== undefined && p?.period_number !== null ? String(p.period_number) : '',
            subject: p?.subject_code || p?.subject_name || '',
            teacher_code: p?.teacher_code || '',
            start_time: p?.start_time || '',
            end_time: p?.end_time || '',
          });
        });
      });
    });
    return rows;
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const buildTimetablePayloadFromForm = (ttId: any | undefined, f: any) => {
    const subject = subjects.find((s) => s.subject_code === f.subject);
    const teacher = teachers.find((t) => t.teacher_code === f.teacher_code);
    
    const selectedPeriods = f.periods.map((pNum: any) => {
      const slot = TIME_SLOTS.find(slot => String(slot.period_number) === String(pNum));
      return {
        period_number: slot?.period_number || Number(pNum),
        start_time: slot?.start_time || '',
        end_time: slot?.end_time || '',
        subject_code: subject?.subject_code || f.subject || undefined,
        subject_name: subject?.subject_name,
        teacher_code: teacher?.teacher_code || f.teacher_code || undefined,
        teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : undefined,
      };
    });
    
    return {
      _id: ttId,
      class_code: f.class_code,
      schedule: [
        {
          day: f.day,
          periods: selectedPeriods,
        },
      ],
    };
  };

  const fetch = async () => {
    try {
      const r = await timetableAPI.getAll();
      setItems(flattenTimetables(r.data.data || []));
    } catch (e) {
      setItems([]);
    } finally { setLoading(false); }
  };

  const fetchViewTimetable = async (classCode: string) => {
    if (!classCode) {
      setViewTimetable(null);
      return;
    }
    setViewLoading(true);
    try {
      const r = await timetableAPI.getByClass(classCode);
      setViewTimetable(r.data.data || null);
    } catch (e: any) {
      setViewTimetable(null);
    } finally {
      setViewLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [cR, tR, sR] = await Promise.all([
        classAPI.getAll(),
        teacherAPI.getAll(),
        subjectAPI.getAll(),
      ]);
      setClasses(cR.data.data || []);
      setTeachers(tR.data.data || []);
      setSubjects(sR.data.data || []);
    } catch (e: any) {
      setClasses([]);
      setTeachers([]);
      setSubjects([]);
      toast.error(e?.response?.data?.message || 'Failed to load dropdown data');
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    fetchMeta();
  }, []);

  useEffect(() => {
    if (!metaLoading && !viewClassCode && classes.length) {
      const defaultCode = getClassCode(classes[0]);
      setViewClassCode(defaultCode);
      fetchViewTimetable(defaultCode);
    }
  }, [metaLoading, classes]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (it: any) => {
    setEditing(it);
    setForm({
      class_code: it.class_code,
      day: it.day,
      periods: [Number(it.period)],
      subject: it?.subject || '',
      teacher_code: it?.teacher_code || '',
    });
    setModalOpen(true);
  };

  const getClassCode = (c: any) => {
    if (!c) return '';
    if (c.class_code) return String(c.class_code);
    const parts = [c.standard, c.division, c.medium, c.stream, c.shift]
      .map((v) => (v === undefined || v === null ? '' : String(v).trim()))
      .filter(Boolean);
    return parts.join('-');
  };

  const getClassLabel = (c: any) => {
    if (!c) return '';
    const code = getClassCode(c);
    const standard = c.standard ? String(c.standard) : '';
    const division = c.division ? String(c.division) : '';
    const medium = c.medium ? String(c.medium) : '';
    const stream = c.stream ? String(c.stream) : '';
    const shift = c.shift ? String(c.shift) : '';
    const meta = [standard && `Std ${standard}`, division && `Div ${division}`, medium, stream, shift]
      .filter(Boolean)
      .join(' | ');
    return meta ? `${code} (${meta})` : code;
  };

  const selectedClass = classes.find((c) => getClassCode(c) === form.class_code);
  const teacherOptions = form.subject
    ? teachers.filter((t) => Array.isArray(t?.subjects) && t.subjects.includes(form.subject))
    : teachers;

  const subjectOptionsRaw = selectedClass?.subjects?.length
    ? subjects.filter((s) => selectedClass.subjects.includes(s.subject_code))
    : subjects;

  const subjectOptions = subjectOptionsRaw.filter((s, idx, arr) => {
    const key = s?.subject_code || s?._id || s?.subject_name;
    return arr.findIndex((x) => (x?.subject_code || x?._id || x?.subject_name) === key) === idx;
  });

  const getSubjectLabelByCode = (code: any) => {
    if (!code) return '';
    const s = subjects.find((x) => x.subject_code === code);
    return s ? `${s.subject_name} (${s.subject_code})` : String(code);
  };

  const getTeacherLabelByCode = (code: any) => {
    if (!code) return '';
    const t = teachers.find((x) => x.teacher_code === code);
    return t ? `${t.first_name} ${t.last_name} (${t.teacher_code})` : String(code);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const payload: any = buildTimetablePayloadFromForm(editing?.timetable_id, form);
      if (editing) {
        payload.old_day = editing.day;
        payload.old_period_number = Number(editing.period);
      }
      await timetableAPI.save(payload);
      toast.success(editing ? 'Timetable updated' : 'Timetable saved');
      closeModal();
      await fetch();
      if (viewClassCode) {
        await fetchViewTimetable(viewClassCode);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (it: any) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await timetableAPI.deleteEntry({
        class_code: it.class_code,
        day: it.day,
        period_number: Number(it.period)
      });
      toast.success('Entry deleted');
      await fetch();
      if (viewClassCode) {
        await fetchViewTimetable(viewClassCode);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error deleting entry');
    }
  };

  if (loading) return <Spinner />;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const viewSchedule = Array.isArray(viewTimetable?.schedule) ? viewTimetable.schedule : [];
  const allPeriods: any[] = [];
  viewSchedule.forEach((d: any) => {
    (Array.isArray(d?.periods) ? d.periods : []).forEach((p: any) => allPeriods.push({ day: d.day, ...p }));
  });

  // Use predefined slots for display
  const slots = TIME_SLOTS.map(slot => ({
    key: `period-${slot.period_number}`,
    start_time: slot.start_time,
    end_time: slot.end_time,
    period_number: slot.period_number,
  }));

  const getCell = (day: string, slot: any) => {
    return allPeriods.find((p: any) => {
      if (String(p.day) !== String(day)) return false;
      return Number(p.period_number) === Number(slot.period_number);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
          <p className="text-sm text-gray-500">Manage timetables for classes (6 periods: 3 before break, 3 after break)</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><FaPlus />Add Entry</button>
      </div>

    

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="w-full md:w-80">
            <label className="block text-sm font-medium text-gray-700 mb-1">View Timetable (Class)</label>
            <select
              className="input-field"
              value={viewClassCode}
              onChange={(e) => {
                const next = e.target.value;
                setViewClassCode(next);
                fetchViewTimetable(next);
              }}
              disabled={metaLoading}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c._id || getClassCode(c)} value={getClassCode(c)}>
                  {getClassLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-500">
            {viewLoading ? 'Loading timetable...' : viewTimetable ? `Showing: ${viewTimetable.class_code}` : 'No timetable selected'}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {viewLoading ? (
            <div className="py-10"><Spinner /></div>
          ) : !viewTimetable ? (
            <div className="text-center py-10 text-gray-400">No timetable found for this class</div>
          ) : (
            <table className="min-w-full text-xs border border-gray-100">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-2 border-b border-gray-100 text-left whitespace-nowrap">Time / Period</th>
                  {days.map((d) => (
                    <th key={d} className="px-3 py-2 border-b border-gray-100 text-left whitespace-nowrap">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Periods 1-3 (Before Break) */}
                {slots.slice(0, 3).map((slot) => (
                  <tr key={slot.key} className="border-t border-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                      <div>Period {slot.period_number}</div>
                      <div className="text-xs text-gray-400">{slot.start_time} - {slot.end_time}</div>
                    </td>
                    {days.map((d) => {
                      const cell = getCell(d, slot);
                      const subj = cell?.subject_name || cell?.subject_code;
                      const tname = cell?.teacher_name || cell?.teacher_code;
                      return (
                        <td key={d} className="px-3 py-2 align-top border-l border-gray-50 min-w-[160px]">
                          {cell ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-gray-900">{subj || '—'}</div>
                              <div className="text-gray-500 text-xs">{tname || '—'}</div>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Break Row */}
                <tr className="bg-blue-50">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                    <div>BREAK</div>
                    <div className="text-xs text-gray-500">{BREAK_SLOT.start_time} - {BREAK_SLOT.end_time}</div>
                  </td>
                  {days.map((d) => (
                    <td key={d} className="px-3 py-2  text-blue-600 text-sm">
                         Break
                    </td>
                  ))}
                </tr>

                {/* Periods 4-6 (After Break) */}
                {slots.slice(3, 6).map((slot) => (
                  <tr key={slot.key} className="border-t border-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                      <div>Period {slot.period_number}</div>
                      <div className="text-xs text-gray-400">{slot.start_time} - {slot.end_time}</div>
                    </td>
                    {days.map((d) => {
                      const cell = getCell(d, slot);
                      const subj = cell?.subject_name || cell?.subject_code;
                      const tname = cell?.teacher_name || cell?.teacher_code;
                      return (
                        <td key={d} className="px-3 py-2 align-top border-l border-gray-50 min-w-[160px]">
                          {cell ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-gray-900">{subj || '—'}</div>
                              <div className="text-gray-500 text-xs">{tname || '—'}</div>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-3 font-medium">Class</th>
                <th className="pb-3 font-medium">Day</th>
                <th className="pb-3 font-medium">Period</th>
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Subject</th>
                <th className="pb-3 font-medium">Teacher</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No timetable entries</td></tr>
              ) : (
                items.map(it => {
                  const slotInfo = TIME_SLOTS.find(s => String(s.period_number) === String(it.period));
                  return (
                    <tr key={it._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 font-medium text-primary-600">
                        {getClassLabel(classes.find((c) => getClassCode(c) === it.class_code) || { class_code: it.class_code })}
                      </td>
                      <td className="py-3">{it.day || '—'}</td>
                      <td className="py-3">{it.period || '—'}</td>
                      <td className="py-3 text-xs text-gray-500">
                        {slotInfo ? `${slotInfo.start_time} - ${slotInfo.end_time}` : '—'}
                      </td>
                      <td className="py-3">{getSubjectLabelByCode(it.subject) || it.subject || '—'}</td>
                      <td className="py-3">{it.teacher_code ? getTeacherLabelByCode(it.teacher_code) : '—'}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button onClick={()=>openEdit(it)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><FaEdit /></button>
                          <button onClick={()=>handleDelete(it)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit Entry' : 'Add Timetable Entry'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Code</label>
              <select
                className="input-field"
                required
                value={form.class_code}
                onChange={(e) => {
                  const nextClass = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    class_code: nextClass,
                    subject: '',
                    teacher_code: prev.teacher_code,
                  }));
                }}
                disabled={metaLoading || Boolean(editing)}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c._id || getClassCode(c)} value={getClassCode(c)}>
                    {getClassLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
              <select className="input-field" value={form.day} onChange={e=>setForm({...form,day:e.target.value})} disabled={Boolean(editing)}>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=> <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Periods (Bulk Select)</label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-gray-50">
                {TIME_SLOTS.map(slot => {
                  const isSelected = form.periods.includes(slot.period_number);
                  return (
                    <button
                      key={slot.period_number}
                      type="button"
                      onClick={() => togglePeriod(slot.period_number)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isSelected 
                          ? 'bg-primary-600 text-white' 
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      P{slot.period_number}
                    </button>
                  );
                })}
              </div>
              {form.periods.length === 0 && <p className="text-[10px] text-red-500 mt-1">Select at least one period</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                className="input-field"
                value={form.subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                disabled={metaLoading}
                required
              >
                <option value="">Select subject</option>
                {subjectOptions.map((s) => (
                  <option key={s._id} value={s.subject_code}>
                    {s.subject_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Code</label>
              <select
                className="input-field"
                value={form.teacher_code}
                onChange={(e) => setForm({ ...form, teacher_code: e.target.value })}
                disabled={metaLoading}
                required
              >
                <option value="">Select teacher</option>
                {teacherOptions.map((t) => (
                  <option key={t._id} value={t.teacher_code}>
                    {t.first_name} {t.last_name} ({t.teacher_code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Save</button>
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Timetable;