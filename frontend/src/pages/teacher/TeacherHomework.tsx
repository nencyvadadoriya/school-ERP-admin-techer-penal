import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { homeworkAPI, classAPI, subjectAPI } from '../../services/api';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';

const EMPTY = { class_code: '', subject_code: '', title: '', description: '', due_date: '' };

const TeacherHomework: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modal, setModal] = useState<boolean>(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hwRes, classRes, subRes] = await Promise.all([
        homeworkAPI.getAll({ teacher_code: user?.teacher_code }),
        classAPI.getAll(),
        subjectAPI.getAll()
      ]);
      setItems(hwRes.data.data || []);
      setClasses(classRes.data.data || []);
      setSubjects(subRes.data.data || []);
    } catch (e) {
      console.error(e);
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
                onChange={e => setForm({ ...form, class_code: e.target.value })}
              >
                <option value="">Select Standard</option>
                {classes.map(c => (
                  <option key={c._id} value={c.standard}>{c.standard} {c.division} ({c.medium})</option>
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
              >
                <option value="">Select Subject</option>
                {subjects.filter(s => !form.class_code || s.std === form.class_code).map(s => (
                  <option key={s._id} value={s.subject_name}>{s.subject_name}</option>
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
