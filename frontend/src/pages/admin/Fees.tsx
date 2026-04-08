import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaRupeeSign } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { feesAPI, studentAPI } from '../../services/api';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import Spinner from '../../components/Spinner';
import StatCard from '../../components/StatCard';

const EMPTY = { student_id:'', gr_number:'', fee_type:'Tuition', total_amount:'', amount_paid:'0', due_date:'', payment_mode:'Cash', academic_year:'2024-25', installment_number:1, status:'Pending', remarks:'' };

const Fees: React.FC = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalCollected:0, totalAmount:0, pendingAmount:0, pendingCount:0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [modal, setModal] = useState<boolean>(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState<string>('');

  const fetchAll = async () => {
    try {
      const [feesR, studentsR, summaryR] = await Promise.all([feesAPI.getAll(), studentAPI.getAll(), feesAPI.getSummary()]);
      setFees(feesR.data.data || []);
      setStudents(studentsR.data.data || []);
      setSummary(summaryR.data.data || {});
    } catch(e){} finally { setLoading(false); }
  };
  useEffect(()=>{fetchAll();},[]);

  const handleStudentChange = (e: any) => {
    const student = students.find(s=>s._id===e.target.value);
    setForm({...form, student_id:e.target.value, gr_number:student?.gr_number||''});
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      if (editing) { await feesAPI.update(editing._id, form); toast.success('Updated'); }
      else { await feesAPI.create(form); toast.success('Fee record created'); }
      setModal(false); fetchAll();
    } catch(err) { toast.error(err.response?.data?.message||'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await feesAPI.delete(id); toast.success('Deleted'); fetchAll(); }
    catch(e) { toast.error('Error'); }
  };

  const filtered = fees.filter(f =>
    f.gr_number?.includes(search) ||
    f.student_id?.first_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Fees Management</h1><p className="text-sm text-gray-500">Track fee payments & EMI</p></div>
        <button onClick={()=>{setEditing(null);setForm(EMPTY);setModal(true);}} className="btn-primary flex items-center gap-2"><FaPlus />Add Record</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Billed" value={`₹${(summary.totalAmount||0).toLocaleString()}`} icon={FaRupeeSign} color="blue" />
        <StatCard title="Collected" value={`₹${(summary.totalCollected||0).toLocaleString()}`} icon={FaRupeeSign} color="green" />
        <StatCard title="Pending Amount" value={`₹${(summary.pendingAmount||0).toLocaleString()}`} icon={FaRupeeSign} color="orange" />
        <StatCard title="Pending Records" value={summary.pendingCount||0} icon={FaRupeeSign} color="red" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative mb-4">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search by GR number..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="pb-3 font-medium">GR No.</th><th className="pb-3 font-medium">Student</th>
              <th className="pb-3 font-medium">Fee Type</th><th className="pb-3 font-medium">Total</th>
              <th className="pb-3 font-medium">Paid</th><th className="pb-3 font-medium">Due Date</th>
              <th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>{filtered.length===0
              ? <tr><td colSpan="8" className="text-center py-8 text-gray-400">No records</td></tr>
              : filtered.map(f=>(
              <tr key={f._id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 font-medium text-primary-600">{f.gr_number}</td>
                <td className="py-3">{f.student_id?.first_name} {f.student_id?.last_name}</td>
                <td className="py-3">{f.fee_type}</td>
                <td className="py-3">₹{f.total_amount?.toLocaleString()}</td>
                <td className="py-3">₹{f.amount_paid?.toLocaleString()}</td>
                <td className="py-3">{new Date(f.due_date).toLocaleDateString()}</td>
                <td className="py-3"><Badge status={f.status} /></td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button onClick={()=>{setEditing(f);setForm({...f,due_date:f.due_date?.split('T')[0]});setModal(true);}} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><FaEdit /></button>
                    <button onClick={()=>handleDelete(f._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><FaTrash /></button>
                  </div>
                </td>
              </tr>))
            }</tbody>
          </table>
        </div>
      </div>
      <Modal isOpen={modal} onClose={()=>setModal(false)} title={editing?'Edit Fee Record':'Add Fee Record'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {!editing && <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
              <select className="input-field" required value={form.student_id} onChange={handleStudentChange}>
                <option value="">Select student</option>
                {students.map(s=><option key={s._id} value={s._id}>{s.first_name} {s.last_name} ({s.gr_number})</option>)}
              </select></div>}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
              <select className="input-field" value={form.fee_type} onChange={e=>setForm({...form,fee_type:e.target.value})}>
                {['Tuition','Transport','Library','Lab','Sports','Other'].map(t=><option key={t}>{t}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <input className="input-field" value={form.academic_year} onChange={e=>setForm({...form,academic_year:e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Amount *</label>
              <input type="number" className="input-field" required value={form.total_amount} onChange={e=>setForm({...form,total_amount:e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
              <input type="number" className="input-field" value={form.amount_paid} onChange={e=>setForm({...form,amount_paid:e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
              <input type="date" className="input-field" required value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
              <select className="input-field" value={form.payment_mode} onChange={e=>setForm({...form,payment_mode:e.target.value})}>
                {['Cash','Online','Cheque','DD'].map(m=><option key={m}>{m}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="input-field" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                {['Pending','Partial','Paid','Overdue'].map(s=><option key={s}>{s}</option>)}
              </select></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <input className="input-field" value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} /></div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">{editing?'Update':'Create'}</button>
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Fees;
