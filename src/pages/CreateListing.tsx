import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import type { ListingType } from '../types';
import { X } from 'lucide-react';

const COMMON_SKILLS = [
  'React', 'Node.js', 'Python', 'Machine Learning', 'UI/UX', 'Figma',
  'Java', 'C++', 'Tailwind', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker'
];

export const CreateListing = () => {
  const { addListing, currentUser } = useAppContext();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ListingType>('Project');
  const [intendedTeamSize, setIntendedTeamSize] = useState(2);
  const [deadline, setDeadline] = useState('');
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const handleAddSkill = (skill: string) => {
    if (skill && !requiredSkills.includes(skill)) {
      setRequiredSkills([...requiredSkills, skill]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter(s => s !== skill));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || requiredSkills.length === 0 || !currentUser) return;

    addListing({
      title,
      description,
      type,
      intendedTeamSize,
      requiredSkills,
      college: currentUser.college,
      deadline: deadline || undefined,
    });
    
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Listing</h1>
        <p className="text-slate-500 mt-1">Post a project or team to find collaborators.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Listing Details</CardTitle>
            <CardDescription>Fill out the information below to attract the right teammates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Title</label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. AI Study Assistant App" 
                required 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Project', 'Hackathon Team', 'Competition'] as ListingType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 px-3 border rounded-md text-sm transition-colors ${
                      type === t 
                        ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Description</label>
              <textarea 
                className="flex w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[120px] resize-y"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you're building and what kind of help you need..."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Total Team Size Needed</label>
                <Input 
                  type="number" 
                  min="2" 
                  max="10" 
                  value={intendedTeamSize} 
                  onChange={(e) => setIntendedTeamSize(parseInt(e.target.value))} 
                  required 
                />
                <p className="text-xs text-slate-500">Including yourself.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 flex items-center justify-between">
                  <span>Application Deadline</span>
                  <span className="text-xs font-normal text-slate-400">Optional</span>
                </label>
                <Input 
                  type="date" 
                  value={deadline} 
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-slate-500">When team recruitment closes.</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-900">Required Skills</label>
              
              <div className="flex gap-2">
                <Input 
                  value={skillInput} 
                  onChange={(e) => setSkillInput(e.target.value)} 
                  placeholder="e.g. React, Figma..." 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(skillInput.trim());
                    }
                  }}
                />
                <Button type="button" onClick={() => handleAddSkill(skillInput.trim())} variant="secondary">
                  Add
                </Button>
              </div>

              {requiredSkills.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {requiredSkills.map(skill => (
                    <Badge key={skill} className="pl-3 pr-1 py-1 flex items-center bg-primary-100 text-primary-800">
                      {skill}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-1 hover:bg-primary-200 p-0.5 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500 mb-2 mt-4">Suggested Skills:</p>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SKILLS.filter(s => !requiredSkills.includes(s)).slice(0, 8).map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleAddSkill(skill)}
                      className="text-xs border border-dashed border-slate-300 text-slate-500 px-2 py-1 rounded-full hover:bg-slate-50 hover:text-slate-700 transition-colors"
                    >
                      + {skill}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 p-6">
            <Button type="submit" className="w-full">
              Post Listing
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};
