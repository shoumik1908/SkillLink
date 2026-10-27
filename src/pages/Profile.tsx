import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  User as UserIcon,
  LogOut,
  Settings,
  FileText,
  UploadCloud,
  ExternalLink,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  X,
  FileCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Profile = () => {
  const {
    currentUser,
    setCurrentUser,
    listings,
    uploadResume,
    deleteResume,
    updateProfile,
  } = useAppContext();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Profile modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [editYear, setEditYear] = useState(1);
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editSkillError, setEditSkillError] = useState<string | null>(null);

  // Inline quick add skill state
  const [isAddingSkillInline, setIsAddingSkillInline] = useState(false);
  const [inlineSkillText, setInlineSkillText] = useState('');
  const [inlineSkillError, setInlineSkillError] = useState<string | null>(null);

  if (!currentUser) return null;

  const myLists = listings.filter((l) => l.ownerId === currentUser.id);

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const handleOpenEditModal = () => {
    setEditName(currentUser.name || '');
    setEditBio(currentUser.bio || '');
    setEditCollege(currentUser.college || '');
    setEditYear(currentUser.yearOfStudy || 1);
    setEditSkills([...(currentUser.skills || [])]);
    setEditSkillError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({
        name: editName,
        bio: editBio,
        college: editCollege,
        yearOfStudy: Number(editYear),
        skills: editSkills,
      });
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddSkillToEdit = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    const isDuplicate = editSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      setEditSkillError(`"${trimmed}" is already in your skills list.`);
      return;
    }
    setEditSkills([...editSkills, trimmed]);
    setNewSkillInput('');
    setEditSkillError(null);
  };

  const handleRemoveSkillFromEdit = (skillToRemove: string) => {
    setEditSkills(editSkills.filter((s) => s.toLowerCase() !== skillToRemove.toLowerCase()));
  };

  const handleAddSkillInline = async () => {
    const trimmed = inlineSkillText.trim();
    if (!trimmed) return;
    const currentList = currentUser.skills || [];
    const isDuplicate = currentList.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      setInlineSkillError(`"${trimmed}" is already added.`);
      return;
    }

    setInlineSkillError(null);
    const updatedSkills = [...currentList, trimmed];
    await updateProfile({ skills: updatedSkills });
    setInlineSkillText('');
    setIsAddingSkillInline(false);
  };

  const handleRemoveSkillInline = async (skillToRemove: string) => {
    const currentList = currentUser.skills || [];
    const updatedSkills = currentList.filter(
      (s) => s.toLowerCase() !== skillToRemove.toLowerCase()
    );
    await updateProfile({ skills: updatedSkills });
  };

  // Resume file handling
  const handleFileProcess = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    // Validate type
    const validExtensions = ['.pdf', '.doc', '.docx'];
    const fileName = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExt) {
      setUploadError('Invalid file type. Please upload a PDF or Word document (.pdf, .doc, .docx).');
      return;
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds the 10MB limit. Please choose a smaller file.');
      return;
    }

    try {
      setIsUploading(true);
      await uploadResume(file);
      setUploadSuccess(`"${file.name}" uploaded successfully!`);
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to remove your resume?')) return;
    try {
      setIsDeleting(true);
      setUploadError(null);
      await deleteResume();
      setUploadSuccess('Resume removed successfully.');
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to delete resume.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Profile</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your personal credentials, skills, and resume</p>
        </div>
        <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-slate-900">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Main Profile Info Card */}
      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <div className="h-24 w-24 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 shadow-sm flex-shrink-0">
              <UserIcon className="w-12 h-12" />
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{currentUser.name}</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{currentUser.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEditModal}
                  className="self-center md:self-start border-slate-300 hover:bg-slate-50"
                >
                  <Settings className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              </div>

              {currentUser.bio && (
                <p className="text-slate-600 text-sm mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {currentUser.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
                <Badge variant="secondary" className="bg-slate-100 text-slate-700 px-3 py-1 font-medium">
                  {currentUser.college}
                </Badge>
                <Badge variant="secondary" className="bg-slate-100 text-slate-700 px-3 py-1 font-medium">
                  Year {currentUser.yearOfStudy}
                </Badge>
                {currentUser.resumeUrl && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> Resume Attached
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Skills Section */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900">Your Skills</h3>
              <span className="text-xs text-slate-400">Used for automated hackathon & project matching</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(currentUser.skills || []).map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-sm bg-purple-50 text-purple-700 border border-purple-200/80 rounded-full font-medium shadow-2xs group hover:bg-purple-100/70 transition-all"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkillInline(skill)}
                    className="text-purple-400 hover:text-red-500 rounded-full p-0.5 transition-colors focus:outline-none"
                    title={`Remove ${skill}`}
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              {isAddingSkillInline ? (
                <div className="inline-flex flex-col gap-1">
                  <div className="inline-flex items-center gap-1.5">
                    <Input
                      type="text"
                      placeholder="Skill name..."
                      value={inlineSkillText}
                      onChange={(e) => {
                        setInlineSkillText(e.target.value);
                        if (inlineSkillError) setInlineSkillError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkillInline()}
                      className="h-8 text-xs w-36 px-2.5 rounded-lg border-purple-300 focus:border-purple-500"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-2xs"
                      onClick={handleAddSkillInline}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-slate-400 hover:text-slate-600 rounded-lg"
                      onClick={() => {
                        setIsAddingSkillInline(false);
                        setInlineSkillText('');
                        setInlineSkillError(null);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {inlineSkillError && (
                    <span className="text-[11px] text-red-600 font-medium pl-1 animate-in fade-in duration-150">
                      {inlineSkillError}
                    </span>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingSkillInline(true);
                    setInlineSkillError(null);
                  }}
                  className="h-7 border-dashed border-slate-300 text-slate-500 hover:text-purple-600 hover:border-purple-300 rounded-full px-3 text-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Skill
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resume Upload Card */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-primary-50/30 border-b border-slate-200/80 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-600 text-white rounded-lg shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900 font-bold">Resume / Curriculum Vitae</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attach your resume so team leads and project owners can review your experience.
                </p>
              </div>
            </div>
            {currentUser.resumeUrl && (
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Active Resume
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Alerts */}
          {uploadError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-emerald-700 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
          />

          {currentUser.resumeUrl ? (
            /* Uploaded State Card */
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 transition-all hover:border-slate-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs uppercase shadow-xs flex-shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                      {currentUser.resumeName || 'Resume.pdf'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Uploaded & linked to your SkillLink applicant profile
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
                  <a
                    href={currentUser.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    <Button size="sm" className="bg-primary-600 hover:bg-primary-700 text-white shadow-xs">
                      <ExternalLink className="w-4 h-4 mr-1.5" /> View / Open
                    </Button>
                  </a>

                  <a
                    href={currentUser.resumeUrl}
                    download={currentUser.resumeName || 'Resume.pdf'}
                    className="inline-flex items-center"
                  >
                    <Button variant="outline" size="sm" className="border-slate-300 hover:bg-white text-slate-700">
                      <Download className="w-4 h-4 mr-1.5" /> Download
                    </Button>
                  </a>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="border-slate-300 hover:bg-white text-slate-700"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 mr-1.5" /> Replace
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteResume}
                    disabled={isDeleting}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Dropzone */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary-500 bg-primary-50/50 scale-[1.01]'
                  : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50/80 bg-slate-50/30'
              }`}
            >
              <div className="max-w-md mx-auto flex flex-col items-center">
                <div className="h-14 w-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-3 shadow-xs">
                  {isUploading ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <UploadCloud className="w-7 h-7" />
                  )}
                </div>

                <h4 className="text-base font-semibold text-slate-900 mb-1">
                  {isUploading ? 'Uploading Resume...' : 'Drop your resume here, or browse files'}
                </h4>
                <p className="text-xs text-slate-500 mb-4 max-w-sm">
                  Accepted formats: <strong className="text-slate-700">PDF, DOC, DOCX</strong> up to 10MB.
                  Once uploaded, teammates can view it directly when you request to join.
                </p>

                <Button
                  size="sm"
                  disabled={isUploading}
                  className="bg-primary-600 hover:bg-primary-700 text-white shadow-xs pointer-events-none"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing file...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" /> Select File to Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your Listings Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Listings</h3>
        {myLists.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              You haven't created any listings yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {myLists.map((listing) => (
              <Card key={listing.id} className="hover:border-slate-300 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-bold text-slate-900">{listing.title}</CardTitle>
                    <Badge variant="outline" className="border-slate-300 text-slate-700">
                      {listing.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 line-clamp-2">{listing.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {listing.requiredSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal Dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Edit Profile</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your Name"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Short Bio
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell potential teammates about yourself..."
                  rows={3}
                  className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    College / University
                  </label>
                  <Input
                    value={editCollege}
                    onChange={(e) => setEditCollege(e.target.value)}
                    placeholder="University Name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Year of Study
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={editYear}
                    onChange={(e) => setEditYear(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Skills
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium border border-primary-200"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkillFromEdit(skill)}
                        className="hover:text-red-500 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newSkillInput}
                    onChange={(e) => {
                      setNewSkillInput(e.target.value);
                      if (editSkillError) setEditSkillError(null);
                    }}
                    placeholder="Add a new skill (e.g. Docker, Figma)..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkillToEdit();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddSkillToEdit}>
                    Add
                  </Button>
                </div>
                {editSkillError && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium animate-in fade-in duration-150">
                    {editSkillError}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingProfile}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
