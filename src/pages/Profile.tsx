import { useAppContext } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { User, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Profile = () => {
  const { currentUser, setCurrentUser, listings } = useAppContext();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const myLists = listings.filter(l => l.ownerId === currentUser.id);

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Profile</h1>
        <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-slate-900">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <div className="h-24 w-24 bg-primary-100 rounded-full flex items-center justify-center text-primary-700">
              <User className="w-12 h-12" />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-slate-900">{currentUser.name}</h2>
              <p className="text-slate-500 mt-1">{currentUser.email}</p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
                <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                  {currentUser.college}
                </Badge>
                <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                  Year {currentUser.yearOfStudy}
                </Badge>
              </div>
            </div>

            <Button variant="outline" size="sm" className="hidden md:flex">
              <Settings className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Skills</h3>
            <div className="flex flex-wrap gap-2">
              {currentUser.skills.map(skill => (
                <Badge key={skill} className="px-3 py-1 text-sm bg-primary-100 text-primary-800 hover:bg-primary-200">
                  {skill}
                </Badge>
              ))}
              <Button variant="outline" size="sm" className="h-7 border-dashed border-slate-300 text-slate-500 rounded-full px-3">
                + Add Skill
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
            {myLists.map(listing => (
              <Card key={listing.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between">
                    <CardTitle className="text-lg">{listing.title}</CardTitle>
                    <Badge variant="outline">{listing.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 line-clamp-2">{listing.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
