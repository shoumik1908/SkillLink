import { useAppContext } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Users, Zap } from 'lucide-react';

export const Matches = () => {
  const { matches, listings, sendRequest, requests, currentUser } = useAppContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Your Matches</h1>
        <p className="text-slate-500 mt-1">Listings suggested for you based on your skill set.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {matches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500">No matches found at the moment. Add more skills to your profile!</p>
          </div>
        ) : (
          matches.map(match => {
            const listing = listings.find(l => l.id === match.listingId);
            if (!listing) return null;

            const hasRequested = requests.some(r => r.listingId === listing.id && r.studentId === currentUser?.id);
            const isFull = listing.currentTeamIds.length >= listing.intendedTeamSize;
            
            // Format score as percentage
            const scorePercent = Math.round(match.score * 100);
            
            // Color coding based on score
            const getScoreColor = (score: number) => {
              if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
              if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200";
              return "bg-slate-100 text-slate-800 border-slate-200";
            };

            return (
              <Card key={listing.id} className="overflow-hidden border-primary-100 hover:border-primary-200 hover:shadow-md transition-all relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"></div>
                <CardHeader className="pb-4 pl-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge variant="secondary" className="bg-primary-50 text-primary-700">
                          {listing.type}
                        </Badge>
                        <div className={`px-2 py-0.5 rounded-full border text-xs font-bold flex items-center ${getScoreColor(scorePercent)}`}>
                          <Zap className="w-3 h-3 mr-1" />
                          {scorePercent}% Match
                        </div>
                      </div>
                      <CardTitle className="text-xl mb-1">{listing.title}</CardTitle>
                      <CardDescription className="text-sm">
                        Posted in {listing.college}
                      </CardDescription>
                    </div>
                    <div className="flex items-center text-sm font-medium bg-slate-50 px-3 py-1 rounded-full border border-slate-100 text-slate-600">
                      <Users className="w-4 h-4 mr-2 text-slate-400" />
                      {listing.currentTeamIds.length} / {listing.intendedTeamSize}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 pl-8">
                  <p className="text-slate-700 text-sm leading-relaxed mb-6">
                    {listing.description}
                  </p>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Overlapping Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {match.overlappingSkills.map(skill => (
                        <Badge key={skill} className="bg-primary-500 text-white hover:bg-primary-600">
                          {skill}
                        </Badge>
                      ))}
                      {listing.requiredSkills.filter(s => !match.overlappingSkills.includes(s)).map(skill => (
                        <Badge key={skill} variant="outline" className="bg-slate-50 text-slate-400 border-slate-200">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 pl-8">
                  <div className="flex justify-end w-full">
                    {hasRequested ? (
                      <Button variant="outline" disabled>Request Sent</Button>
                    ) : isFull ? (
                      <Button variant="outline" disabled>Team Full</Button>
                    ) : (
                      <Button onClick={() => sendRequest(listing.id)} className="bg-primary-600 hover:bg-primary-700">
                        Request to Join
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
