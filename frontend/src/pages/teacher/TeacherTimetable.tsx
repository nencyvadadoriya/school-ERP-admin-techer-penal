import React, { useState, useEffect } from 'react';
import { timetableAPI, dashboardAPI, teacherAPI, classAPI } from '../../services/api';
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

// Normalize: "STD-1-A-English-Primary-Morning" -> "1aenglish"
const normalizeCode = (s: string) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Build variants of a class code to handle format mismatches
const getCodeVariants = (code: string): string[] => {
  const s = String(code || '').trim();
  const variants = new Set<string>();
  variants.add(s);
  // Strip STD- prefix
  const noSTD = s.replace(/^STD-/i, '');
  variants.add(noSTD);
  // First 3 dash-segments (standard-division-medium)
  const parts = noSTD.split('-');
  if (parts.length > 3) {
    variants.add(parts.slice(0, 3).join('-'));
  }
  return Array.from(variants).filter(Boolean);
};

const TeacherTimetable: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [viewClassCode, setViewClassCode] = useState<string>('');
  const [viewTimetable, setViewTimetable] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState<boolean>(false);
  const [metaLoading, setMetaLoading] = useState<boolean>(true);

  // Resolve actual DB class_code by matching against all classes
  const resolveActualClassCode = async (rawCode: string, allClasses: any[]): Promise<string> => {
    const variants = getCodeVariants(rawCode);
    // Direct match first
    for (const v of variants) {
      const found = allClasses.find((c: any) => c.class_code === v);
      if (found) return found.class_code;
    }
    // Normalized match
    const targetNorm = normalizeCode(rawCode);
    const found = allClasses.find((c: any) => normalizeCode(c.class_code) === targetNorm);
    if (found) return found.class_code;
    // Return the shortest variant (most likely correct)
    return variants.sort((a, b) => a.length - b.length)[0] || rawCode;
  };

  // Fetch teacher's assigned class objects using multiple fallback strategies
  const fetchAssignedClasses = async (): Promise<any[]> => {
    let rawCodes: string[] = [];
    let classObjects: any[] = [];

    // Strategy 1: Dashboard API (returns full class objects)
    try {
      const dR = await dashboardAPI.teacher();
      const dashClasses = dR.data.data?.myClasses || [];
      if (dashClasses.length > 0) {
        classObjects = dashClasses;
      }
    } catch (e) {
      console.warn('Dashboard API failed, trying teacher profile...');
    }

    // If we got class objects with proper class_code from DB, use them directly
    if (classObjects.length > 0 && classObjects[0]?.class_code) {
      return classObjects;
    }

    // Strategy 2: Fetch fresh teacher profile
    const teacherId = user?.id || user?._id;
    if (teacherId) {
      try {
        const tR = await teacherAPI.getById(teacherId);
        const assigned: string[] = Array.isArray(tR.data.data?.assigned_class)
          ? tR.data.data.assigned_class.filter(Boolean)
          : [];
        if (assigned.length > 0) rawCodes = assigned;
      } catch (e) {
        console.warn('Teacher profile fetch failed, using localStorage...');
      }
    }

    // Strategy 3: localStorage fallback
    if (rawCodes.length === 0) {
      rawCodes = Array.isArray(user?.assigned_class) ? user.assigned_class.filter(Boolean) : [];
    }

    if (rawCodes.length === 0) return [];

    // Resolve each raw code against actual DB classes to get correct class_code
    try {
      const cR = await classAPI.getAll();
      const allClasses: any[] = cR.data.data || [];

      const resolved = await Promise.all(
        rawCodes.map(async (code) => {
          const actualCode = await resolveActualClassCode(code, allClasses);
          // Find full class object if available
          const classObj = allClasses.find((c: any) => c.class_code === actualCode);
          return classObj || { class_code: actualCode };
        })
      );
      return resolved;
    } catch (e) {
      // If classAPI fails, return raw codes as objects
      return rawCodes.map((code) => ({ class_code: code }));
    }
  };

  const fetchMeta = async () => {
    setMetaLoading(true);
    try {
      const classList = await fetchAssignedClasses();
      setClasses(classList);
      const firstCode = classList[0]?.class_code || '';
      if (firstCode) {
        setViewClassCode(firstCode);
        fetchViewTimetable(firstCode);
      }
    } catch (e) {
      console.error('Failed to load classes', e);
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchMeta();
  }, [user]);

  const fetchViewTimetable = async (classCode: string) => {
    if (!classCode) { setViewTimetable(null); return; }
    setViewLoading(true);
    try {
      const r = await timetableAPI.getByClass(classCode);
      setViewTimetable(r.data.data || null);
    } catch (e: any) {
      console.error('Error fetching timetable:', e);
      setViewTimetable(null);
    } finally {
      setViewLoading(false);
    }
  };

  const getClassLabel = (c: any) => {
    if (!c) return '';
    if (c.standard && c.division) {
      const medium = c.medium ? ` | ${c.medium}` : '';
      const stream = c.stream ? ` | ${c.stream}` : '';
      const shift = c.shift ? ` | ${c.shift}` : '';
      return `${c.class_code} (Std ${c.standard}-${c.division}${medium}${stream}${shift})`;
    }
    return c.class_code;
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
            {classes.length === 0 ? (
              <p className="text-sm text-red-500 mt-1">No classes assigned. Please contact admin.</p>
            ) : (
              <select
                className="input-field"
                value={viewClassCode}
                onChange={(e) => {
                  const next = e.target.value;
                  setViewClassCode(next);
                  fetchViewTimetable(next);
                }}
              >
                <option value="">Select class</option>
                {classes.map((c: any) => (
                  <option key={c.class_code} value={c.class_code}>
                    {getClassLabel(c)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              {viewLoading
                ? 'Loading timetable...'
                : viewTimetable
                ? `Showing: ${viewTimetable.class_code}`
                : 'No timetable selected'}
            </div>
            {viewClassCode && (
              <button
                onClick={() => fetchViewTimetable(viewClassCode)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {viewLoading ? (
            <div className="py-10"><Spinner /></div>
          ) : !viewTimetable ? (
            <div className="text-center py-10 text-gray-400">
              {viewClassCode
                ? 'No timetable found for this class. Admin needs to create it.'
                : 'Please select a class to view timetable.'}
            </div>
          ) : (
            <table className="min-w-full text-xs border border-gray-100">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-2 border-b border-gray-100 text-left whitespace-nowrap">Time / Period</th>
                  {days.map(d => (
                    <th key={d} className="px-3 py-2 border-b border-gray-100 text-left whitespace-nowrap">{d}</th>
                  ))}
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
                      const daySchedule = Array.isArray(viewTimetable?.schedule)
                        ? viewTimetable.schedule.find((s: any) => s.day === d)
                        : null;
                      const cell = daySchedule?.periods?.find(
                        (p: any) => Number(p.period_number) === Number(slot.period_number)
                      );
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

                <tr className="bg-blue-50">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                    <div>BREAK</div>
                    <div className="text-xs text-gray-500">{BREAK_SLOT.start_time} - {BREAK_SLOT.end_time}</div>
                  </td>
                  {days.map(d => (
                    <td key={d} className="px-3 py-2 text-blue-600 text-sm">Break</td>
                  ))}
                </tr>

                {TIME_SLOTS.slice(3, 6).map(slot => (
                  <tr key={`slot-${slot.period_number}`} className="border-t border-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                      <div>Period {slot.period_number}</div>
                      <div className="text-xs text-gray-400">{slot.start_time} - {slot.end_time}</div>
                    </td>
                    {days.map(d => {
                      const daySchedule = Array.isArray(viewTimetable?.schedule)
                        ? viewTimetable.schedule.find((s: any) => s.day === d)
                        : null;
                      const cell = daySchedule?.periods?.find(
                        (p: any) => Number(p.period_number) === Number(slot.period_number)
                      );
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
    </div>
  );
};

export default TeacherTimetable;