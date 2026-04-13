import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { homeworkAPI, classAPI, subjectAPI, dashboardAPI } from '../../services/api';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';

const EMPTY = { class_code: '', subject_code: '', title: '', description: '', due_date: '' };

const TeacherHomework: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modal, setModal] = useState<boolean>(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hwRes, dRes, subRes, allClsRes] = await Promise.all([
        homeworkAPI.getAll({ teacher_code: user?.teacher_code }),
        dashboardAPI.teacher(),
        subjectAPI.getAll(),
        classAPI.getAll()
      ]);
      setItems(hwRes.data.data || []);
      const teacherData = dRes.data.data || {};
      
      // Filter classes to show ONLY what is assigned to the teacher
      const allSystemClasses = allClsRes.data.data || [];
      const subjectAssignments = teacherData.subjectAssignments || [];
      
      console.log('Teacher Debug:', { 
        teacher_code: user?.teacher_code,
        subjectAssignments,
        allSystemClassesCount: allSystemClasses.length 
      });

      let filteredClasses = [];

      // 1. Get classes where teacher is the class teacher or explicitly assigned
      const teacherAssignedClassCodes = teacherData.assigned_class || [];
      
      if (allSystemClasses.length > 0) {
        filteredClasses = allSystemClasses.filter((c: any) => {
          // Match by teacher_code (if they are the class teacher)
          const isClassTeacher = (c.teacher_code && user?.teacher_code && String(c.teacher_code) === String(user?.teacher_code));
          if (isClassTeacher) return true;
          
          // Match by assigned_class codes
          if (teacherAssignedClassCodes.includes(c.class_code)) return true;

          // Match by subject assignments
          return subjectAssignments.some((a: any) => {
            const classIdMatch = a.class_id && c._id && String(a.class_id) === String(c._id);
            const classNameMatch = a.class_name && c.class_code && String(a.class_name).includes(String(c.class_code));
            
            // Standard/Division matching
            const cStd = String(c.standard || '').trim();
            const cDiv = String(c.division || '').trim();
            const aName = String(a.class_name || '').trim();
            
            const stdDivMatch = aName.includes(cStd) && aName.includes(cDiv);
            
            return classIdMatch || classNameMatch || stdDivMatch;
          });
        });
      }

      // 2. If filtered list is still empty, derive from subject assignments directly
      if (filteredClasses.length === 0 && subjectAssignments.length > 0) {
        console.warn('Deriving classes from assignments directly');
        const derived = subjectAssignments.map((a: any) => {
          const name = String(a.class_name || '');
          const parts = name.split(/[\s-]+/);
          return {
            _id: a.class_id || `temp-${name}`,
            class_code: name,
            standard: parts.find(p => !isNaN(parseInt(p))) || name,
            division: parts.find(p => p.length === 1 && /[A-Z]/i.test(p)) || '',
            medium: a.medium || 'English'
          };
        });
        filteredClasses = Array.from(new Map(derived.map(c => [c.class_code, c])).values());
      }

      // 3. Last Resort: Use teacher's direct assigned_class strings
      if (filteredClasses.length === 0 && teacherAssignedClassCodes.length > 0) {
        filteredClasses = teacherAssignedClassCodes.map((code: string) => ({
          _id: `code-${code}`,
          class_code: code,
          standard: code.split('-')[0] || code,
          division: code.split('-')[1] || '',
          medium: 'N/A'
        }));
      }

      // 4. FINAL Fallback: All myClasses from dashboard
      if (filteredClasses.length === 0 && teacherData.myClasses?.length > 0) {
        filteredClasses = teacherData.myClasses;
      }

      console.log('Final Filtered Classes for Dropdown:', filteredClasses);

      setClasses(filteredClasses);
      setSubjectAssignments(subjectAssignments);
      setSubjects(subRes.data.data || []);
    } catch (e) {
      console.error('Fetch Error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const payload = { ...form, teacher_code: user?.teacher_code };
      if (editing) { await homeworkAPI.update(editing._id, payload); toast.success('Updated'); }
      else { await homeworkAPI.create(payload); toast.success('Homework assigned'); }
      setModal(false); fetchData();
    } catch(err) { toast.error(err.response?.data?.message||'Error'); }
  };

  const getFilteredSubjects = () => {
    if (!form.class_code) return [];
    
    // Find the class from the teacher's classes list
    const selectedClass = classes.find(c => 
      c.class_code === form.class_code || String(c.standard) === String(form.class_code)
    );
    
    if (!selectedClass) return [];

    // Filter subjects based on admin assignments for THIS specific teacher
    // subjectAssignments comes from teacherData.subjectAssignments in fetchData()
    const assignedForThisClass = subjectAssignments.filter(a => {
      // Match by class_id if both exist
      if (a.class_id && selectedClass._id && String(a.class_id) === String(selectedClass._id)) {
        return true;
      }
      // Match by class_name/standard if IDs don't match or aren't available
      if (a.class_name && selectedClass.class_code && String(a.class_name).includes(selectedClass.class_code)) {
        return true;
      }
      // Match by standard name (e.g., "Std 1 - Div A")
      const standardStr = `${selectedClass.standard} - ${selectedClass.division}`;
      if (a.class_name && a.class_name.includes(standardStr)) {
        return true;
      }
      return false;
    });

    if (assignedForThisClass.length > 0) {
      return assignedForThisClass.map(a => ({
        _id: a.subject_id,
        subject_name: a.subject_name,
        subject_code: a.subject_id
      }));
    }

    // Fallback: If no specific assignments found, show subjects for this standard/medium
    return subjects.filter(s => 
      String(s.std) === String(selectedClass.standard) && 
      s.medium === selectedClass.medium
    );
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div><h1 className="text-base md:text-lg font-bold text-gray-900">Homework</h1><p className="text-xs text-gray-500">Assign & manage homework</p></div>
        <button onClick={()=>{setEditing(null);setForm(EMPTY);setModal(true);}} className="btn-primary flex items-center gap-2"><FaPlus />Assign</button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {items.length===0 ? <div className="bg-white rounded-lg p-6 text-center text-gray-400">No homework assigned yet</div>
        : items.map(hw=>(
          <div key={hw._id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{hw.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Standard: {hw.class_code} | Subject: {hw.subject_code}</p>
                {hw.description && <p className="text-xs text-gray-600 mt-1">{hw.description}</p>}
                <p className="text-xs text-orange-600 mt-1 font-medium">Due: {new Date(hw.due_date).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>{setEditing(hw);setForm({...hw,due_date:hw.due_date?.split('T')[0]});setModal(true);}} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><FaEdit /></button>
                <button onClick={async () => { if (window.confirm('Delete?')) { await homeworkAPI.delete(hw._id); toast.success('Deleted'); fetchData(); } }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><FaTrash /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Homework' : 'Assign Homework'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input className="input-field" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Standard *</label>
              <select
                className="input-field"
                required
                value={form.class_code}
                onChange={e => {
                  console.log('Selected class code:', e.target.value);
                  setForm({ ...form, class_code: e.target.value });
                }}
              >
                <option value="">Select Standard</option>
                {classes.length === 0 && <option disabled>No classes assigned</option>}
                {classes.map(c => (
                  <option key={c._id || c.class_code} value={c.class_code || c.standard}>
                    {c.standard || c.class_code} {c.division || ''} ({c.medium || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <select
                className="input-field"
                required
                value={form.subject_code}
                onChange={e => setForm({ ...form, subject_code: e.target.value })}
                disabled={!form.class_code}
              >
                <option value="">Select Subject</option>
                {getFilteredSubjects().map((s, idx) => (
                  <option key={s._id || idx} value={s.subject_name}>{s.subject_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
            <input type="date" className="input-field" required value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Assign'}</button>
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeacherHomework;
