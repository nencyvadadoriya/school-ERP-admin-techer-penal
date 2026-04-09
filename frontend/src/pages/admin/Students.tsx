import React, { useState, useEffect } from 'react';
import { studentAPI, classAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaEye, FaHistory } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const Students: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [bulkClassId, setBulkClassId] = useState<string>('');
  const [bulkText, setBulkText] = useState<string>('');
  const [bulkSubmitting, setBulkSubmitting] = useState<boolean>(false);
  const [bulkResults, setBulkResults] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    std: '',
    roll_no: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    phone1: '',
    phone2: '',
    address: '',
    pin: '',
    class_code: '',
    subject_code: '',
    password: '',
    fees: '',
    shift: '',
    stream: '',
  });

  // Stream options based on standard
  const getStreamOptions = (std) => {
    const standardNum = Number(std);
    if (standardNum >= 11) {
      return [
        { value: 'Science-Maths', label: 'Science-Maths' },
        { value: 'Science-Bio', label: 'Science-Bio' },
        { value: 'Commerce', label: 'Commerce' },
        { value: 'Higher Secondary', label: 'Higher Secondary' }
      ];
    } else if (standardNum >= 9) {
      return [
        { value: 'Foundation', label: 'Foundation' },
        { value: 'Secondary', label: 'Secondary' }
      ];
    } else if (standardNum >= 6) {
      return [
        { value: 'Upper Primary', label: 'Upper Primary' }
      ];
    } else if (standardNum >= 1) {
      return [
        { value: 'Primary', label: 'Primary' }
      ];
    }
    return [];
  };

  // Subject code options based on standard
  const getSubjectCodeOptions = (std, stream) => {
    const standardNum = Number(std);
    
    if (standardNum <= 9) {
      // For standards 1-9: subject_code is optional
      return [
        { value: '', label: 'None (Optional)' },
        { value: 'MATHS', label: 'Mathematics' },
        { value: 'SCIENCE', label: 'Science' },
        { value: 'ENGLISH', label: 'English' },
        { value: 'GUJARATI', label: 'Gujarati' },
        { value: 'HINDI', label: 'Hindi' },
        { value: 'SST', label: 'Social Studies' },
        { value: 'COMPUTER', label: 'Computer Science' }
      ];
    } else {
      // For standards 10-12: subject_code is compulsory
      if (stream === 'Science-Maths') {
        return [
          { value: 'MATHS', label: 'Mathematics (Compulsory)' },
          { value: 'PHYSICS', label: 'Physics (Compulsory)' },
          { value: 'CHEMISTRY', label: 'Chemistry (Compulsory)' }
        ];
      } else if (stream === 'Science-Bio') {
        return [
          { value: 'BIOLOGY', label: 'Biology (Compulsory)' },
          { value: 'PHYSICS', label: 'Physics (Compulsory)' },
          { value: 'CHEMISTRY', label: 'Chemistry (Compulsory)' }
        ];
      } else if (stream === 'Commerce') {
        return [
          { value: 'ACCOUNTS', label: 'Accounts (Compulsory)' },
          { value: 'BUSINESS', label: 'Business Studies (Compulsory)' },
          { value: 'ECONOMICS', label: 'Economics (Compulsory)' }
        ];
      } else if (stream === 'Higher Secondary') {
        return [
          { value: 'ENGLISH', label: 'English (Compulsory)' },
          { value: 'GUJARATI', label: 'Gujarati (Compulsory)' }
        ];
      }
      return [
        { value: 'GENERAL', label: 'General Studies (Compulsory)' }
      ];
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await studentAPI.getAll();
      setStudents(response.data.data);
      setLoading(false);
    } catch (error) {
      toast.error('Error fetching students');
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getAll();
      setClasses(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
    
    // Reset stream and subject_code when standard changes
    if (name === 'std') {
      setFormData((s) => ({ 
        ...s, 
        std: value, 
        stream: '', 
        subject_code: '' 
      }));
    }
    
    // Reset subject_code when stream changes
    if (name === 'stream') {
      setFormData((s) => ({ ...s, stream: value, subject_code: '' }));
    }
  };

  const openAddModal = () => {
    setSelectedStudent(null);
    setFormData({
      std: '', roll_no: '', first_name: '', middle_name: '', last_name: '', 
      gender: '', phone1: '', phone2: '', address: '', pin: '', 
      class_code: '', subject_code: '', password: '', fees: '', 
      shift: '', stream: '',
    });
    setShowModal(true);
  };

  const openBulkModal = () => {
    setBulkResults(null);
    setBulkSubmitting(false);
    setBulkClassId('');
    setBulkText('');
    setShowBulkModal(true);
  };

  const normalizeHeader = (h: string) => String(h || '').trim().toLowerCase().replace(/\s+/g, '_');

  const parseBulkRows = (text: string) => {
    const lines = String(text || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    const splitLine = (line: string) => {
      const delimiter = line.includes('\t') ? '\t' : ',';
      return line.split(delimiter).map((c) => c.trim());
    };

    const headers = splitLine(lines[0]).map(normalizeHeader);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i]);
      const row: any = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = cols[j] ?? '';
      }
      if (row.first_name || row.last_name || row.roll_no) rows.push(row);
    }
    return rows;
  };

  const handleBulkSubmit = async () => {
    try {
      if (!bulkClassId) {
        toast.error('Please select a class');
        return;
      }
      const parsed = parseBulkRows(bulkText);
      if (!parsed.length) {
        toast.error('No rows found. Paste CSV/TSV with header row.');
        return;
      }

      const payloadStudents = parsed.map((r: any) => ({
        roll_no: r.roll_no || r.roll || r.rollnumber || r.roll_number,
        first_name: r.first_name || r.firstname,
        middle_name: r.middle_name || r.middlename,
        last_name: r.last_name || r.lastname,
        gender: r.gender,
        phone1: r.phone1 || r.phone || r.mobile,
        phone2: r.phone2,
        address: r.address,
        pin: r.pin || r.pincode,
        fees: r.fees,
        shift: r.shift,
        stream: r.stream,
        password: r.password,
      }));

      setBulkSubmitting(true);
      setBulkResults(null);
      const res = await studentAPI.bulkCreate({ classId: bulkClassId, students: payloadStudents });
      setBulkResults(res?.data);
      toast.success(`Created ${res?.data?.count || 0} students`);
      fetchStudents();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Bulk create failed';
      toast.error(msg);
      setBulkResults(err?.response?.data || null);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      std: student.std || '',
      roll_no: student.roll_no || '',
      first_name: student.first_name || '',
      middle_name: student.middle_name || '',
      last_name: student.last_name || '',
      gender: student.gender || '',
      phone1: student.phone1 || '',
      phone2: student.phone2 || '',
      address: student.address || '',
      pin: student.pin || '',
      class_code: student.class_code || '',
      subject_code: student.subject_code || '',
      password: '',
      fees: student.fees || '',
      shift: student.shift || '',
      stream: student.stream || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await studentAPI.delete(id);
        toast.success('Student deleted successfully');
        fetchStudents();
      } catch (error) {
        toast.error('Error deleting student');
      }
    }
  };

  const handleFormSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const required = ['std', 'first_name', 'last_name'];
      const missing = required.filter((f) => !formData[f] || String(formData[f]).trim() === '');
      if (missing.length) {
        toast.error(`Please fill required fields: ${missing.join(', ')}`);
        return;
      }

      // Validate subject_code for standards 10-12
      const standardNum = Number(formData.std);
      if (standardNum >= 10 && !formData.subject_code) {
        toast.error('Subject code is compulsory for standards 10, 11, and 12');
        return;
      }

      // Validate stream for standards 11-12
      if (standardNum >= 11 && !formData.stream) {
        toast.error('Stream is compulsory for standards 11 and 12');
        return;
      }

      const payload: any = { ...formData };
      payload.fees = payload.fees ? Number(payload.fees) : 0;

      if (selectedStudent) {
        await studentAPI.update(selectedStudent._id || selectedStudent.id, payload);
        toast.success('Student updated');
      } else {
        const res = await studentAPI.register(payload);
        if (res?.data?.generated_password) {
          toast.success(`Student added. Password: ${res.data.generated_password}`);
        } else {
          toast.success('Student added');
        }
      }
      setShowModal(false);
      fetchStudents();
    } catch (err) {
      const data = err.response?.data;
      if (data?.message === 'Validation error' && data.errors) {
        const msgs = Object.keys(data.errors).map((k) => `${k}: ${data.errors[k]}`);
        toast.error(msgs.join(' | '));
      } else if (data?.message) {
        toast.error(data.message);
      } else {
        toast.error('Error saving student');
      }
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.gr_number?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => (a.roll_no || 0) - (b.roll_no || 0));

  const streamOptions = getStreamOptions(formData.std);
  const subjectCodeOptions = getSubjectCodeOptions(formData.std, formData.stream);
  const isSubjectCodeRequired = Number(formData.std) >= 10;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students Management</h1>
          <p className="text-gray-600 mt-1">Manage all students in your school</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openBulkModal} className="btn-secondary flex items-center space-x-2 px-3 py-2 text-sm">
            <FaPlus className="text-sm" />
            <span>Bulk Add</span>
          </button>
          <button onClick={openAddModal} className="btn-primary flex items-center space-x-2 px-3 py-2 text-sm">
            <FaPlus className="text-sm" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3">
          <p className="text-xs text-gray-600">Total Students</p>
          <p className="text-xl font-bold text-primary-600">{students.length}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600">Active Students</p>
          <p className="text-xl font-bold text-green-600">
            {students.filter((s) => s.is_active).length}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600">Male Students</p>
          <p className="text-xl font-bold text-blue-600">
            {students.filter((s) => s.gender === 'Male').length}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-600">Female Students</p>
          <p className="text-xl font-bold text-pink-600">
            {students.filter((s) => s.gender === 'Female').length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search by name or GR number..."
            value={searchTerm}
            onChange={(e: any) => setSearchTerm(e.target.value)}
            className="input-field pl-10 py-2 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto shadow-sm">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Roll No
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    GR Id
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Student Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Class
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Standard
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Subject Code
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Gender
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Shift
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Stream
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Contact
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student, index) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {student.roll_no || index + 1}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.gr_number}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-7 w-7 flex-shrink-0 sm:h-8 sm:w-8">
                          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-medium text-xs">
                              {student.first_name?.charAt(0)}
                              {student.last_name?.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">
                            {student.first_name} {student.middle_name} {student.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {student.class_code || 'Not Assigned'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {student.std}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {student.subject_code || '—'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {student.gender}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {student.shift || 'N/A'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {student.stream || 'N/A'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {student.phone1}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          student.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-1.5">
                        <button 
                          onClick={() => navigate(`/admin/student-history/${student._id || student.id}`)} 
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="View History"
                        >
                          <FaHistory className="text-sm" />
                        </button>
                        <button 
                          onClick={() => openEditModal(student)} 
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit"
                        >
                          <FaEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDelete(student._id || student.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No students found</p>
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">{selectedStudent ? 'Edit Student' : 'Add Student'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Standard */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Standard <span className="text-red-500">*</span>
                </label>
                <select
                  name="std"
                  value={formData.std}
                  onChange={handleFormChange}
                  className="input-field py-2 text-sm"
                  required
                >
                  <option value="">Select Standard</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(s => (
                    <option key={s} value={s}>Class {s}</option>
                  ))}
                </select>
              </div>

              {/* Roll Number */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Roll Number
                </label>
                <input 
                  name="roll_no" 
                  value={formData.roll_no} 
                  onChange={handleFormChange} 
                  placeholder="Enter roll number" 
                  className="input-field py-2 text-sm" 
                />
              </div>

              {/* First Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input 
                  name="first_name" 
                  value={formData.first_name} 
                  onChange={handleFormChange} 
                  placeholder="Enter first name" 
                  className="input-field py-2 text-sm" 
                  required 
                />
              </div>

              {/* Middle Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Middle Name
                </label>
                <input 
                  name="middle_name" 
                  value={formData.middle_name} 
                  onChange={handleFormChange} 
                  placeholder="Enter middle name" 
                  className="input-field py-2 text-sm" 
                />
              </div>

              {/* Last Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input 
                  name="last_name" 
                  value={formData.last_name} 
                  onChange={handleFormChange} 
                  placeholder="Enter last name" 
                  className="input-field py-2 text-sm" 
                  required 
                />
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleFormChange} 
                  className="input-field py-2 text-sm"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Stream - Only show for standards 9-12 */}
              {streamOptions.length > 0 && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Stream {Number(formData.std) >= 11 && <span className="text-red-500">*</span>}
                  </label>
                  <select 
                    name="stream" 
                    value={formData.stream} 
                    onChange={handleFormChange} 
                    className="input-field py-2 text-sm"
                    required={Number(formData.std) >= 11}
                  >
                    <option value="">Select Stream</option>
                    {streamOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject Code */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Subject Code {isSubjectCodeRequired && <span className="text-red-500">*</span>}
                  {!isSubjectCodeRequired && <span className="text-gray-400 text-xs ml-1">(Optional)</span>}
                </label>
                <select 
                  name="subject_code" 
                  value={formData.subject_code} 
                  onChange={handleFormChange} 
                  className="input-field py-2 text-sm"
                  required={isSubjectCodeRequired}
                >
                  {subjectCodeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {isSubjectCodeRequired && (
                  <p className="text-xs text-red-500 mt-1">Subject code is compulsory for standards 10, 11, and 12</p>
                )}
              </div>

              {/* Primary Phone */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Primary Phone
                </label>
                <input 
                  name="phone1" 
                  value={formData.phone1} 
                  onChange={handleFormChange} 
                  placeholder="Enter primary phone number" 
                  className="input-field py-2 text-sm" 
                />
              </div>

              {/* Secondary Phone */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Secondary Phone
                </label>
                <input 
                  name="phone2" 
                  value={formData.phone2} 
                  onChange={handleFormChange} 
                  placeholder="Enter secondary phone number" 
                  className="input-field py-2 text-sm" 
                />
              </div>

              {/* Address */}
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input 
                  name="address" 
                  value={formData.address} 
                  onChange={handleFormChange} 
                  placeholder="Enter complete address" 
                  className="input-field py-2 text-sm" 
                />
              </div>

              {/* PIN Code */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  PIN Code
                </label>
                <input 
                  name="pin" 
                  value={formData.pin} 
                  onChange={handleFormChange} 
                  placeholder="Enter PIN code" 
                  className="input-field py-2 text-sm" 
                />
              </div>

              {/* Class Code */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Class Code
                </label>
                <input 
                  name="class_code" 
                  value={formData.class_code} 
                  onChange={handleFormChange} 
                  placeholder="e.g., CLS-10A" 
                  className="input-field py-2 text-sm" 
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input 
                  name="password" 
                  value={formData.password} 
                  onChange={handleFormChange} 
                  placeholder="Leave empty for auto-generate" 
                  type="password"
                  className="input-field py-2 text-sm" 
                />
                <p className="text-xs text-gray-500">Optional - leave blank to auto-generate</p>
              </div>

              {/* Fees */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Fees Amount
                </label>
                <input 
                  name="fees" 
                  value={formData.fees} 
                  onChange={handleFormChange} 
                  placeholder="Enter fees amount" 
                  type="number"
                  className="input-field py-2 text-sm" 
                />
              </div>

              {/* Shift */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Shift
                </label>
                <select 
                  name="shift" 
                  value={formData.shift} 
                  onChange={handleFormChange} 
                  className="input-field py-2 text-sm"
                >
                  <option value="">Select Shift</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-end space-x-2 mt-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-3 py-1.5 text-sm">Cancel</button>
                <button type="submit" className="btn-primary px-3 py-1.5 text-sm">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Students Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Bulk Add Students</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Class <span className="text-red-500">*</span></label>
                <select
                  value={bulkClassId}
                  onChange={(e) => setBulkClassId(e.target.value)}
                  className="input-field py-2 text-sm"
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.standard} {c.division} ({c.medium})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Class determines standard/medium/shift/stream defaults.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Expected columns</label>
                <p className="text-xs text-gray-600">
                  Required: <span className="font-medium">first_name</span>, <span className="font-medium">last_name</span>
                </p>
                <p className="text-xs text-gray-600">
                  Optional: roll_no, middle_name, gender, phone1, phone2, address, pin, fees, shift, stream, password
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <label className="block text-sm font-medium text-gray-700">Paste CSV/TSV</label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="input-field py-2 text-sm min-h-[180px] font-mono"
                placeholder={`first_name,last_name,roll_no,gender\nAarav,Patel,1,Male\nDiya,Shah,2,Female`}
              />
              <p className="text-xs text-gray-500">Tip: you can paste directly from Excel/Google Sheets (tab-separated works).</p>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowBulkModal(false)} className="btn-secondary px-3 py-1.5 text-sm">Close</button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={bulkSubmitting}
                className="btn-primary px-3 py-1.5 text-sm"
              >
                {bulkSubmitting ? 'Submitting...' : 'Create Students'}
              </button>
            </div>

            {bulkResults && (
              <div className="mt-5 space-y-3">
                <div className="card p-3">
                  <p className="text-sm text-gray-800">
                    Created: <span className="font-semibold">{bulkResults?.count ?? 0}</span>
                    {Array.isArray(bulkResults?.errors) ? (
                      <>
                        {' '}| Errors: <span className="font-semibold">{bulkResults.errors.length}</span>
                      </>
                    ) : null}
                  </p>
                </div>

                {Array.isArray(bulkResults?.errors) && bulkResults.errors.length > 0 && (
                  <div className="card p-3">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Row Errors</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {bulkResults.errors.map((e: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-sm text-gray-600">{(e.index ?? 0) + 2}</td>
                              <td className="px-3 py-2 text-sm text-gray-800">{e.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Row number includes header row (so +2).</p>
                  </div>
                )}

                {Array.isArray(bulkResults?.generated_credentials) && bulkResults.generated_credentials.length > 0 && (
                  <div className="card p-3">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Generated Passwords</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GR Number</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {bulkResults.generated_credentials.map((g: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-sm text-gray-600">{(g.index ?? 0) + 2}</td>
                              <td className="px-3 py-2 text-sm text-gray-800">{g.gr_number}</td>
                              <td className="px-3 py-2 text-sm font-mono text-gray-900">{g.password}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;