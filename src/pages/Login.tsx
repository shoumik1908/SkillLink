import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Login = () => {
  const { users, setCurrentUser } = useAppContext();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState(users[0].id);

  const handleLogin = () => {
    const user = users.find(u => u.id === selectedUserId);
    if (user) {
      setCurrentUser(user);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl leading-none">S</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to SkillLink</CardTitle>
          <CardDescription>
            Select a mock user to log in and test the application flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {users.map(user => (
              <div 
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors flex items-center space-x-4 ${
                  selectedUserId === user.id 
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{user.name}</p>
                  <p className="text-sm text-slate-500">{user.college} • Year {user.yearOfStudy}</p>
                </div>
                <div className="text-xs text-slate-400">
                  {user.skills.length} skills
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" size="lg" onClick={handleLogin}>
            Continue to App
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
