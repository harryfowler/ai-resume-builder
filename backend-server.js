// Backend Server - server.js
// This handles user accounts, data storage, and AI API calls

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());
app.use(cors());

// Environment variables (store these securely in .env file)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Your free Gemini API key

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// In-memory storage (replace with actual database like MongoDB or PostgreSQL)
const users = new Map(); // Store users: { email: { password, id, resumes } }
const resumes = new Map(); // Store resumes: { resumeId: { userId, data, timestamp } }

// ========== AUTHENTICATION ENDPOINTS ==========

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (users.has(email)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = Date.now().toString();
    
    users.set(email, {
      id: userId,
      email,
      name,
      password: hashedPassword,
      resumes: [],
      createdAt: new Date()
    });
    
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      token, 
      user: { id: userId, email, name } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// ========== AI ENDPOINTS ==========

// Generate resume using Gemini AI
app.post('/api/ai/generate-resume', async (req, res) => {
  try {
    const { userInput, style, additionalContext } = req.body;
    
    // Construct prompt for Gemini
    const prompt = buildResumePrompt(userInput, style, additionalContext);
    
    // Call Gemini API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse Gemini's response
    const resumeData = parseAiResponse(text);
    
    res.json({ 
      success: true, 
      resume: resumeData
    });
    
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate resume' });
  }
});

// Get AI suggestions as user types (real-time)
app.post('/api/ai/suggestions', async (req, res) => {
  try {
    const { currentText, cursorPosition } = req.body;
    
    const prompt = `Given this partial resume text, suggest 3-4 specific improvements. Be brief and actionable:\n\n${currentText}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Split suggestions by lines and clean up
    const suggestions = text
      .split('\n')
      .filter(s => s.trim())
      .filter(s => s.length > 10)
      .slice(0, 4);
    
    res.json({ 
      suggestions: suggestions
    });
    
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Analyze missing information
app.post('/api/ai/analyze-missing', async (req, res) => {
  try {
    const { resumeData } = req.body;
    
    const prompt = `Analyze this resume and suggest what crucial information is missing. Return ONLY a JSON array of specific suggestions:\n\n${JSON.stringify(resumeData)}\n\nFormat: ["suggestion 1", "suggestion 2", ...]`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse as JSON
    let missingInfo = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        missingInfo = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback: split by lines
      missingInfo = text.split('\n').filter(s => s.trim()).slice(0, 5);
    }
    
    res.json({ missingInfo });
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

// Import from LinkedIn
app.post('/api/linkedin/import', async (req, res) => {
  try {
    const { linkedinUrl } = req.body;
    
    // Note: LinkedIn scraping is against their ToS
    // This is a placeholder that uses AI to help parse LinkedIn URLs
    // In production, you'd use LinkedIn's official API or ask users to copy-paste their profile
    
    const prompt = `I have a LinkedIn URL: ${linkedinUrl}
    
Since we can't actually scrape LinkedIn, please return a helpful JSON template that the user should fill in manually.
Return ONLY this JSON structure:

{
  "message": "LinkedIn scraping is not available. Please copy your information from LinkedIn and paste it into the fields.",
  "firstName": "",
  "lastName": "",
  "email": "",
  "location": "",
  "summary": "",
  "experiences": [],
  "education": [],
  "skills": []
}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      res.json(data);
    } else {
      res.json({
        message: "Please manually copy your information from LinkedIn. LinkedIn doesn't allow automated data extraction.",
        firstName: "",
        lastName: "",
        email: "",
        location: "",
        summary: "",
        experiences: [],
        education: [],
        skills: []
      });
    }
    
  } catch (error) {
    console.error('LinkedIn import error:', error);
    res.status(500).json({ 
      error: 'LinkedIn import failed. Please enter your information manually.',
      message: "For best results, copy and paste your LinkedIn information into the form fields."
    });
  }
});

// ========== RESUME MANAGEMENT ENDPOINTS ==========

