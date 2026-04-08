import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { studentAPI, attendanceAPI } from '../../services/api';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';

const MarkAttendance: React.FC = () => {
  const { user } = useAuth();
  const [classCode, setClassCode] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const myClasses = user?.assigned_class || [];

  const loadStudents = async () => {
    if (!classCode) return;
    setLoading(true);
    try {
      const r = await studentAPI.getAll();
      const cls = (r.data.data || []).filter(s => s.class_code === classCode);
      setStudents(cls);
      const init = {};
      cls.forEach(s => { init[s.gr_number] = 'Present'; });
      setRecords(init);
    } catch(e) { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  };

  const handleStatus = (gr, status) => setRecords(prev => ({ ...prev, [gr]: status }));

  const handleSubmit = async () => {
    if (!classCode || !students.length) { toast.error('Select class and load students first'); return; }
    setSaving(true);
    try {
      const recordsArr = students.map(s => ({ student_id: s._id, gr_number: s.gr_number, status: records[s.gr_number] || 'Present' }));
      await attendanceAPI.mark({ class_code: classCode, teacher_code: user?.teacher_code, date, records: recordsArr });
      toast.success('Attendance saved!');
    } catch(e) { toast.error(e.response?.data?.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  const stats = { P: Object.values(records).filter(v=>v==='Present').length, A: Object.values(records).filter(v=>v==='Absent').length, L: Object.values(records).filter(v=>v==='Late').length };

  return (
    <div className="space-y-3">
      <div><h1 className="text-base md:text-lg font-bold text-gray-900">Mark Attendance</h1><p className="text-xs text-gray-500">Record student attendance for your class</p></div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Class</label>
            <select className="input-field" value={classCode} onChange={e=>setClassCode(e.target.value)}>
              <option value="">Select class</option>
              {myClasses.map(c=><option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input type="date" className="input-field" value={date} onChange={e=>setDate(e.target.value)} /></div>
          <div className="flex items-end">
            <button onClick={loadStudents} disabled={!classCode} className="btn-primary w-full">Load Students</button>
          </div>
        </div>
        {loading ? <Spinner /> : students.length > 0 && (
          <>
            <div className="flex gap-4 mb-3 p-2 bg-gray-50 rounded-lg">
              <span className="text-xs text-green-600 font-medium">✓ Present: {stats.P}</span>
              <span className="text-xs text-red-600 font-medium">✗ Absent: {stats.A}</span>
              <span className="text-xs text-yellow-600 font-medium">⏱ Late: {stats.L}</span>
            </div>
            <div className="space-y-2">
              {students.map(s=>(
                <div key={s._id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">{s.first_name[0]}</div>
                    <div>
                      <p className="font-medium text-xs text-gray-900">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-500">GR: {s.gr_number} | Roll: {s.roll_no}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {['Present','Absent','Late','Excused'].map(status=>(
                      <button key={status} onClick={()=>handleStatus(s.gr_number,status)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${records[s.gr_number]===status
                          ? status==='Present'?'bg-green-500 text-white':status==='Absent'?'bg-red-500 text-white':status==='Late'?'bg-yellow-500 text-white':'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={handleSubmit} disabled={saving} className="btn-primary px-8">{saving?'Saving...':'Save Attendance'}</button>
            </div>
          </>
        )}
        {!loading && students.length === 0 && classCode && <div className="text-center py-8 text-gray-400">Click "Load Students" to begin</div>}
      </div>
    </div>
  );
};

export default MarkAttendance;
