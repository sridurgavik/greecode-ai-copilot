import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { auth, db } from '@/integrations/firebase/client';
import { doc, getDoc } from 'firebase/firestore';

interface UserProfileProps {
  userName?: string;
}

const ATSUserProfile = ({ userName }: UserProfileProps) => {
  const [userData, setUserData] = useState<any>(null);
  const [remainingScans, setRemainingScans] = useState(1);
  const user = auth.currentUser;
  
  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };
    
    fetchUserData();
  }, [user]);

  // Get display name from user data or props
  const displayName = userName || user?.displayName || userData?.name || 'User';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background/40 text-sm hover:bg-background/60 transition-colors">
          <User className="h-4 w-4" />
          <span>Hello, {displayName}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-medium">{displayName}</h4>
              <p className="text-sm text-muted-foreground">{user?.email || userData?.email}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {userData?.phone && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone:</span>
                <span>{userData.phone}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining scans today:</span>
              <span className="font-medium">{remainingScans}</span>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Free plan: 1 scan per day
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ATSUserProfile;