import React, { useState, useEffect } from 'react';
import { timetableAPI, dashboardAPI } from '../../services/api';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';

const TIME_SLOTS = [
  { period_number: 1, start_time: '07:00', end_time: '07:45' },
  { period_number: 2, start_time: '07:45', end_time: '08:30' },
  { period_number: 3, start_time: '08:30', end_time: '09:15' },
  { period_number: 4, start_time: '09:45', end_time: '10:30' },
  { period_number: 5, start_time: '10:30', end_time: '11:15' },
  { period_number: 6, start_time: '11:15', end_time: '12:00' },
];

const BREAK_SLOT = { start_time: '09:15', end_time: '09:45' };

const StudentTimetable: React.FC = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTimetable = async () => {
    try {
      // Get student's class_code from their own data or dashboard
      const classCode = user?.class_code;
      if (classCode) {
        const r = await timetableAPI.getByClass(classCode);
        setTimetable(r.data.data || null);
      }
    } catch (e: any) {
      console.error('Error fetching student timetable:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTimetable();
    }
  }, [user]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Class Timetable</h1>
        <p className="text-sm text-gray-500">Weekly schedule for your class: {user?.class_code || 'N/A'}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {!timetable ? (
          <div className="text-center py-10 text-gray-400">No timetable found for your class</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-100">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-2 border-b border-gray-100 text-left whitespace-nowrap">Time / Period</th>
                  {days.map(d => <th key={d} className="px-3 py-2 border-b border-gray-100 text-left whitespace-nowrap">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.slice(0, 3).map(slot => (
                  <tr key={`slot-${slot.period_number}`} className="border-t border-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                      <div>Period {slot.period_number}</div>
                      <div className="text-xs text-gray-400">{slot.start_time} - {slot.end_time}</div>
                    </td>
                    {days.map(d => {
                      const daySchedule = Array.isArray(timetable?.schedule) ? timetable.schedule.find((s: any) => s.day === d) : null;
                      const cell = daySchedule?.periods?.find((p: any) => Number(p.period_number) === Number(slot.period_number));
                      const subj = cell?.subject_name || cell?.subject_code;
                      const tname = cell?.teacher_name || cell?.teacher_code;
                      return (
                        <td key={d} className="px-3 py-2 align-top border-l border-gray-50 min-w-[160px]">
                          {cell ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-gray-900">{subj || '—'}</div>
                              <div className="text-xs text-gray-500">{tname || '—'}</div>
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
                  {days.map(d => <td key={d} className="px-3 py-2 text-blue-600 text-sm">Break</td>)}
                </tr>

                {TIME_SLOTS.slice(3, 6).map(slot => (
                  <tr key={`slot-${slot.period_number}`} className="border-t border-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                      <div>Period {slot.period_number}</div>
                      <div className="text-xs text-gray-400">{slot.start_time} - {slot.end_time}</div>
                    </td>
                    {days.map(d => {
                      const daySchedule = Array.isArray(timetable?.schedule) ? timetable.schedule.find((s: any) => s.day === d) : null;
                      const cell = daySchedule?.periods?.find((p: any) => Number(p.period_number) === Number(slot.period_number));
                      const subj = cell?.subject_name || cell?.subject_code;
                      const tname = cell?.teacher_name || cell?.teacher_code;
                      return (
                        <td key={d} className="px-3 py-2 align-top border-l border-gray-50 min-w-[160px]">
                          {cell ? (
                            <div className="space-y-1">
                              <div className="font-semibold text-gray-900">{subj || '—'}</div>
                              <div className="text-xs text-gray-500">{tname || '—'}</div>
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentTimetable;
