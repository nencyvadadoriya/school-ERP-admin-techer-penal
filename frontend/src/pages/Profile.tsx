import React, { useEffect, useState, useRef, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { adminAPI, teacherAPI, studentAPI } from '../services/api';
import { FaUser, FaEnvelope, FaPhone, FaIdCard, FaSchool, FaUserGraduate, FaChalkboardTeacher, FaPencilAlt, FaUpload, FaTrashAlt } from 'react-icons/fa';

const Profile: React.FC = () => {
  const { user, login } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const role = user?.role;

  const roleConfig = {
    admin: { label: 'Administrator', icon: FaUser, color: 'bg-purple-500', id: user?.email },
    teacher: { label: 'Teacher', icon: FaChalkboardTeacher, color: 'bg-green-500', id: user?.teacher_code },
    student: { label: 'Student', icon: FaUserGraduate, color: 'bg-blue-500', id: user?.gr_number },
  };
  const cfg = roleConfig[role as keyof typeof roleConfig] || roleConfig.admin;

  useEffect(() => {
    if (!selectedFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      return;
    }
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      toast.error('Please select an image');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('profile_image', selectedFile);
      
      let response: any;
      const userId = user._id || user.id;
      
      console.log('Uploading for role:', user.role);
      console.log('User ID:', userId);
      
      // Use the updateImage method from your API
      if (user.role === 'admin') {
        response = await adminAPI.updateImage(userId, formData);
      } else if (user.role === 'teacher') {
        response = await teacherAPI.updateImage(userId, formData);
      } else {
        response = await studentAPI.updateImage(userId, formData);
      }
      
      console.log('Upload response:', response);
      
      // Check if response has the updated user data
      const updatedUser = response?.data?.data || response?.data;
      if (updatedUser) {
        const currentToken = localStorage.getItem('token') || '';
        login(updatedUser, currentToken);
        toast.success('Profile photo updated successfully!');
        setSelectedFile(null);
        setPreview(null);
      } else {
        // If no user data returned, just refresh the user data
        const refreshResponse = await getUserData(user.role, userId);
        if (refreshResponse?.data?.data || refreshResponse?.data) {
          const refreshedUser = refreshResponse?.data?.data || refreshResponse?.data;
          const currentToken = localStorage.getItem('token') || '';
          login(refreshedUser, currentToken);
          toast.success('Profile photo updated successfully!');
        } else {
          toast.success('Profile photo uploaded successfully!');
        }
        setSelectedFile(null);
        setPreview(null);
      }
    } catch (err: any) {
      console.error('Upload error details:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error ||
                          err.message || 
                          'Upload failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Helper function to refresh user data
  const getUserData = async (role: string, userId: string) => {
    if (role === 'admin') {
      return await adminAPI.getById(userId);
    } else if (role === 'teacher') {
      return await teacherAPI.getById(userId);
    } else {
      return await studentAPI.getById(userId);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    
    try {
      setUploading(true);
      const userId = user._id || user.id;
      
      // Send update with remove_profile_image flag
      const updateData = { remove_profile_image: true };
      
      let response: any;
      if (user.role === 'admin') {
        response = await adminAPI.update(userId, updateData);
      } else if (user.role === 'teacher') {
        response = await teacherAPI.update(userId, updateData);
      } else {
        response = await studentAPI.update(userId, updateData);
      }
      
      const updatedUser = response?.data?.data || response?.data;
      if (updatedUser) {
        const currentToken = localStorage.getItem('token') || '';
        login(updatedUser, currentToken);
        toast.success('Profile photo removed successfully');
      }
    } catch (err: any) {
      console.error('Remove error:', err);
      toast.error(err.response?.data?.message || err.message || 'Remove failed');
    } finally {
      setUploading(false);
    }
  };

  const currentProfileImage = user?.profile_image;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your personal information and profile photo</p>
      </div>

      {/* ID Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
        {/* Header with gradient color */}
        <div className={`${cfg.color} h-28 relative`}>
          {/* Profile Image Container */}
          <div className="absolute -bottom-12 left-6 z-10">
            <div className="relative">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-md overflow-hidden">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : currentProfileImage ? (
                  <img src={currentProfileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <cfg.icon className="text-4xl text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Edit Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -right-1 -bottom-1 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-xs text-gray-700 hover:bg-gray-50 hover:shadow-lg transition-all duration-200 focus:outline-none"
                title="Change profile photo"
              >
                <FaPencilAlt className="text-xs" />
              </button>
            </div>
          </div>
          
          {/* Right side text on header */}
          <div className="absolute top-4 right-6 text-white text-right">
            <p className="text-xs opacity-80 uppercase tracking-wider">School ERP</p>
            <p className="text-sm font-bold">{cfg.label} ID Card</p>
          </div>
        </div>
        
        {/* Body Section */}
        <div className="pt-14 px-6 pb-6">
          {/* User Name and Role */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">{user?.first_name} {user?.last_name}</h2>
            <p className="text-sm text-gray-500">{cfg.label}</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors duration-200"
            >
              <FaUpload className="text-xs" />
              Choose Image
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                uploading || !selectedFile
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
              }`}
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <FaUpload className="text-xs" />
                  Upload
                </>
              )}
            </button>
            <button
              onClick={handleRemove}
              disabled={uploading || !currentProfileImage}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                uploading || !currentProfileImage
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              <FaTrashAlt className="text-xs" />
              Remove
            </button>
          </div>
          
          {/* Information Grid - 2 columns as requested */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* ID Card */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <div className="w-8 h-8 flex items-center justify-center bg-primary-100 rounded-full">
                <FaIdCard className="text-primary-600 text-sm" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">ID</p>
                <p className="font-medium text-sm text-gray-900">{cfg.id || '—'}</p>
              </div>
            </div>
            
            {/* Email */}
            {user?.email && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="w-8 h-8 flex items-center justify-center bg-primary-100 rounded-full">
                  <FaEnvelope className="text-primary-600 text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="font-medium text-sm text-gray-900 truncate">{user.email}</p>
                </div>
              </div>
            )}
            
            {/* Phone */}
            {(user?.phone || user?.phone1) && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="w-8 h-8 flex items-center justify-center bg-primary-100 rounded-full">
                  <FaPhone className="text-primary-600 text-sm" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                  <p className="font-medium text-sm text-gray-900">{user.phone || user.phone1}</p>
                </div>
              </div>
            )}
            
            {/* Class Code */}
            {user?.class_code && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="w-8 h-8 flex items-center justify-center bg-primary-100 rounded-full">
                  <FaSchool className="text-primary-600 text-sm" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Class</p>
                  <p className="font-medium text-sm text-gray-900">{user.class_code}</p>
                </div>
              </div>
            )}
            
            {/* Standard */}
            {user?.std && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="w-8 h-8 flex items-center justify-center bg-primary-100 rounded-full">
                  <FaSchool className="text-primary-600 text-sm" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Standard</p>
                  <p className="font-medium text-sm text-gray-900">{user.std}</p>
                </div>
              </div>
            )}
            
            {/* Experience */}
            {role === 'teacher' && user?.experience != null && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="w-8 h-8 flex items-center justify-center bg-primary-100 rounded-full">
                  <FaChalkboardTeacher className="text-primary-600 text-sm" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Experience</p>
                  <p className="font-medium text-sm text-gray-900">{user.experience} years</p>
                </div>
              </div>
            )}
          </div>
          
          {/* About Section */}
          {user?.about && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">About</p>
              <p className="text-sm text-gray-700 leading-relaxed">{user.about}</p>
            </div>
          )}
        </div>
        
        {/* Bottom accent bar */}
        <div className={`${cfg.color} h-1`}></div>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default Profile;