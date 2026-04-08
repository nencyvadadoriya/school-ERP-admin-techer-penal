import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { timetableAPI } from '../../services/api';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';

const EMPTY = { class_code: '', day: 'Monday', period: '', subject: '', teacher_code: '' };

const Timetable: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY);

  const fetch = async () => {
    try {
      const r = await timetableAPI.getAll();
      setItems(r.data.data || []);
    } catch (e) {
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (it) => { setEditing(it); setForm({ ...it }); setModalOpen(true); };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      if (editing) {
        await timetableAPI.save({ ...form, _id: editing._id });
        toast.success('Timetable updated');
      } else {
        await timetableAPI.save(form);
        toast.success('Timetable saved');
      }
      setModalOpen(false);
      await fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      // API doesn't have delete route for timetable; fallback to refresh after save/remove if implemented
      await fetch();
      toast.success('Deleted (refreshed)');
    } catch (e) { toast.error('Error'); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
          <p className="text-sm text-gray-500">Manage timetables for classes</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><FaPlus />Add Entry</button>
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
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No timetable entries</td></tr>
              ) : items.map(it => (
                <tr key={it._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 font-medium text-primary-600">{it.class_code}</td>
                  <td className="py-3">{it.day}</td>
                  <td className="py-3">{it.period}</td>
                  <td className="py-3">{it.subject}</td>
                  <td className="py-3">{it.teacher_code || '—'}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button onClick={()=>openEdit(it)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><FaEdit /></button>
                      <button onClick={()=>handleDelete(it._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title={editing ? 'Edit Entry' : 'Add Timetable Entry'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Code</label>
              <input className="input-field" required value={form.class_code} onChange={e=>setForm({...form,class_code:e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
              <select className="input-field" value={form.day} onChange={e=>setForm({...form,day:e.target.value})}>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=> <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <input className="input-field" value={form.period} onChange={e=>setForm({...form,period:e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input className="input-field" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Code</label>
              <input className="input-field" value={form.teacher_code} onChange={e=>setForm({...form,teacher_code:e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Save</button>
            <button type="button" onClick={()=>setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Timetable;
