import React, { useState, useEffect } from 'react';
import { timetableAPI, classAPI, subjectAPI, teacherAPI } from '../../services/api';
import Spinner from '../../components/Spinner';
import { toast } from 'react-toastify';

const TeacherTimetable: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
            class_code,
            day,
            period: p?.period_number !== undefined && p?.period_number !== null ? String(p.period_number) : '',
            subject: p?.subject_code || p?.subject_name || '',
            teacher_code: p?.teacher_code || '',
          });
        });
      });
    });
    return rows;
  };

  const fetch = async () => {
    try {
      const r = await timetableAPI.getAll();
      setItems(flattenTimetables(r.data.data || []));
    } catch (e) {
      setItems([]);
    } finally { setLoading(false); }
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
      toast.error('Failed to load metadata');
    }
  };

  useEffect(() => {
    fetch();
    fetchMeta();
  }, []);

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

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Class Timetable</h1>
        <p className="text-sm text-gray-500">View class schedules and periods</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-3 font-medium">Class</th>
                <th className="pb-3 font-medium">Day</th>
                <th className="pb-3 font-medium">Period</th>
                <th className="pb-3 font-medium">Subject</th>
                <th className="pb-3 font-medium">Teacher</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No timetable entries available</td></tr>
              ) : items.map(it => (
                <tr key={it._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 font-medium text-primary-600">{getClassLabel(classes.find((c) => getClassCode(c) === it.class_code) || { class_code: it.class_code })}</td>
                  <td className="py-3">{it.day || '—'}</td>
                  <td className="py-3">{it.period || '—'}</td>
                  <td className="py-3">{getSubjectLabelByCode(it.subject) || it.subject || '—'}</td>
                  <td className="py-3">{it.teacher_code ? getTeacherLabelByCode(it.teacher_code) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherTimetable;
