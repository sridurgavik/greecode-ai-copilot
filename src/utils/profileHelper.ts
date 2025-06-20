import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/integrations/firebase/client';

interface GitHubProfileInfo {
  username: string | null;
  url: string | null;
  isVerified: boolean;
}

interface LinkedInProfileInfo {
  username: string | null;
  url: string | null;
  isVerified: boolean;
}

interface UserProfileInfo {
  github: GitHubProfileInfo;
  linkedin: LinkedInProfileInfo;
}

/**
 * Extracts GitHub username from a GitHub URL
 */
export const extractGithubUsername = (url: string): string | null => {
  const match = url.match(/github\.com\/([\w-]+)/);
  return match ? match[1] : null;
};

/**
 * Extracts LinkedIn ID from a LinkedIn URL
 */
export const extractLinkedinId = (url: string): string | null => {
  const match = url.match(/linkedin\.com\/in\/([\w-]+)/);
  return match ? match[1] : null;
};

/**
 * Fetches the user's GitHub and LinkedIn profile information from Firestore
 */
export const fetchUserProfileInfo = async (): Promise<UserProfileInfo | null> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }
    
    const userDocRef = doc(db, "profiles", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const userData = userDoc.data();
    
    return {
      github: {
        username: userData.github_url ? extractGithubUsername(userData.github_url) : null,
        url: userData.github_url || null,
        isVerified: userData.is_github_verified || false
      },
      linkedin: {
        username: userData.linkedin_url ? extractLinkedinId(userData.linkedin_url) : null,
        url: userData.linkedin_url || null,
        isVerified: userData.is_linkedin_verified || false
      }
    };
  } catch (error) {
    console.error("Error fetching user profile info:", error);
    return null;
  }
};

/**
 * Checks if the user's message is asking about profile information
 */
export const isAskingAboutProfiles = (message: string): { 
  isAsking: boolean; 
  profileType: 'github' | 'linkedin' | 'both' | null;
} => {
  const lowerMessage = message.toLowerCase();
  
  // Keywords that might indicate questions about profiles
  const githubKeywords = [
    'github', 'repo', 'repository', 'project', 'code', 'library', 'libraries',
    'framework', 'package', 'module', 'dependency', 'dependencies', 'tech stack',
    'commit', 'pull request', 'pr', 'issue', 'fork', 'star', 'clone', 'git'
  ];
  
  const linkedinKeywords = [
    'linkedin', 'work experience', 'job', 'career', 'employment', 'position',
    'role', 'company', 'professional', 'skill', 'endorsement', 'recommendation',
    'connection', 'network', 'profile', 'resume', 'cv', 'work history'
  ];
  
  const questionWords = ['what', 'which', 'how', 'tell', 'explain', 'describe', 'list', 'show', 'find'];
  
  const isQuestion = questionWords.some(word => lowerMessage.includes(word));
  
  if (!isQuestion) {
    return { isAsking: false, profileType: null };
  }
  
  const mentionsGithub = githubKeywords.some(keyword => lowerMessage.includes(keyword));
  const mentionsLinkedin = linkedinKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (mentionsGithub && mentionsLinkedin) {
    return { isAsking: true, profileType: 'both' };
  } else if (mentionsGithub) {
    return { isAsking: true, profileType: 'github' };
  } else if (mentionsLinkedin) {
    return { isAsking: true, profileType: 'linkedin' };
  }
  
  return { isAsking: false, profileType: null };
};

/**
 * Enhances the system message with profile information if relevant
 */
export const enhanceSystemMessage = async (
  message: string,
  systemMessage: string
): Promise<string> => {
  const { isAsking, profileType } = isAskingAboutProfiles(message);
  
  if (!isAsking || !profileType) {
    return systemMessage;
  }
  
  const profileInfo = await fetchUserProfileInfo();
  
  if (!profileInfo) {
    return systemMessage;
  }
  
  let enhancedMessage = systemMessage;
  
  if (profileType === 'github' || profileType === 'both') {
    if (profileInfo.github.isVerified && profileInfo.github.username) {
      enhancedMessage += `\n\nThe user has a verified GitHub profile with username "${profileInfo.github.username}" at ${profileInfo.github.url}. If they're asking about specific repositories, projects, or technical details, you can reference this information.`;
    }
  }
  
  if (profileType === 'linkedin' || profileType === 'both') {
    if (profileInfo.linkedin.isVerified && profileInfo.linkedin.username) {
      enhancedMessage += `\n\nThe user has a verified LinkedIn profile at ${profileInfo.linkedin.url}. If they're asking about work experience, skills, or professional background, you can reference this information.`;
    }
  }
  
  return enhancedMessage;
};