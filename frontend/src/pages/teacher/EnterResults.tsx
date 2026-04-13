import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { examAPI, studentAPI } from '../../services/api';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';

const EnterResults: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(()=>{
    examAPI.getAll({ teacher_code: user?.teacher_code }).then(r=>setExams(r.data.data||[])).catch(console.error);
  },[]);

  const loadStudents = async () => {
    const exam = exams.find(e=>e._id===selectedExam);
    if (!exam) return;
    setLoading(true);
    try {
      const r = await studentAPI.getAll({ class_code: exam.class_code });
      const cls = (r.data.data||[]);
      setStudents(cls);
      const init = {};
      cls.forEach(s=>{ init[s._id]=''; });
      setMarks(init);
    } catch(e){} finally { setLoading(false); }
  };

  const handleSave = async () => {
    const exam = exams.find(e=>e._id===selectedExam);
    if (!exam) return;
    setSaving(true);
    try {
      await Promise.all(students.map(s=>{
        const m = parseFloat(marks[s._id]);
        if (isNaN(m)) return null;
        return examAPI.submitResult({
          exam_id: selectedExam, student_id: s._id, gr_number: s.gr_number,
          class_code: exam.class_code, subject_code: exam.subject_code,
          marks_obtained: m, total_marks: exam.total_marks
        });
      }).filter(Boolean));
      toast.success('Results saved!');
    } catch(e) { toast.error('Error saving results'); }
    finally { setSaving(false); }
  };

  const exam = exams.find(e=>e._id===selectedExam);

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-gray-900">Enter Results</h1><p className="text-sm text-gray-500">Enter marks for exams</p></div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
            <select className="input-field" value={selectedExam} onChange={e=>setSelectedExam(e.target.value)}>
              <option value="">Choose exam...</option>
              {exams.map(ex=><option key={ex._id} value={ex._id}>{ex.exam_name} – {ex.class_code} ({ex.exam_type})</option>)}
            </select></div>
          <div className="flex items-end">
            <button onClick={loadStudents} disabled={!selectedExam} className="btn-primary w-full">Load Students</button>
          </div>
        </div>
        {exam && <p className="text-sm text-gray-500 mb-4">Total Marks: <strong>{exam.total_marks}</strong> | Passing: <strong>{exam.passing_marks}</strong></p>}
        {loading ? <Spinner /> : students.length > 0 && (
          <>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-3 font-medium">Student</th><th className="pb-3 font-medium">GR No.</th><th className="pb-3 font-medium">Marks (out of {exam?.total_marks})</th>
              </tr></thead>
              <tbody>{students.map(s=>(
                <tr key={s._id} className="border-t border-gray-50">
                  <td className="py-2 font-medium">{s.first_name} {s.last_name}</td>
                  <td className="py-2 text-gray-500">{s.gr_number}</td>
                  <td className="py-2">
                    <input type="number" min="0" max={exam?.total_marks} className="input-field w-32 py-1.5"
                      value={marks[s._id]||''} onChange={e=>setMarks({...marks,[s._id]:e.target.value})} placeholder="Enter marks" />
                  </td>
                </tr>
              ))}</tbody>
            </table>
            <div className="mt-4 flex justify-end">
              <button onClick={handleSave} disabled={saving} className="btn-primary px-8">{saving?'Saving...':'Save Results'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EnterResults;
