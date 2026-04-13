import React, { useState, useEffect } from 'react';
import { timetableAPI, classAPI, dashboardAPI } from '../../services/api';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const TIME_SLOTS = [
  { period_number: 1, start_time: '07:00', end_time: '07:45' },
  { period_number: 2, start_time: '07:45', end_time: '08:30' },
  { period_number: 3, start_time: '08:30', end_time: '09:15' },
  { period_number: 4, start_time: '09:45', end_time: '10:30' },
  { period_number: 5, start_time: '10:30', end_time: '11:15' },
  { period_number: 6, start_time: '11:15', end_time: '12:00' },
];

const BREAK_SLOT = { start_time: '09:15', end_time: '09:45' };

const TeacherTimetable: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [viewClassCode, setViewClassCode] = useState<string>('');
  const [viewTimetable, setViewTimetable] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState<boolean>(false);
  const [metaLoading, setMetaLoading] = useState<boolean>(true);

  const fetchMeta = async () => {
    try {
      const dR = await dashboardAPI.teacher();
      const myClasses = dR.data.data?.myClasses || [];
      setClasses(myClasses);
      
      const assigned = Array.isArray(user?.assigned_class) ? user.assigned_class : [];
      const firstCode = myClasses[0]?.class_code || assigned[0] || '';
      
      if (firstCode) {
        setViewClassCode(firstCode);
        fetchViewTimetable(firstCode);
      }
    } catch (e: any) { 
      console.error('Failed to load classes', e);
      const assigned = Array.isArray(user?.assigned_class) ? user.assigned_class : [];
      setClasses(assigned.map(c => ({ class_code: c })));
      if (assigned[0]) {
        setViewClassCode(assigned[0]);
        fetchViewTimetable(assigned[0]);
      }
    } finally { 
      setMetaLoading(false); 
    }
  };

  useEffect(() => { fetchMeta(); }, [user?.assigned_class]);

  const fetchViewTimetable = async (classCode: string) => {
    if (!classCode) { setViewTimetable(null); return; }
    setViewLoading(true);
    try {
      // Resolve canonical class code first (handles variations like '1A-English' vs '1-A-English')
      let codeToUse = String(classCode || '').trim();
      try {
        const cR = await classAPI.getByCode(codeToUse);
        if (cR?.data?.data?.class_code) codeToUse = cR.data.data.class_code;
      } catch (err) {
        // ignore and use original code
      }
      const r = await timetableAPI.getByClass(codeToUse);
      setViewTimetable(r.data.data || null);
    } catch (e: any) { setViewTimetable(null); }
    finally { setViewLoading(false); }
  };

  const getClassLabel = (c: any) => {
    if (!c) return '';
    const parts = [c.standard, c.division, c.medium, c.stream, c.shift]
      .map((v:any) => (v === undefined || v === null ? '' : String(v).trim()))
      .filter(Boolean);
    const code = c.class_code || parts.join('-');
    const meta = [c.standard && `Std ${c.standard}`, c.division && `Div ${c.division}`, c.medium]
      .filter(Boolean).join(' | ');
    return meta ? `${code} (${meta})` : code;
  };

  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  if (metaLoading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Class Timetable</h1>
        <p className="text-sm text-gray-500">View timetable for your assigned class</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-end gap-3 md:items-center md:justify-between flex-col md:flex-row">
          <div className="w-full md:w-80">
            <label className="block text-sm font-medium text-gray-700 mb-1">View Timetable (Class)</label>
            <select className="input-field" value={viewClassCode} onChange={(e)=>{ const next = e.target.value; setViewClassCode(next); fetchViewTimetable(next); }}>
              <option value="">Select class</option>
              {classes.map((c: any) => (
                <option key={c.class_code} value={c.class_code}>
                  {c.standard ? `${c.class_code} (Std ${c.standard}-${c.division})` : c.class_code}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-500">{viewLoading ? 'Loading timetable...' : viewTimetable ? `Showing: ${viewTimetable.class_code}` : 'No timetable selected'}</div>
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
                  {days.map(d=> <th key={d} className="px-3 py-2 border-b border-gray-100 text-left whitespace-nowrap">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.slice(0,3).map(slot => (
                  <tr key={`slot-${slot.period_number}`} className="border-t border-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                      <div>Period {slot.period_number}</div>
                      <div className="text-xs text-gray-400">{slot.start_time} - {slot.end_time}</div>
                    </td>
                    {days.map(d => {
                      const daySchedule = Array.isArray(viewTimetable?.schedule) ? viewTimetable.schedule.find((s:any)=>s.day===d) : null;
                      const cell = daySchedule?.periods?.find((p:any)=>Number(p.period_number) === Number(slot.period_number));
                      const subj = cell?.subject_name || cell?.subject_code;
                      const tname = cell?.teacher_name || cell?.teacher_code;
                      return (
                        <td key={d} className="px-3 py-2 align-top border-l border-gray-50 min-w-[160px]">
                          {cell ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-gray-900">{subj || '—'}</div>
                              <div className="text-gray-500 text-xs">{tname || '—'}</div>
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr className="bg-blue-50">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                    <div>BREAK</div>
                    <div className="text-xs text-gray-500">{BREAK_SLOT.start_time} - {BREAK_SLOT.end_time}</div>
                  </td>
                  {days.map(d=> <td key={d} className="px-3 py-2 text-blue-600 text-sm">Break</td>)}
                </tr>

                {TIME_SLOTS.slice(3,6).map(slot => (
                  <tr key={`slot-${slot.period_number}`} className="border-t border-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                      <div>Period {slot.period_number}</div>
                      <div className="text-xs text-gray-400">{slot.start_time} - {slot.end_time}</div>
                    </td>
                    {days.map(d => {
                      const daySchedule = Array.isArray(viewTimetable?.schedule) ? viewTimetable.schedule.find((s:any)=>s.day===d) : null;
                      const cell = daySchedule?.periods?.find((p:any)=>Number(p.period_number) === Number(slot.period_number));
                      const subj = cell?.subject_name || cell?.subject_code;
                      const tname = cell?.teacher_name || cell?.teacher_code;
                      return (
                        <td key={d} className="px-3 py-2 align-top border-l border-gray-50 min-w-[160px]">
                          {cell ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-gray-900">{subj || '—'}</div>
                              <div className="text-gray-500 text-xs">{tname || '—'}</div>
                            </div>
                          ) : <span className="text-gray-300">—</span>}
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
    </div>
  );
};

export default TeacherTimetable;