// Save resume version
app.post('/api/resumes/save', async (req, res) => {
  try {
    const { resumeData, title } = req.body;
    const userId = 'guest'; // For now, all users are guest
    
    const resumeId = `resume_${Date.now()}`;
    const resumeRecord = {
      id: resumeId,
      userId,
      title: title || 'Untitled Resume',
      data: resumeData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    resumes.set(resumeId, resumeRecord);
    
    // Add to user's resume list
    const user = Array.from(users.values()).find(u => u.id === userId);
    if (user) {
      user.resumes.push(resumeId);
    }
    
    res.json({ 
      success: true, 
      resumeId,
      timestamp: resumeRecord.createdAt
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

// Get all user's resumes
app.get('/api/resumes', async (req, res) => {
  try {
    const userId = 'guest';
    
    const userResumes = Array.from(resumes.values())
      .filter(resume => resume.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    
    res.json({ resumes: userResumes });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// Get specific resume
app.get('/api/resumes/:resumeId', async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = 'guest';
    
    const resume = resumes.get(resumeId);
    
    if (!resume || resume.userId !== userId) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    res.json({ resume });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// Update resume
app.put('/api/resumes/:resumeId', async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { resumeData, title } = req.body;
    const userId = 'guest';
    
    const resume = resumes.get(resumeId);
    
    if (!resume || resume.userId !== userId) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    resume.data = resumeData;
    resume.title = title || resume.title;
    resume.updatedAt = new Date();
    
    res.json({ 
      success: true, 
      resume 
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

// Delete resume
app.delete('/api/resumes/:resumeId', async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = 'guest';
    
    const resume = resumes.get(resumeId);
    
    if (!resume || resume.userId !== userId) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    resumes.delete(resumeId);
    
    // Remove from user's list
    const user = Array.from(users.values()).find(u => u.id === userId);
    if (user) {
      user.resumes = user.resumes.filter(id => id !== resumeId);
    }
    
    res.json({ success: true });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// ========== HELPER FUNCTIONS ==========

function buildResumePrompt(userInput, style, additionalContext) {
  const styleInstructions = {
    detailed: 'Create a comprehensive, detailed resume with extensive descriptions.',
    balanced: 'Create a balanced resume with moderate detail and clear sections.',
    concise: 'Create a concise, one-page resume focusing on key highlights.'
  };
  
  return `You are a professional resume writer. Parse the following information and create a well-structured resume in JSON format.

Style preference: ${styleInstructions[style] || styleInstructions.balanced}

User's information:
${userInput}

${additionalContext ? `Additional context: ${additionalContext}` : ''}

Return ONLY a JSON object with this exact structure:
{
  "name": "Full Name",
  "contact": "email@example.com | (555) 123-4567 | City, State",
  "summary": "Professional summary paragraph",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "period": "Start Date - End Date",
      "highlights": ["Achievement 1", "Achievement 2", "Achievement 3"]
    }
  ],
  "education": "Degree, Institution, Year",
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "references": "Available upon request"
}

Make the resume professional, well-organized, and optimized for applicant tracking systems (ATS).`;
}

function parseAiResponse(text) {
  try {
    // Extract JSON from AI's response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in response');
  } catch (error) {
    console.error('Error parsing AI response:', error);
    // Return default structure if parsing fails
    return {
      name: 'Error parsing resume',
      contact: '',
      summary: '',
      experience: [],
      education: '',
      skills: []
    };
  }
}

// ========== SERVER START ==========

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Resume Builder API running on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /api/auth/register - Register new user');
  console.log('  POST /api/auth/login - Login user');
  console.log('  POST /api/ai/generate-resume - Generate resume with AI');
  console.log('  POST /api/ai/suggestions - Get real-time suggestions');
  console.log('  POST /api/ai/analyze-missing - Analyze missing info');
  console.log('  POST /api/resumes/save - Save resume version');
  console.log('  GET  /api/resumes - Get all user resumes');
  console.log('  GET  /api/resumes/:id - Get specific resume');
  console.log('  PUT  /api/resumes/:id - Update resume');
  console.log('  DELETE /api/resumes/:id - Delete resume');
});

module.exports = app;
