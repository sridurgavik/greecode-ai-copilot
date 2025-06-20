import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, Copy, Play, Pause, RotateCcw, Clock, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { enhanceSystemMessage } from "@/utils/profileHelper";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  expectedTopics: string[];
}

// Sample interview questions for different categories
const interviewQuestions: InterviewQuestion[] = [
  {
    id: "algo1",
    question: "Explain how you would implement a function to check if a string is a palindrome.",
    category: "Algorithms",
    difficulty: "easy",
    expectedTopics: ["String manipulation", "Two-pointer technique"]
  },
  {
    id: "algo2",
    question: "How would you find all pairs of integers in an array that sum up to a given target?",
    category: "Algorithms",
    difficulty: "medium",
    expectedTopics: ["Hash maps", "Two-pointer technique"]
  },
  {
    id: "ds1",
    question: "Explain the difference between a stack and a queue, and provide a real-world example for each.",
    category: "Data Structures",
    difficulty: "easy",
    expectedTopics: ["Stack", "Queue", "LIFO", "FIFO"]
  },
  {
    id: "sys1",
    question: "How would you design a URL shortening service like bit.ly?",
    category: "System Design",
    difficulty: "hard",
    expectedTopics: ["Database design", "Hashing", "Load balancing", "Caching"]
  },
  {
    id: "beh1",
    question: "Tell me about a time when you had to deal with a difficult team member. How did you handle it?",
    category: "Behavioral",
    difficulty: "medium",
    expectedTopics: ["Conflict resolution", "Communication", "Team dynamics"]
  },
  {
    id: "js1",
    question: "Explain closures in JavaScript and provide an example of how they can be useful.",
    category: "JavaScript",
    difficulty: "medium",
    expectedTopics: ["Closures", "Scope", "Lexical environment"]
  },
];

const categories = ["All", "Algorithms", "Data Structures", "System Design", "Behavioral", "JavaScript"];
const difficulties = ["All", "easy", "medium", "hard"];

const GroqChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Welcome to the Interview Practice Module! Select a question category and difficulty to begin practicing, or type your own question below.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [practiceMode, setPracticeMode] = useState<"browse" | "answer" | "feedback">("browse");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter questions based on selected category and difficulty
  const getFilteredQuestions = () => {
    return interviewQuestions.filter(q => 
      (selectedCategory === "All" || q.category === selectedCategory) &&
      (selectedDifficulty === "All" || q.difficulty === selectedDifficulty)
    );
  };

  // Generate a dynamic question based on category and difficulty
  const generateDynamicQuestion = (): InterviewQuestion => {
    // Get base topics for the selected category
    const categoryTopics: Record<string, string[]> = {
      "Algorithms": ["sorting", "searching", "dynamic programming", "greedy algorithms", "graph algorithms", "recursion", "backtracking", "divide and conquer", "string manipulation", "bit manipulation"],
      "Data Structures": ["arrays", "linked lists", "stacks", "queues", "trees", "binary trees", "binary search trees", "heaps", "hash tables", "graphs", "tries", "segment trees"],
      "System Design": ["scalability", "load balancing", "caching", "database design", "microservices", "API design", "distributed systems", "fault tolerance", "consistency models", "message queues"],
      "Behavioral": ["teamwork", "leadership", "conflict resolution", "problem-solving", "adaptability", "communication", "time management", "project management", "decision making", "failure handling"],
      "JavaScript": ["closures", "promises", "async/await", "prototypes", "event loop", "DOM manipulation", "ES6 features", "functional programming", "state management", "performance optimization"],
      "Python": ["list comprehensions", "generators", "decorators", "context managers", "OOP concepts", "functional programming", "error handling", "modules and packages", "memory management", "concurrency"],
      "Java": ["OOP principles", "collections framework", "multithreading", "exception handling", "generics", "streams", "lambda expressions", "memory management", "design patterns", "annotations"],
      "System Architecture": ["monolithic vs microservices", "event-driven architecture", "serverless", "service mesh", "containerization", "orchestration", "CI/CD pipelines", "infrastructure as code", "observability", "security"]
    };
    
    // Get question templates based on difficulty
    const questionTemplates: Record<string, string[]> = {
      "easy": [
        "Explain the concept of {topic} and provide a simple example.",
        "What are the key characteristics of {topic}?",
        "How would you implement a basic {topic} solution?",
        "Compare and contrast {topic} with {related_topic}.",
        "What are the common use cases for {topic}?"
      ],
      "medium": [
        "Describe how you would optimize a {topic} implementation for better performance.",
        "Explain the tradeoffs involved when working with {topic}.",
        "How would you handle edge cases when implementing {topic}?",
        "Design a system that efficiently utilizes {topic} for {scenario}.",
        "What are the potential pitfalls when working with {topic} and how would you avoid them?"
      ],
      "hard": [
        "Design a scalable system using {topic} that can handle {complex_scenario}.",
        "How would you implement {topic} to solve {complex_problem}?",
        "Analyze the time and space complexity of different approaches to {topic}.",
        "Explain how you would debug and optimize a complex implementation of {topic}.",
        "How would you architect a system that combines {topic} with {related_topic} to achieve {goal}?"
      ]
    };
    
    // Select category and difficulty
    let category = selectedCategory;
    if (category === "All") {
      const availableCategories = Object.keys(categoryTopics);
      category = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    }
    
    let difficulty = selectedDifficulty;
    if (difficulty === "All") {
      const difficulties = ["easy", "medium", "hard"];
      difficulty = difficulties[Math.floor(Math.random() * difficulties.length)] as "easy" | "medium" | "hard";
    }
    
    // Select topics
    const topics = categoryTopics[category] || categoryTopics["Algorithms"];
    const primaryTopic = topics[Math.floor(Math.random() * topics.length)];
    const relatedTopic = topics.filter(t => t !== primaryTopic)[Math.floor(Math.random() * (topics.length - 1))];
    
    // Select template
    const templates = questionTemplates[difficulty] || questionTemplates["medium"];
    let template = templates[Math.floor(Math.random() * templates.length)];
    
    // Fill in template
    let question = template
      .replace("{topic}", primaryTopic)
      .replace("{related_topic}", relatedTopic)
      .replace("{scenario}", getScenario(category, difficulty))
      .replace("{complex_scenario}", getComplexScenario(category))
      .replace("{complex_problem}", getComplexProblem(category))
      .replace("{goal}", getGoal(category));
    
    // Generate expected topics
    const expectedTopics = [primaryTopic];
    if (template.includes(relatedTopic)) expectedTopics.push(relatedTopic);
    
    // Add more context based on category
    if (category === "Behavioral") {
      question += " Provide a specific example from your experience.";
    } else if (category === "System Design") {
      question += " Consider aspects like scalability, reliability, and performance in your answer.";
    }
    
    // Generate unique ID
    const id = `${category.toLowerCase().replace(/\s+/g, '-')}-${difficulty}-${Date.now().toString(36)}`;
    
    return {
      id,
      question,
      category,
      difficulty: difficulty as "easy" | "medium" | "hard",
      expectedTopics: expectedTopics.concat(getAdditionalTopics(category, difficulty))
    };
  };
  
  // Helper functions for question generation
  const getScenario = (category: string, difficulty: string): string => {
    const scenarios: Record<string, string[]> = {
      "Algorithms": ["sorting a large dataset", "searching in a complex structure", "optimizing a recursive solution", "processing streaming data"],
      "Data Structures": ["storing and retrieving user data", "implementing a cache", "managing a priority queue", "representing a social network"],
      "System Design": ["a social media platform", "an e-commerce website", "a video streaming service", "a ride-sharing application"],
      "JavaScript": ["a single-page application", "a real-time dashboard", "a collaborative editor", "a browser-based game"],
      "Python": ["data processing pipeline", "web scraping tool", "machine learning model", "automation script"],
      "Java": ["enterprise application", "mobile app backend", "distributed system", "high-performance computing task"],
      "System Architecture": ["cloud-native application", "multi-region deployment", "hybrid cloud solution", "edge computing system"]
    };
    
    const options = scenarios[category] || scenarios["Algorithms"];
    return options[Math.floor(Math.random() * options.length)];
  };
  
  const getComplexScenario = (category: string): string => {
    const scenarios: Record<string, string[]> = {
      "Algorithms": ["millions of real-time transactions", "petabytes of unstructured data", "constantly changing input conditions"],
      "Data Structures": ["billions of records with complex relationships", "real-time updates across distributed systems", "memory-constrained environments"],
      "System Design": ["global scale with billions of users", "sub-millisecond response times", "99.999% availability requirements", "petabyte-scale data processing"],
      "JavaScript": ["complex interactive visualizations", "collaborative editing with thousands of concurrent users", "offline-first applications with sync"],
      "System Architecture": ["multi-region, multi-cloud deployments", "zero-downtime migration strategies", "real-time analytics on streaming data"]
    };
    
    const options = scenarios[category] || scenarios["System Design"];
    return options[Math.floor(Math.random() * options.length)];
  };
  
  const getComplexProblem = (category: string): string => {
    const problems: Record<string, string[]> = {
      "Algorithms": ["finding the shortest path in a dynamic graph", "optimizing a computationally expensive operation", "detecting patterns in noisy data"],
      "Data Structures": ["efficiently storing and querying spatial data", "implementing a concurrent data structure", "designing a memory-efficient index"],
      "System Design": ["building a distributed consensus system", "implementing a globally consistent database", "designing a recommendation engine"],
      "JavaScript": ["building a framework with reactive state management", "implementing a virtual DOM", "creating a JIT compiler for JavaScript"],
      "Python": ["building a distributed task queue", "implementing a high-performance data processing pipeline", "creating a domain-specific language"],
      "Java": ["designing a custom garbage collector", "implementing a distributed transaction manager", "building a high-performance network library"]
    };
    
    const options = problems[category] || problems["Algorithms"];
    return options[Math.floor(Math.random() * options.length)];
  };
  
  const getGoal = (category: string): string => {
    const goals: Record<string, string[]> = {
      "Algorithms": ["optimal performance", "minimal memory usage", "maximum throughput", "lowest latency"],
      "Data Structures": ["efficient data retrieval", "minimal memory footprint", "thread safety", "fault tolerance"],
      "System Design": ["high availability", "horizontal scalability", "data consistency", "cost efficiency"],
      "JavaScript": ["responsive UI", "minimal bundle size", "backward compatibility", "accessibility"],
      "System Architecture": ["operational simplicity", "development velocity", "security compliance", "disaster recovery"]
    };
    
    const options = goals[category] || goals["System Design"];
    return options[Math.floor(Math.random() * options.length)];
  };
  
  const getAdditionalTopics = (category: string, difficulty: string): string[] => {
    const difficultyMultiplier = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
    const count = Math.min(1 + difficultyMultiplier, 4); // 2 for easy, 3 for medium, 4 for hard
    
    const additionalTopics: Record<string, string[]> = {
      "Algorithms": ["time complexity", "space complexity", "optimization techniques", "algorithm analysis", "edge cases", "input validation"],
      "Data Structures": ["memory management", "traversal techniques", "insertion/deletion operations", "search operations", "balancing techniques"],
      "System Design": ["scalability", "reliability", "availability", "maintainability", "security", "performance", "cost optimization"],
      "Behavioral": ["specific examples", "lessons learned", "impact assessment", "team dynamics", "communication skills", "problem-solving approach"],
      "JavaScript": ["browser compatibility", "performance optimization", "memory management", "security considerations", "best practices"],
      "Python": ["pythonic approach", "standard library usage", "performance considerations", "error handling", "code organization"],
      "Java": ["JVM optimization", "memory management", "concurrency control", "design patterns", "API design"]
    };
    
    const topics = additionalTopics[category] || additionalTopics["Algorithms"];
    const result: string[] = [];
    
    // Select random topics without repetition
    const shuffled = [...topics].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Select a random question from filtered list or generate a dynamic one
  const selectRandomQuestion = () => {
    // Generate a dynamic question based on filters
    const question = generateDynamicQuestion();
    setCurrentQuestion(question);
    setPracticeMode("answer");
    setTimerSeconds(0);
    setTimerActive(true);
    
    // Add question to messages
    setMessages([
      {
        role: "assistant",
        content: `**Interview Question (${question.category} - ${question.difficulty}):**\n\n${question.question}\n\nTimer has started. Take your time to think and respond when ready.`,
        timestamp: new Date(),
      },
    ]);
  };

  // Handle submitting an answer
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userInput = input.trim();
    setInput("");
    
    // Add user message to chat
    const userMessage = {
      role: "user" as const,
      content: userInput,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    
    // If in answer mode, switch to feedback mode
    if (practiceMode === "answer" && currentQuestion) {
      setTimerActive(false);
      setPracticeMode("feedback");
      
      // Add feedback from AI
      const systemMessage = `You are an expert technical interview coach. The user has responded to this ${currentQuestion.category} question: "${currentQuestion.question}". Their answer was: "${userInput}". Evaluate their answer, covering these key topics: ${currentQuestion.expectedTopics.join(", ")}. Be encouraging but honest. Provide constructive feedback on how they can improve.`;
      
      setIsLoading(true);
      setIsTyping(true);
      
      try {
        // Generate a rating for the response
        const rating = generateRating();
        const starRating = generateStarRating(rating);
        const improvedResponse = generateImprovedResponse(currentQuestion);
        
        callGroqAPI(userInput, systemMessage)
          .then(response => {
            // Format the response with rating and improved answer
            const enhancedResponse = `**Rating: ${starRating} (${rating}/5)**\n\n${response}\n\n**Improved Response Example:**\n${improvedResponse}`;
            
            // Add as a new message instead of simulating typing
            const aiResponse = {
              role: "assistant" as const,
              content: enhancedResponse,
              timestamp: new Date(),
            };
            
            setMessages(prev => [...prev, aiResponse]);
            setIsTyping(false);
            setIsLoading(false);
          })
          .catch(error => {
            console.error("API error:", error);
            // Fallback response if API fails
            const rating = generateRating();
            const starRating = generateStarRating(rating);
            const improvedResponse = generateImprovedResponse(currentQuestion);
            
            const fallbackResponse = `**Rating: ${starRating} (${rating}/5)**\n\nThank you for your answer! Here's some feedback:\n\nYou've touched on some important points about ${currentQuestion.question.split('?')[0]}.\n\nKey aspects to consider for this question include: ${currentQuestion.expectedTopics.join(", ")}.\n\n**Improved Response Example:**\n${improvedResponse}\n\nKeep practicing and try to incorporate these elements in your future answers!`;
            
            const aiResponse = {
              role: "assistant" as const,
              content: fallbackResponse,
              timestamp: new Date(),
            };
            
            setMessages(prev => [...prev, aiResponse]);
            setIsTyping(false);
            setIsLoading(false);
          });
      } catch (error) {
        console.error("Error sending message:", error);
        setIsLoading(false);
        setIsTyping(false);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // Handle general questions or custom interview questions
      try {
        let systemMessage = "You are an expert technical interview coach for the GreecodePro.ai platform. Provide detailed, accurate, and helpful responses to questions about algorithms, data structures, system design, programming languages, behavioral interviews, and career guidance.";
        
        setIsLoading(true);
        setIsTyping(true);
        
        callGroqAPI(userInput, systemMessage)
          .then(response => {
            const aiResponse = {
              role: "assistant" as const,
              content: response,
              timestamp: new Date(),
            };
            
            setMessages(prev => [...prev, aiResponse]);
            setIsTyping(false);
            setIsLoading(false);
          })
          .catch(error => {
            console.error("API error:", error);
            const fallbackResponse = simulateAPIResponse(userInput);
            
            const aiResponse = {
              role: "assistant" as const,
              content: fallbackResponse,
              timestamp: new Date(),
            };
            
            setMessages(prev => [...prev, aiResponse]);
            setIsTyping(false);
            setIsLoading(false);
          });
      } catch (error) {
        console.error("Error sending message:", error);
        setIsLoading(false);
        setIsTyping(false);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Reset practice session
  const resetPractice = () => {
    setCurrentQuestion(null);
    setPracticeMode("browse");
    setTimerActive(false);
    setTimerSeconds(0);
    setMessages([
      {
        role: "assistant",
        content: "Welcome to the Interview Practice Module! Select a question category and difficulty to begin practicing, or type your own question below.",
        timestamp: new Date(),
      },
    ]);
  };
  
  // Call Groq API
  const callGroqAPI = async (userInput: string, systemMessage: string): Promise<string> => {
    const apiKey = "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";
    
    try {
      // Enhance system message with profile information if relevant
      const enhancedSystemMessage = await enhanceSystemMessage(userInput, systemMessage);
      
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama3-70b-8192",
          messages: [
            {
              role: "system",
              content: enhancedSystemMessage
            },
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            { role: "user", content: userInput }
          ],
          temperature: 0.7,
          max_tokens: 800
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          }
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error("Error calling Groq API:", error);
      throw error;
    }
  };

  // Simulate API response for testing/fallback
  const simulateAPIResponse = (userInput: string): string => {
    // Generate more contextual responses based on user input
    const userInputLower = userInput.toLowerCase();
    let responseText = "";
    
    // Technical skills responses
    if (userInputLower.includes("algorithm") || userInputLower.includes("data structure")) {
      responseText = "Algorithms and data structures are fundamental to technical interviews. Here are key areas to focus on:\n\n1. **Time & Space Complexity Analysis** - Learn Big O notation and how to analyze your solutions\n2. **Arrays & Strings** - Two-pointer technique, sliding window, in-place operations\n3. **Linked Lists** - Traversal, reversal, detecting cycles\n4. **Trees & Graphs** - DFS, BFS, binary search trees, topological sort\n5. **Dynamic Programming** - Memoization, tabulation, common patterns\n6. **Sorting & Searching** - QuickSort, MergeSort, binary search variants\n\nWould you like me to elaborate on any specific area?";
    } 
    else if (userInputLower.includes("system design")) {
      responseText = "System design interviews assess your ability to design scalable, reliable, and maintainable systems. Here's a structured approach:\n\n1. **Requirements Clarification** - Functional & non-functional requirements\n2. **Capacity Estimation** - Traffic, storage, bandwidth calculations\n3. **System API Design** - Define key endpoints and data models\n4. **Database Schema** - SQL vs NoSQL, sharding strategies\n5. **High-Level Components** - Services, load balancers, caches\n6. **Detailed Design** - Focus on critical components\n7. **Bottlenecks & Tradeoffs** - Identify potential issues and solutions\n\nPopular topics include: URL shorteners, social media feeds, chat applications, and distributed file systems.";
    }
    else if (userInputLower.includes("javascript") || userInputLower.includes("frontend") || userInputLower.includes("front-end") || userInputLower.includes("react")) {
      responseText = "For frontend/JavaScript interviews, focus on these key areas:\n\n1. **JavaScript Fundamentals** - Closures, prototypes, this keyword, ES6+ features\n2. **Asynchronous JS** - Promises, async/await, event loop\n3. **DOM Manipulation** - Events, bubbling, delegation\n4. **React Core Concepts** - Virtual DOM, component lifecycle, hooks, state management\n5. **Performance Optimization** - Code splitting, memoization, lazy loading\n6. **Browser APIs** - Storage, fetch, service workers\n7. **CSS & Layout** - Flexbox, Grid, responsive design\n\nFor React specifically, understand hooks deeply (useState, useEffect, useContext, useReducer) and state management patterns.";
    }
    else if (userInputLower.includes("backend") || userInputLower.includes("back-end") || userInputLower.includes("api") || userInputLower.includes("server")) {
      responseText = "For backend engineering interviews, focus on these key areas:\n\n1. **API Design** - RESTful principles, GraphQL, authentication/authorization\n2. **Databases** - SQL vs NoSQL, indexing, query optimization, transactions\n3. **Caching Strategies** - Redis, in-memory caching, cache invalidation\n4. **Message Queues** - Kafka, RabbitMQ, async processing\n5. **Microservices** - Service boundaries, communication patterns, deployment\n6. **Security** - OWASP top 10, input validation, rate limiting\n7. **Scalability** - Horizontal vs vertical scaling, stateless design\n\nBe prepared to discuss tradeoffs between different architectural decisions and how they impact performance, reliability, and maintainability.";
    }
    else if (userInputLower.includes("behavioral") || userInputLower.includes("soft skill")) {
      responseText = "Behavioral interviews assess your soft skills and past experiences. Prepare using the STAR method (Situation, Task, Action, Result):\n\n**Common Questions:**\n1. Describe a challenging project you worked on\n2. Tell me about a time you disagreed with a team member\n3. How do you handle tight deadlines?\n4. Describe a situation where you showed leadership\n5. How do you prioritize competing tasks?\n\n**Key Soft Skills to Highlight:**\n- Communication & collaboration\n- Problem-solving & critical thinking\n- Adaptability & learning mindset\n- Leadership & initiative\n- Time management & organization\n\nPrepare 5-7 detailed stories from your experience that can be adapted to different behavioral questions.";
    }
    else if (userInputLower.includes("resume") || userInputLower.includes("cv")) {
      responseText = "For a strong technical resume:\n\n1. **Format & Structure**\n   - Clean, single-page layout (2 pages max for senior roles)\n   - Consistent formatting and bullet points\n   - Include GitHub/portfolio links\n\n2. **Content Best Practices**\n   - Use action verbs and quantify achievements (e.g., \"Reduced latency by 40%\")\n   - Focus on impact, not just responsibilities\n   - Tailor skills section to job description keywords\n   - Include relevant projects with technical details\n\n3. **ATS Optimization**\n   - Use standard section headings\n   - Incorporate keywords from job descriptions\n   - Avoid complex formatting or tables\n\nRemember to customize your resume for each application to highlight the most relevant experience.";
    }
    else if (userInputLower.includes("hello") || userInputLower.includes("hi")) {
      responseText = "Hello! I'm your technical interview preparation assistant. I can help with:\n\n- Algorithm and data structure problems\n- System design concepts\n- Frontend/Backend technical questions\n- Behavioral interview preparation\n- Resume optimization\n- Mock interview practice\n\nWhat specific area would you like to focus on today?";
    }
    else if (userInputLower.includes("interview")) {
      responseText = "Interview preparation requires a multi-faceted approach:\n\n1. **Research the Company** - Understand their products, culture, and recent news\n\n2. **Technical Preparation**\n   - Review core CS fundamentals (algorithms, data structures)\n   - Practice coding problems on platforms like LeetCode\n   - Prepare for system design if applicable\n   - Review the tech stack used by the company\n\n3. **Behavioral Preparation**\n   - Prepare stories using the STAR method\n   - Practice explaining your past projects concisely\n\n4. **Questions to Ask** - Prepare thoughtful questions about the role, team, and company\n\nWhich specific aspect would you like to focus on?";
    }
    else if (userInputLower.includes("python") || userInputLower.includes("java") || userInputLower.includes("c++") || userInputLower.includes("programming")) {
      responseText = "For programming language interviews, focus on these areas:\n\n1. **Language-Specific Features**\n   - Python: List comprehensions, generators, decorators, context managers\n   - Java: Collections framework, streams, concurrency, garbage collection\n   - C++: Memory management, STL, templates, move semantics\n\n2. **OOP Principles**\n   - Inheritance, encapsulation, polymorphism, abstraction\n   - Design patterns and their applications\n\n3. **Memory Management**\n   - Stack vs heap allocation\n   - Reference counting vs garbage collection\n\n4. **Performance Considerations**\n   - Time/space complexity analysis\n   - Language-specific optimizations\n\nWhat specific language or concept would you like to explore further?";
    }
    else {
      responseText = "I'm your technical interview preparation assistant, specialized in helping with:\n\n1. **Technical Topics**\n   - Algorithms & data structures\n   - System design principles\n   - Frontend/Backend concepts\n   - Language-specific questions (JavaScript, Python, Java, etc.)\n\n2. **Soft Skills**\n   - Behavioral interview preparation\n   - Communication strategies\n   - Problem-solving approaches\n\n3. **Career Guidance**\n   - Resume optimization\n   - Portfolio development\n   - Interview strategies\n\nPlease let me know which specific area you'd like assistance with, and I can provide detailed guidance.";
    }
    
    return responseText;
  };

  // Simulate real-time typing for a more natural feel
  const simulateRealTimeTyping = (fullResponse: string) => {
    setIsTyping(true);
    
    // Add rating and improved response if this is feedback mode
    let enhancedText = fullResponse;
    if (practiceMode === "feedback" && currentQuestion) {
      // Generate a rating based on the quality of the answer
      const rating = generateRating();
      const improvedResponse = generateImprovedResponse(currentQuestion);
      
      enhancedText = `**Rating: ${rating}/5**\n\n${fullResponse}\n\n**Improved Response:**\n${improvedResponse}`;
    }
    
    // Split the text into chunks to simulate typing
    const chunks = enhancedText.split(/(?<=\n\n|\n)/); // Split on paragraph breaks
    let currentIndex = 0;
    
    const typeNextChunk = () => {
      if (currentIndex < chunks.length) {
        const chunk = chunks[currentIndex];
        
        setMessages(prev => {
          const newMessages = [...prev];
          if (currentIndex === 0) {
            // Add a new message for the first chunk
            newMessages.push({
              role: "assistant",
              content: chunk,
              timestamp: new Date(),
            });
          } else {
            // Append to the last message for subsequent chunks
            const lastMessage = newMessages[newMessages.length - 1];
            lastMessage.content += chunk;
          }
          return newMessages;
        });
        
        currentIndex++;
        
        // Random delay between 100ms and 500ms for more natural typing
        const delay = Math.floor(Math.random() * 400) + 100;
        setTimeout(typeNextChunk, delay);
      } else {
        // Finished typing
        setIsTyping(false);
        setIsLoading(false);
      }
    };
    
    // Start typing
    typeNextChunk();
  };
  
  // Generate a rating for the user's answer
  const generateRating = (): number => {
    // In a real implementation, this would analyze the user's answer
    // For now, generate a random rating between 3 and 5
    return Math.floor(Math.random() * 3) + 3;
  };
  
  // Generate star display for ratings
  const generateStarRating = (rating: number): string => {
    const maxRating = 5;
    let stars = '';
    
    for (let i = 1; i <= maxRating; i++) {
      if (i <= rating) {
        stars += '★'; // Filled star
      } else {
        stars += '☆'; // Empty star
      }
    }
    
    return stars;
  };
  
  // Generate an improved response example
  const generateImprovedResponse = (question: InterviewQuestion): string => {
    const improvedResponses: Record<string, string[]> = {
      "Algorithms": [
        "I would approach this by first understanding the problem constraints. For a sorting algorithm, I'd analyze the input characteristics to choose the most efficient approach. For example, if we know the data is mostly sorted, insertion sort could be O(n) in the best case. If we need guaranteed O(n log n) performance, I'd use merge sort or quicksort. I'd also consider space complexity - merge sort requires O(n) extra space while quicksort can be implemented with O(log n) stack space.",
        "When implementing a search algorithm, I'd first determine if the data is sorted. For sorted data, binary search provides O(log n) time complexity. For unsorted data, we might need a hash table for O(1) lookups or a linear search in O(n) time. I'd also consider edge cases like empty collections, duplicates, and boundary conditions."
      ],
      "Data Structures": [
        "For this problem, I'd use a combination of a hash map and a doubly linked list to implement an LRU cache. The hash map provides O(1) lookups while the linked list maintains the order of access. When we reach capacity, we can efficiently remove the least recently used item from the tail of the list. This gives us O(1) time complexity for both get and put operations.",
        "I would implement this using a balanced binary search tree like a Red-Black tree or AVL tree. This would give us O(log n) time complexity for insertions, deletions, and lookups while maintaining the elements in sorted order. For range queries, this is more efficient than a hash table which doesn't preserve order."
      ],
      "System Design": [
        "I would design this system with a microservices architecture. The front-end would be a React SPA communicating with backend services via REST APIs. For data storage, I'd use a combination of PostgreSQL for relational data and Redis for caching. To handle scale, I'd implement horizontal scaling with load balancers, database read replicas, and a CDN for static assets. For reliability, I'd use circuit breakers, retries with exponential backoff, and implement comprehensive monitoring and alerting.",
        "For this distributed system, I'd use a consistent hashing algorithm to distribute data across nodes, which minimizes redistribution when nodes are added or removed. I'd implement a leader election protocol using Raft or Paxos for consensus. To handle network partitions, I'd choose an appropriate consistency model based on requirements - either CP or AP according to the CAP theorem."
      ],
      "Behavioral": [
        "In my previous role at XYZ Corp, I faced a challenging situation where our team had conflicting priorities between meeting a deadline and ensuring code quality. I organized a meeting with stakeholders to clarify business priorities and technical constraints. I proposed breaking the feature into smaller, independently deployable components, which allowed us to deliver critical functionality on time while scheduling less urgent components for later sprints. This approach satisfied business needs while maintaining our engineering standards.",
        "When I joined my previous team, I noticed inefficiencies in our code review process that were causing delays. I took the initiative to document best practices and created a code review checklist. I also set up automated linting and testing in our CI pipeline to catch common issues before review. These changes reduced our review cycles by 40% and improved code quality metrics."
      ],
      "JavaScript": [
        "To implement this feature, I would use React hooks, specifically useState and useEffect. The useState hook would manage the component's state, while useEffect would handle side effects like API calls. I'd also implement proper error handling and loading states. For state management across components, I'd use React Context or Redux depending on the complexity. Here's how I would structure the component...",
        "I would implement this using JavaScript Promises and async/await for cleaner asynchronous code. For handling multiple API calls, I'd use Promise.all for parallel execution or create a sequential chain for dependent operations. I'd also implement proper error handling with try/catch blocks and ensure the UI provides appropriate feedback during loading and error states."
      ]
    };
    
    const categoryResponses = improvedResponses[question.category] || improvedResponses["Algorithms"];
    return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
  };
  
  // Generate chat suggestions based on context
  const generateChatSuggestions = (): string[] => {
    if (practiceMode === "answer" && currentQuestion) {
      // When user is answering a question
      return ["I don't know this one", "Can you give me a hint?", "Let me think about it..."];
    } else if (practiceMode === "feedback") {
      // After AI has given feedback
      return ["Try another question", "Let me try again", "Explain this topic more"];
    } else {
      // General suggestions
      return ["Tell me about system design", "JavaScript interview tips", "Behavioral question examples"];
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion === "I don't know this one" && currentQuestion) {
      // Special handling for "I don't know"
      const userMessage = {
        role: "user" as const,
        content: "I don't know the answer to this question.",
        timestamp: new Date(),
      };

      // First add the user message
      setMessages((prev) => [...prev, userMessage]);
      setTimerActive(false);
      setPracticeMode("feedback");
      
      // Add a loading indicator message that will be replaced
      setIsTyping(true);
      setIsLoading(true);
      
      // Generate an explanation response
      const systemMessage = `You are an expert technical interview coach. The user doesn't know the answer to this ${currentQuestion.category} question: "${currentQuestion.question}". Provide a clear, educational explanation covering: ${currentQuestion.expectedTopics.join(", ")}. Be encouraging and constructive. Start with 'Don't worry if you didn't know the answer at first. It's completely normal! Let's break it down together.'`;
      
      try {
        callGroqAPI("Please explain the answer to this question", systemMessage)
          .then(response => {
            // Ensure the response is properly formatted as an AI message
            const aiResponse = {
              role: "assistant" as const,
              content: response,
              timestamp: new Date(),
            };
            
            // Add the AI response as a separate message
            setMessages(prev => [...prev, aiResponse]);
            setIsTyping(false);
            setIsLoading(false);
          })
          .catch(error => {
            console.error("API error:", error);
            const fallbackResponse = `Don't worry if you didn't know the answer at first. It's completely normal! Let's break it down together.\n\nHere's an explanation of ${currentQuestion.question.split('?')[0]}:\n\n` + 
              generateExplanation(currentQuestion.category, currentQuestion.expectedTopics);
            
            // Add the fallback response as a separate AI message
            const aiResponse = {
              role: "assistant" as const,
              content: fallbackResponse,
              timestamp: new Date(),
            };
            
            setMessages(prev => [...prev, aiResponse]);
            setIsTyping(false);
            setIsLoading(false);
          });
      } catch (error) {
        console.error("Error handling suggestion:", error);
        setIsLoading(false);
        setIsTyping(false);
      }
    } else if (suggestion === "Try another question") {
      resetPractice();
      setTimeout(() => selectRandomQuestion(), 300);
    } else {
      // For all other suggestions, just set the input
      setInput(suggestion);
    }
  };
  
  // Generate explanation for "I don't know" fallback
  const generateExplanation = (category: string, topics: string[]): string => {
    const explanations: Record<string, string> = {
      "Algorithms": "When approaching algorithm problems, always start by understanding the problem constraints and requirements. Consider time and space complexity from the beginning. For this specific question, you would want to break down the problem into smaller steps, identify patterns, and consider edge cases.\n\nA good approach would include:\n1. Clarifying the requirements\n2. Working through examples\n3. Considering different approaches (brute force vs optimized)\n4. Analyzing time and space complexity\n5. Implementing the solution with clean code",
      
      "Data Structures": "When working with data structures, it's important to understand their strengths and weaknesses. Each data structure has specific operations that it performs efficiently, and choosing the right one can significantly impact your solution's performance.\n\nFor this question, consider:\n1. What operations need to be performed frequently (insertion, deletion, search)?\n2. What are the space constraints?\n3. Is ordering important?\n4. Are there any specialized operations needed?",
      
      "System Design": "System design questions test your ability to design scalable, reliable, and maintainable systems. When approaching such questions, it's important to follow a structured approach:\n\n1. Clarify requirements and constraints\n2. Estimate scale (users, data volume, bandwidth)\n3. Define API endpoints\n4. Design high-level components\n5. Address data storage needs\n6. Consider scalability, reliability, and performance\n7. Discuss trade-offs in your design",
      
      "Behavioral": "Behavioral questions assess your soft skills and past experiences. The STAR method (Situation, Task, Action, Result) is an effective framework for structuring your answers.\n\nWhen answering:\n1. Describe the specific situation\n2. Explain the task or challenge you faced\n3. Detail the actions you took\n4. Share the results and what you learned\n\nIt's important to be specific, authentic, and reflective in your responses.",
      
      "JavaScript": "JavaScript interview questions often test your understanding of the language's unique features and common patterns. Key areas to focus on include closures, prototypes, asynchronous programming, and ES6+ features.\n\nWhen answering JavaScript questions:\n1. Demonstrate understanding of core concepts\n2. Provide practical examples\n3. Explain potential pitfalls\n4. Discuss best practices and performance considerations"
    };
    
    const topicSpecificContent = topics.map(topic => `**${topic.charAt(0).toUpperCase() + topic.slice(1)}**: This is a crucial aspect to understand for this question. Make sure you can explain how ${topic} works and its practical applications.`).join('\n\n');
    
    return (explanations[category] || explanations["Algorithms"]) + "\n\n" + topicSpecificContent + "\n\nPractice more questions like this to improve your understanding and confidence!";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied",
        description: "Message copied to clipboard.",
      });
    } catch (error) {
      console.error("Copy error:", error);
      toast({
        title: "Error",
        description: "Failed to copy message.",
        variant: "destructive",
      });
    }
  };
  
  // Format timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center justify-between">
            <div className="flex items-center">
              <MessageCircle className="mr-2 h-5 w-5" />
              Interview Practice Module
            </div>
            {practiceMode !== "browse" && (
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>{formatTime(timerSeconds)}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={() => setTimerActive(!timerActive)}
                >
                  {timerActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={resetPractice}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="flex flex-col h-full">
            {practiceMode === "browse" && (
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Difficulty</label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficulties.map(difficulty => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty === "All" ? difficulty : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="col-span-2 mt-2" 
                  onClick={selectRandomQuestion}
                >
                  Start Practice Session
                </Button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto pr-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: message.content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                    <div className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start mb-4">
                  <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-current animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Chat suggestions */}
            {!isTyping && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
              <div className="flex flex-wrap gap-2 mb-3 mt-1">
                {generateChatSuggestions().map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs py-1 h-auto"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}
            
            <div className="mt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex space-x-2"
              >
                <Input
                  placeholder={practiceMode === "answer" ? "Type your answer here..." : "Ask a question or type your own interview question..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              
              {/* Moved the Try Another Question button into the suggestions */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroqChat;