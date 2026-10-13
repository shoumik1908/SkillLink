import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Users, Code, Trophy, Sparkles, Calendar } from 'lucide-react';
import type { ListingType } from '../types';

export const Feed = () => {
  const { listings, sendRequest, requests, currentUser } = useAppContext();
  const [filterType, setFilterType] = useState<ListingType | 'All'>('All');

  const filteredListings = filterType === 'All' 
    ? listings 
    : listings.filter(l => l.type === filterType);

  const getIconForType = (type: ListingType) => {
    switch(type) {
      case 'Project': return <Code className="w-4 h-4 mr-1.5" />;
      case 'Hackathon Team': return <Sparkles className="w-4 h-4 mr-1.5" />;
      case 'Competition': return <Trophy className="w-4 h-4 mr-1.5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Campus Feed</h1>
          <p className="text-slate-500 mt-1">Discover projects and teams looking for your skills.</p>
        </div>
        
        <div className="flex bg-white border border-slate-200 rounded-lg p-1 space-x-1 shadow-sm">
          {['All', 'Project', 'Hackathon Team', 'Competition'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                filterType === type 
                  ? 'bg-slate-100 text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredListings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500">No listings found matching your filters.</p>
          </div>
        ) : (
          filteredListings.map(listing => {
            const hasRequested = requests.some(r => r.listingId === listing.id && r.studentId === currentUser?.id);
            const isOwner = listing.ownerId === currentUser?.id;
            const isFull = listing.currentTeamIds.length >= listing.intendedTeamSize;

            return (
              <Card key={listing.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="secondary">
                          {getIconForType(listing.type)}
                          {listing.type}
                        </Badge>
                        {listing.deadline && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-100 flex items-center space-x-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>Deadline: {new Date(listing.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </span>
                        )}
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
                <CardContent className="pb-4">
                  <p className="text-slate-700 text-sm leading-relaxed mb-6">
                    {listing.description}
                  </p>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {listing.requiredSkills.map(skill => (
                        <Badge key={skill} variant="outline" className="bg-slate-50">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50 border-t border-slate-100 p-4">
                  <div className="flex justify-end w-full">
                    {isOwner ? (
                      <Button variant="secondary" disabled>Your Listing</Button>
                    ) : hasRequested ? (
                      <Button variant="outline" disabled>Request Sent</Button>
                    ) : isFull ? (
                      <Button variant="outline" disabled>Team Full</Button>
                    ) : (
                      <Button onClick={() => sendRequest(listing.id)}>
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
